import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InAppPricingClient } from '@/components/billing/InAppPricingClient';

export const dynamic = 'force-dynamic';

export default async function DashboardBillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const svc = createServiceClient();

  // Get user's tenant and current plan
  const { data: profile } = await svc
    .from('users')
    .select('tenant_id, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) redirect('/dashboard');

  const { data: tenant } = await svc
    .from('tenants')
    .select('*, subscription_plans(*)')
    .eq('id', profile.tenant_id)
    .single();

  // Fetch all active plans
  const { data: plans } = await svc
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  return (
    <div className="min-h-screen bg-background">
      <InAppPricingClient 
        plans={plans ?? []} 
        currentPlanSlug={tenant?.subscription_plans?.slug}
        currentPlanId={tenant?.plan_id}
      />
    </div>
  );
}
