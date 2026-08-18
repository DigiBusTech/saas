import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const checkoutSchema = z.object({
  plan: z.string().min(1),
  setupFee: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { plan: planSlug, setupFee } = parsed.data;

    // Fetch plan from the database
    const { data: planDef, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', planSlug)
      .eq('is_active', true)
      .single();

    if (planError || !planDef) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 400 });
    }

    if (!planDef.stripe_price_id) {
      return NextResponse.json({ error: 'Plan has no Stripe price configured' }, { status: 400 });
    }

    // Get tenant
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id, name')
      .eq('id', profile.tenant_id)
      .single();

    // Create or reuse Stripe customer
    let customerId = tenant?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { tenant_id: profile.tenant_id, tenant_name: tenant?.name ?? '' },
      });
      customerId = customer.id;
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: customerId })
        .eq('id', profile.tenant_id);
    }

    // Build line items
    const lineItems: { price: string; quantity: number }[] = [
      { price: planDef.stripe_price_id, quantity: 1 },
    ];

    // If setupFee is requested, create a one-time price on the fly
    if (setupFee) {
      const setupPrice = await stripe.prices.create({
        unit_amount: 49900, // $499 one-time setup
        currency: 'usd',
        product_data: { name: 'Full Setup & Installation Package' },
      });
      lineItems.push({ price: setupPrice.id, quantity: 1 });
    }

    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: lineItems,
      metadata: {
        tenant_id: profile.tenant_id,
        plan: planSlug,
        has_setup_fee: setupFee ? 'true' : 'false',
      },
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/dashboard/billing?billing=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
