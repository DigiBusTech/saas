import { createServiceClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PHASE 5: Demo Tenant Seeding API
 * 
 * Creates a fully populated test workspace to verify the new 4-tier subscription system.
 * Query params:
 * - tier: free_trial | pro | business | enterprise
 * - expired: true | false (for testing trial expiration)
 * 
 * Example: POST /api/admin/seed-demo-tenant?tier=free_trial&expired=true
 */

export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const searchParams = req.nextUrl.searchParams;
  const tier = (searchParams.get('tier') || 'free_trial') as 'free_trial' | 'pro' | 'business' | 'enterprise';
  const expired = searchParams.get('expired') === 'true';

  const db = createServiceClient();

  try {
    // 1. Create demo tenant
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .insert({
        name: `Demo ${tier.toUpperCase()} Tenant ${Date.now()}`,
        status: 'active',
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Failed to create tenant', details: tenantError }, { status: 500 });
    }

    // 2. Get tier limits from subscription_plans
    const { data: plan } = await db
      .from('subscription_plans')
      .select('ai_message_cap, knowledge_doc_cap, crm_lead_cap')
      .eq('slug', tier)
      .single();

    const tierLimits = {
      message_limit: plan?.ai_message_cap || 200,
      knowledge_doc_limit: plan?.knowledge_doc_cap || 10,
      crm_lead_limit: plan?.crm_lead_cap || 50,
    };

    // 3. Create demo workspace with appropriate trial settings
    const now = new Date();
    const trialEndsAt = expired 
      ? new Date(now.getTime() - 24 * 60 * 60 * 1000) // Yesterday (expired)
      : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

    const { data: workspace, error: workspaceError } = await db
      .from('workspaces')
      .insert({
        tenant_id: tenant.id,
        name: `Demo ${tier} Workspace`,
        slug: `demo-${tier}-${Date.now()}`,
        subscription_tier: tier,
        trial_ends_at: tier === 'free_trial' ? trialEndsAt.toISOString() : null,
        is_trial_claimed: tier === 'free_trial',
        message_limit: tierLimits.message_limit,
        messages_used: expired ? tierLimits.message_limit : Math.floor(tierLimits.message_limit * 0.7), // 70% usage
        knowledge_doc_limit: tierLimits.knowledge_doc_limit,
        knowledge_docs_used: Math.floor(tierLimits.knowledge_doc_limit * 0.3), // 30% usage
        crm_lead_limit: tierLimits.crm_lead_limit,
        crm_leads_used: Math.floor(tierLimits.crm_lead_limit * 0.5), // 50% usage
      })
      .select()
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Failed to create workspace', details: workspaceError }, { status: 500 });
    }

    // 4. Seed demo knowledge base documents
    const knowledgeDocs = [
      { title: 'Product Catalog 2026', content: 'Our flagship products include: AI-powered customer service bots, multi-channel messaging integration (WhatsApp, Telegram), CRM with lead scoring, and automated marketing campaigns. Prices range from $49/mo to custom enterprise packages.' },
      { title: 'Shipping Policy', content: 'We offer free shipping on all orders over $100 within Nigeria. Standard shipping takes 3-5 business days. Express shipping is available for an additional $15 fee and delivers within 1-2 business days.' },
      { title: 'Return Policy', content: 'We accept returns within 30 days of purchase. Items must be unused and in original packaging. Refunds are processed within 7-10 business days. Contact support@sabibio.link to initiate a return.' },
      { title: 'FAQ: How to Connect WhatsApp', content: 'To connect your WhatsApp Business account: 1) Go to Integrations tab, 2) Click "Connect WhatsApp", 3) Enter your Phone Number ID and Access Token from Meta Business Suite, 4) Verify webhook, 5) Test with a message.' },
      { title: 'Troubleshooting: Bot Not Responding', content: 'If your bot is not responding: 1) Check if bot is active in Settings, 2) Verify API credentials are correct, 3) Check if you have exceeded your message limit (see Billing tab), 4) Review logs in Observability for errors.' },
    ];

    const knowledgeInserts = knowledgeDocs.slice(0, Math.min(knowledgeDocs.length, tierLimits.knowledge_doc_limit)).map(doc => ({
      tenant_id: tenant.id,
      workspace_id: workspace.id,
      title: doc.title,
      content: doc.content,
    }));

    await db.from('knowledge_bases').insert(knowledgeInserts);

    // 5. Seed demo products
    const products = [
      { name: 'Premium Widget', description: 'High-quality widget with lifetime warranty', price: 49.99, currency: 'USD', payment_link: 'https://buy.stripe.com/test_xxx' },
      { name: 'Deluxe Package', description: 'Complete bundle with installation', price: 149.99, currency: 'USD', payment_link: 'https://buy.stripe.com/test_yyy' },
      { name: 'Enterprise Solution', description: 'Custom-tailored for large businesses', price: 999.99, currency: 'USD', payment_link: 'https://buy.stripe.com/test_zzz' },
    ];

    await db.from('workspace_products').insert(
      products.map(p => ({ ...p, workspace_id: workspace.id }))
    );

    // 6. Seed demo CRM leads
    const leads = [
      { customer_name: 'John Doe', platform: 'whatsapp', platform_user_id: '2347011111111', lead_score: 75, tags: ['Hot Lead', 'High Ticket'], subscription_status: 'subscriber' },
      { customer_name: 'Jane Smith', platform: 'telegram', platform_user_id: 'tg_123456789', lead_score: 50, tags: ['New Lead'], subscription_status: 'lead' },
      { customer_name: 'Bob Johnson', platform: 'whatsapp', platform_user_id: '2347022222222', lead_score: 30, tags: ['Cold Lead'], subscription_status: 'non_subscriber' },
      { customer_name: 'Alice Williams', platform: 'telegram', platform_user_id: 'tg_987654321', lead_score: 90, tags: ['VIP', 'Returning Customer'], subscription_status: 'subscriber' },
      { customer_name: 'Charlie Brown', platform: 'whatsapp', platform_user_id: '2347033333333', lead_score: 60, tags: ['Inquiry'], subscription_status: 'lead' },
    ];

    await db.from('workspace_crm').insert(
      leads.slice(0, Math.min(leads.length, tierLimits.crm_lead_limit)).map(l => ({ ...l, workspace_id: workspace.id }))
    );

    // 7. Create synthetic chat history
    const { data: conversation } = await db
      .from('conversations')
      .insert({
        tenant_id: tenant.id,
        workspace_id: workspace.id,
        platform: 'whatsapp',
        platform_chat_id: '2347011111111',
        contact_name: 'John Doe',
        status: 'ai_active',
      })
      .select()
      .single();

    if (conversation) {
      await db.from('messages').insert([
        { conversation_id: conversation.id, sender_type: 'user', sender_name: 'John Doe', content: 'Hello! Do you have the premium widget in stock?' },
        { conversation_id: conversation.id, sender_type: 'bot', sender_name: 'AI Assistant', content: 'Yes! Our Premium Widget is available for $49.99 with a lifetime warranty. Would you like to place an order?' },
        { conversation_id: conversation.id, sender_type: 'user', sender_name: 'John Doe', content: 'Yes please! What are your shipping options?' },
        { conversation_id: conversation.id, sender_type: 'bot', sender_name: 'AI Assistant', content: 'We offer free shipping on orders over $100 within Nigeria. Standard shipping takes 3-5 business days. Since your order is under $100, standard shipping is $10. Would you like to proceed?' },
      ]);
    }

    return NextResponse.json({
      success: true,
      tenant_id: tenant.id,
      workspace_id: workspace.id,
      workspace_name: workspace.name,
      tier,
      expired,
      limits: tierLimits,
      trial_ends_at: workspace.trial_ends_at,
      usage: {
        messages: `${workspace.messages_used}/${workspace.message_limit}`,
        knowledge_docs: `${workspace.knowledge_docs_used}/${workspace.knowledge_doc_limit}`,
        crm_leads: `${workspace.crm_leads_used}/${workspace.crm_lead_limit}`,
      },
      message: `Demo ${tier} workspace created successfully. ${expired ? 'Trial is EXPIRED for testing.' : 'Trial is ACTIVE.'} Login with super admin and impersonate tenant to test.`,
    });
  } catch (error: any) {
    console.error('[seed-demo-tenant] Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

/**
 * GET endpoint to list all demo tenants
 */
export async function GET() {
  const guard = await requireSuperAdmin();
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const db = createServiceClient();

  try {
    const { data: demoTenants } = await db
      .from('tenants')
      .select(`
        id,
        name,
        created_at,
        workspaces (
          id,
          name,
          subscription_tier,
          trial_ends_at,
          messages_used,
          message_limit
        )
      `)
      .ilike('name', 'Demo%')
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({ demo_tenants: demoTenants || [] });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch demo tenants', details: error.message }, { status: 500 });
  }
}
