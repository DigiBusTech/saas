import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, MessageSquare, ShoppingCart, Eye, 
  Link as LinkIcon, Package, Library, Zap,
  TrendingUp, ArrowRight
} from 'lucide-react';

interface Params {
  workspace_id: string;
}

interface WorkspaceMetrics {
  total_leads: number;
  total_messages: number;
  total_orders: number;
  page_views_today: number;
  total_revenue?: number;
}

export default async function WorkspaceOverviewPage({ params }: { params: Promise<Params> }) {
  const { workspace_id } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get user's tenant_id first
  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) redirect('/dashboard/onboarding');

  // Fetch workspace (no plan relation here - plans are at tenant level)
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspace_id)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!workspace) redirect('/dashboard/onboarding');

  // Fetch tenant with subscription plan
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, subscription_plans(*)')
    .eq('id', profile.tenant_id)
    .single();

  const plan = tenant?.subscription_plans;

  const svc = createServiceClient();

  // PHASE 3: Use optimized RPC for metrics (single query instead of 6 parallel queries)
  const { data: metrics } = await svc.rpc('get_workspace_metrics', { 
    p_workspace_id: workspace_id 
  }).single() as { data: any };

  const totalLeads = Number(metrics?.total_leads || 0);
  const totalMessages = Number(metrics?.total_messages || 0);
  const totalOrders = Number(metrics?.total_orders || 0);
  const pageViewsToday = Number(metrics?.page_views_today || 0);

  // Fallback to old queries if RPC fails
  const [
    { count: productCount },
    { count: serviceCount },
    { count: knowledgeDocs }
  ] = await Promise.all([
    svc.from('workspace_products').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace_id),
    svc.from('workspace_services').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace_id),
    svc.from('workspace_knowledge').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace_id)
  ]);

  // Calculate AI usage based on total message limits
  const aiMessageLimit = (plan?.telegram_message_limit || 50) + (plan?.whatsapp_message_limit || 50);
  const aiUsagePercent = aiMessageLimit > 0 ? Math.min((totalMessages / aiMessageLimit) * 100, 100) : 0;

  // Determine greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-4xl font-bold mb-4">{greeting} 👋</h1>
      <p className="text-lg mb-8">Welcome to {workspace.name}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Leads */}
        <div className="bg-card border rounded-xl p-6">
          <Users className="w-8 h-8 text-blue-500 mb-4" />
          <h3 className="text-3xl font-bold mb-2">{totalLeads || 0}</h3>
          <p className="text-sm text-muted-foreground">Total Leads</p>
          <Link href={`/dashboard/${workspace_id}/crm`} className="text-primary text-sm mt-2 inline-block">
            View CRM →
          </Link>
        </div>

        {/* AI Messages */}
        <div className="bg-card border rounded-xl p-6">
          <MessageSquare className="w-8 h-8 text-purple-500 mb-4" />
          <h3 className="text-3xl font-bold mb-2">{totalMessages || 0}</h3>
          <p className="text-sm text-muted-foreground">AI Messages</p>
          <div className="mt-2 bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full"
              style={{ width: `${aiUsagePercent}%` }}
            />
          </div>
        </div>

        {/* Orders */}
        <div className="bg-card border rounded-xl p-6">
          <ShoppingCart className="w-8 h-8 text-emerald-500 mb-4" />
          <h3 className="text-3xl font-bold mb-2">{totalOrders || 0}</h3>
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <Link href={`/dashboard/${workspace_id}/orders`} className="text-primary text-sm mt-2 inline-block">
            View Orders →
          </Link>
        </div>

        {/* SabiBio */}
        <div className="bg-card border rounded-xl p-6">
          <Eye className="w-8 h-8 text-cyan-500 mb-4" />
          <h3 className="text-3xl font-bold mb-2">{workspace.sabibio_url ? 'Live' : 'Draft'}</h3>
          <p className="text-sm text-muted-foreground">SabiBio Status</p>
          <Link href={`/dashboard/${workspace_id}/sabibio`} className="text-primary text-sm mt-2 inline-block">
            Edit Page →
          </Link>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">⚡ Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href={`/dashboard/${workspace_id}/sabibio`} className="bg-card border rounded-lg p-5 hover:border-primary">
          <LinkIcon className="w-6 h-6 text-primary mb-2" />
          <h3 className="font-semibold mb-1">Edit SabiBio Page</h3>
          <p className="text-xs text-muted-foreground">Update your landing page</p>
        </Link>

        <Link href={`/dashboard/${workspace_id}/products`} className="bg-card border rounded-lg p-5 hover:border-primary">
          <Package className="w-6 h-6 text-primary mb-2" />
          <h3 className="font-semibold mb-1">Add Product/Service</h3>
          <p className="text-xs text-muted-foreground">{productCount || 0} products • {serviceCount || 0} services</p>
        </Link>

        <Link href={`/dashboard/${workspace_id}/knowledge`} className="bg-card border rounded-lg p-5 hover:border-primary">
          <Library className="w-6 h-6 text-primary mb-2" />
          <h3 className="font-semibold mb-1">Train Knowledge Base</h3>
          <p className="text-xs text-muted-foreground">{knowledgeDocs || 0} documents</p>
        </Link>

        <Link href="/dashboard/billing" className="bg-card border rounded-lg p-5 hover:border-primary">
          <Zap className="w-6 h-6 text-primary mb-2" />
          <h3 className="font-semibold mb-1">Upgrade Plan</h3>
          <p className="text-xs text-muted-foreground">{plan?.name || 'Current Plan'}</p>
        </Link>
      </div>
    </div>
  );
}
