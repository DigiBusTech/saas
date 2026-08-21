import { createServiceClient } from '@/lib/supabase/server';
import { requireTenant } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { WorkspaceBillingClient } from './billing-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ workspace_id: string }>;
}

export default async function WorkspaceBillingPage({ params }: PageProps) {
  const { workspace_id } = await params;
  const guard = await requireTenant();
  if ('error' in guard) redirect('/login');

  const supabase = await createServiceClient();
  
  // Fetch workspace with subscription details
  const { data: workspace } = await supabase
    .from('workspaces')
    .select(`
      id,
      name,
      subscription_tier,
      trial_ends_at,
      is_trial_claimed,
      message_limit,
      messages_used,
      knowledge_doc_limit,
      knowledge_docs_used,
      crm_lead_limit,
      crm_leads_used,
      tenant_id
    `)
    .eq('id', workspace_id)
    .single();

  if (!workspace) {
    return <div className="p-8 text-red-400">Workspace not found</div>;
  }

  // Fetch tenant subscription plan
  const { data: tenant } = await supabase
    .from('tenants')
    .select('plan_id')
    .eq('id', workspace.tenant_id)
    .single();

  let currentPlan = null;
  if (tenant?.plan_id) {
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', tenant.plan_id)
      .single();
    currentPlan = plan;
  }

  // Fetch all available plans for upgrade options
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing & Usage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your AI message usage, trial status, and upgrade options for <strong>{workspace.name}</strong>.
        </p>
      </div>

      <WorkspaceBillingClient 
        workspace={workspace} 
        currentPlan={currentPlan}
        availablePlans={plans || []}
      />
    </div>
  );
}
