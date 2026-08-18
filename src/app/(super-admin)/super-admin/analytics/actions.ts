import { createServiceClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

export interface AnalyticsStats {
  tenants: number;
  activeTenants: number;
  workspaces: number;
  conversations: number;
  messages24h: number;
  mrrUsd: number;
  planBreakdown: { plan: string; count: number }[];
}

/**
 * Platform-wide statistics for the Super Admin analytics dashboard.
 * NOTE: Supabase count queries (`head: true`) return zero rows by design —
 * never chain `.single()` after them, it throws PGRST116 and silently zeroes stats.
 */
export async function getAnalyticsStats(): Promise<{ stats: AnalyticsStats; error: string | null }> {
  const empty: AnalyticsStats = {
    tenants: 0, activeTenants: 0, workspaces: 0, conversations: 0, messages24h: 0, mrrUsd: 0, planBreakdown: [],
  };

  const supabase = createServiceClient();
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: tenantCount },
      { count: activeTenantCount },
      { count: workspaceCount },
      { count: conversationCount },
      { count: messages24hCount },
      { data: tenantsWithPlans },
    ] = await Promise.all([
      supabase.from('tenants').select('id', { count: 'exact', head: true }),
      supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('workspaces').select('id', { count: 'exact', head: true }),
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
      supabase.from('tenants').select('plan_type, plan_id, status'),
    ]);

    // Estimate MRR from active tenants' linked subscription plan prices.
    const activePlanIds = (tenantsWithPlans ?? [])
      .filter((t) => t.status === 'active' && t.plan_id)
      .map((t) => t.plan_id as string);

    let mrrUsd = 0;
    if (activePlanIds.length > 0) {
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('id, price_usd')
        .in('id', Array.from(new Set(activePlanIds)));
      const priceById = new Map((plans ?? []).map((p) => [p.id, p.price_usd ?? 0]));
      mrrUsd = activePlanIds.reduce((sum, id) => sum + (priceById.get(id) ?? 0), 0);
    }

    const planCounts = new Map<string, number>();
    for (const t of tenantsWithPlans ?? []) {
      const key = t.plan_type ?? 'trial';
      planCounts.set(key, (planCounts.get(key) ?? 0) + 1);
    }

    const stats: AnalyticsStats = {
      tenants: tenantCount ?? 0,
      activeTenants: activeTenantCount ?? 0,
      workspaces: workspaceCount ?? 0,
      conversations: conversationCount ?? 0,
      messages24h: messages24hCount ?? 0,
      mrrUsd,
      planBreakdown: Array.from(planCounts.entries()).map(([plan, count]) => ({ plan, count })),
    };

    return { stats, error: null };
  } catch (err) {
    console.error('Analytics stats fetch error', err);
    return { stats: empty, error: 'Unable to fetch stats' };
  }
}

export async function refreshAnalytics() {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  revalidatePath('/super-admin/analytics');
  return { success: true };
}
