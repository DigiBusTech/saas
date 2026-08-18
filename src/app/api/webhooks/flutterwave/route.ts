import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  // 1. Verify Flutterwave webhook signature
  const signature = request.headers.get('verif-hash');
  const expectedHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;

  if (!signature || signature !== expectedHash) {
    console.error('Flutterwave webhook: signature mismatch');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();

  // Only process successful charges
  if (payload.event !== 'charge.completed' || payload.data?.status !== 'successful') {
    return NextResponse.json({ received: true });
  }

  const data = payload.data;
  const meta = data.meta ?? {};
  const tenantId = meta.tenant_id;
  const planSlug = meta.plan ?? 'basic';
  const hasSetupFee = meta.has_setup_fee === 'true';

  if (!tenantId) {
    console.error('Flutterwave webhook: no tenant_id in meta');
    return NextResponse.json({ received: true });
  }

  // 2. Verify the transaction server-side with Flutterwave API
  const verifyRes = await fetch(
    `https://api.flutterwave.com/v3/transactions/${data.id}/verify`,
    {
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      },
    }
  );
  const verification = await verifyRes.json();

  if (verification.status !== 'success' || verification.data?.status !== 'successful') {
    console.error('Flutterwave verification failed for tx:', data.id);
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  // 3. Look up plan from the database
  const db = createServiceClient();

  const { data: plan } = await db
    .from('subscription_plans')
    .select('id, slug, monthly_token_limit, telegram_message_limit, whatsapp_message_limit')
    .eq('slug', planSlug)
    .single();

  const updatePayload: Record<string, any> = {
    plan_type: planSlug,
    status: 'active',
    billing_provider: 'flutterwave',
    flutterwave_customer_id: data.customer?.id?.toString() ?? null,
    currency: data.currency ?? 'NGN',
    setup_fee_paid: hasSetupFee,
    token_usage: 0,
    message_usage: 0,
    telegram_message_usage: 0,
    whatsapp_message_usage: 0,
    billing_cycle_start: new Date().toISOString(),
  };

  if (plan) {
    updatePayload.plan_id = plan.id;
    updatePayload.monthly_token_limit = plan.monthly_token_limit;
    updatePayload.monthly_message_limit = plan.telegram_message_limit + plan.whatsapp_message_limit;
  }

  await db.from('tenants').update(updatePayload).eq('id', tenantId);

  console.log(`Flutterwave: tenant ${tenantId} activated on ${planSlug} plan (tx: ${data.id})`);

  return NextResponse.json({ received: true });
}
