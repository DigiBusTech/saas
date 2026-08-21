import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const checkoutSchema = z.object({
  plan: z.string().min(1),
  setupFee: z.boolean().optional(),
  currency: z.enum(['USD', 'NGN']).default('USD'),
  interval: z.enum(['monthly', 'annual']).default('monthly'),
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

    const { plan: planSlug, setupFee, currency, interval } = parsed.data;

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
      .select('name')
      .eq('id', profile.tenant_id)
      .single();

    // PHASE 4: Calculate total amount based on currency AND billing interval
    let planPrice: number;
    if (currency === 'NGN') {
      // Use new monthly/annual fields, fallback to legacy price_ngn
      if (interval === 'annual') {
        planPrice = (planDef.price_annual_ngn ?? planDef.price_ngn * 10) / 100; // Convert kobo to naira
      } else {
        planPrice = (planDef.price_monthly_ngn ?? planDef.price_ngn) / 100; // Convert kobo to naira
      }
    } else {
      // USD - use monthly/annual fields, fallback to legacy price_usd
      if (interval === 'annual') {
        planPrice = (planDef.price_annual_usd ?? planDef.price_usd * 10) / 100; // Convert cents to dollars
      } else {
        planPrice = (planDef.price_monthly_usd ?? planDef.price_usd) / 100; // Convert cents to dollars
      }
    }

    let totalAmount = planPrice;
    if (setupFee) {
      totalAmount += currency === 'NGN' ? 350_000 : 499; // Add setup fee
    }

    const txRef = `flw_${profile.tenant_id}_${planSlug}_${interval}_${Date.now()}`;
    const origin = new URL(request.url).origin;

    // Return data for the Flutterwave inline/standard checkout to consume client-side
    return NextResponse.json({
      provider: 'flutterwave',
      config: {
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY!,
        tx_ref: txRef,
        amount: totalAmount,
        currency: currency,
        payment_options: currency === 'NGN' ? 'card,banktransfer,ussd' : 'card',
        customer: {
          email: user.email,
          name: tenant?.name ?? user.email,
        },
        customizations: {
          title: 'SaaS AI Chat Platform',
          description: `${planDef.name} Plan - ${interval === 'annual' ? 'Annual (Save 17%)' : 'Monthly'}${setupFee ? ' + Setup Package' : ''}`,
          logo: `${origin}/favicon.ico`,
        },
        meta: {
          tenant_id: profile.tenant_id,
          plan: planSlug,
          billing_interval: interval,
          has_setup_fee: setupFee ? 'true' : 'false',
          currency: currency,
        },
        redirect_url: `${origin}/dashboard?billing=success`,
      },
    });
  } catch (err) {
    console.error('Flutterwave checkout error:', err);
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 });
  }
}
