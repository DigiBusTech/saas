import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Stripe signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenant_id;
      const planSlug = session.metadata?.plan ?? 'basic';
      const hasSetupFee = session.metadata?.has_setup_fee === 'true';

      if (!tenantId) {
        console.error('Stripe webhook: no tenant_id in metadata');
        break;
      }

      // Look up plan from the database
      const { data: plan } = await db
        .from('subscription_plans')
        .select('id, slug, monthly_token_limit, telegram_message_limit, whatsapp_message_limit')
        .eq('slug', planSlug)
        .single();

      const updatePayload: Record<string, any> = {
        plan_type: planSlug,
        status: 'active',
        billing_provider: 'stripe',
        stripe_subscription_id: session.subscription as string,
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

      console.log(`Stripe: tenant ${tenantId} activated on ${planSlug} plan`);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
      const subscriptionId = invoice.subscription as string;

      if (!subscriptionId) break;

      // Find tenant by subscription ID and reset monthly usage
      const { data: tenant } = await db
        .from('tenants')
        .select('id, plan_type, plan_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (tenant) {
        const updatePayload: Record<string, any> = {
          status: 'active',
          token_usage: 0,
          message_usage: 0,
          telegram_message_usage: 0,
          whatsapp_message_usage: 0,
          billing_cycle_start: new Date().toISOString(),
        };

        // Refresh limits from DB plan if linked
        if (tenant.plan_id) {
          const { data: plan } = await db
            .from('subscription_plans')
            .select('monthly_token_limit, telegram_message_limit, whatsapp_message_limit')
            .eq('id', tenant.plan_id)
            .single();

          if (plan) {
            updatePayload.monthly_token_limit = plan.monthly_token_limit;
            updatePayload.monthly_message_limit = plan.telegram_message_limit + plan.whatsapp_message_limit;
          }
        }

        await db.from('tenants').update(updatePayload).eq('id', tenant.id);

        console.log(`Stripe: invoice.paid — reset usage for tenant ${tenant.id}`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await db.from('tenants')
        .update({ status: 'expired' })
        .eq('stripe_subscription_id', subscription.id);

      console.log(`Stripe: subscription cancelled — ${subscription.id}`);
      break;
    }

    default:
      // Unhandled event type
      break;
  }

  return NextResponse.json({ received: true });
}
