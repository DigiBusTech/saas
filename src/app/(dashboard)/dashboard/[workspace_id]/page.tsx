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

export default async function WorkspaceOverviewPage({ params }: { params: Promise<Params> }) {
  const { workspace_id } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const svc = createServiceClient();
  
  // Fetch workspace details
  const { data: workspace } = await svc
    .from('workspaces')
    .select('*, subscription_plans(*)')
    .eq('id', workspace_id)
    .single();

  if (!workspace) redirect('/dashboard');

  // Fetch metrics in parallel
  const [
    { count: totalLeads },
    { count: totalMessages },
    { count: totalOrders },
    { count: productCount },
    { count: serviceCount },
    { count: knowledgeDocs }
  ] = await Promise.all([
    svc.from('workspace_crm').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace_id),
    svc.from('chat_messages').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace_id).eq('is_ai', true),
    svc.from('workspace_orders').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace_id),
    svc.from('workspace_products').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace_id),
    svc.from('workspace_services').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace_id),
    svc.from('workspace_knowledge').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace_id)
  ]);

  const plan = workspace.subscription_plans;
  const aiMessageLimit = plan?.ai_message_cap || 200;
  const aiUsagePercent = Math.min(((totalMessages || 0) / aiMessageLimit) * 100, 100);

  // Determine greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="min-h-screen bg-background">
      {/* Welcome Header */}
      <div className="border-b border-border bg-linear-to-r from-primary/5 via-background to-accent/5 px-4 md:px-8 py-6 md:py-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">
            {greeting} 👋
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Here&apos;s what&apos;s happening with <span className="font-semibold text-foreground">{workspace.name}</span> today
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8">
        {/* Top-Level Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Total Leads */}
          <div className="bg-card border border-border rounded-xl p-4 md:p-6 hover:border-primary/40 transition-colors group">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
              </div>
              <TrendingUp className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{totalLeads || 0}</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Total Leads in CRM</p>
            <Link 
              href={`/dashboard/${workspace_id}/crm`}
              className="mt-3 text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all leads <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* AI Messages Used */}
          <div className="bg-card border border-border rounded-xl p-4 md:p-6 hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />
              </div>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{totalMessages || 0}</h3>
            <p className="text-xs md:text-sm text-muted-foreground mb-2">
              AI Messages Used / {aiMessageLimit.toLocaleString()}
            </p>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  aiUsagePercent > 90 ? 'bg-destructive' : aiUsagePercent > 70 ? 'bg-yellow-500' : 'bg-primary'
                }`}
                style={{ width: `${aiUsagePercent}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{aiUsagePercent.toFixed(0)}% of limit</p>
          </div>

          {/* Total Orders */}
          <div className="bg-card border border-border rounded-xl p-4 md:p-6 hover:border-primary/40 transition-colors group">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{totalOrders || 0}</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Total Orders</p>
            <Link 
              href={`/dashboard/${workspace_id}/orders`}
              className="mt-3 text-xs text-primary hover:underline flex items-center gap-1"
            >
              Manage orders <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* SabiBio Page */}
          <div className="bg-card border border-border rounded-xl p-4 md:p-6 hover:border-primary/40 transition-colors group">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Eye className="w-5 h-5 md:w-6 md:h-6 text-cyan-500" />
              </div>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
              {workspace.sabibio_url ? 'Live' : 'Draft'}
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground">SabiBio Page Status</p>
            <Link 
              href={`/dashboard/${workspace_id}/sabibio`}
              className="mt-3 text-xs text-primary hover:underline flex items-center gap-1"
            >
              Edit page <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4 px-1">
            ⚡ Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Link
              href={`/dashboard/${workspace_id}/sabibio`}
              className="bg-card border border-border rounded-lg p-4 md:p-5 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition">
                  <LinkIcon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm md:text-base text-foreground">Edit SabiBio Page</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Update your link-in-bio landing page
              </p>
            </Link>

            <Link
              href={`/dashboard/${workspace_id}/products`}
              className="bg-card border border-border rounded-lg p-4 md:p-5 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition">
                  <Package className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm md:text-base text-foreground">Add Product/Service</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Create new products or service offerings
              </p>
              <div className="mt-2 text-[10px] text-muted-foreground">
                {productCount || 0} products • {serviceCount || 0} services
              </div>
            </Link>

            <Link
              href={`/dashboard/${workspace_id}/knowledge`}
              className="bg-card border border-border rounded-lg p-4 md:p-5 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition">
                  <Library className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm md:text-base text-foreground">Train Knowledge Base</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload documents for AI grounding
              </p>
              <div className="mt-2 text-[10px] text-muted-foreground">
                {knowledgeDocs || 0} documents uploaded
              </div>
            </Link>

            <Link
              href="/dashboard/billing"
              className="bg-card border border-border rounded-lg p-4 md:p-5 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition">
                  <Zap className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm md:text-base text-foreground">Top-Up AI Limits</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Upgrade plan for more AI messages
              </p>
              <div className="mt-2">
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                  {plan?.name || 'Current Plan'}
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity Section (Optional - can add later) */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-foreground mb-4">
            📈 Getting Started
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                1
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-foreground">Set up your SabiBio page</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Create a beautiful landing page to showcase your products and services</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                2
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-foreground">Add products or services</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Build your catalog so customers can browse and purchase</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                3
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-foreground">Train your AI assistant</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Upload knowledge docs so your AI can answer customer questions accurately</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
