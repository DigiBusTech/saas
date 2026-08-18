import { NextResponse } from 'next/server';
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

    // Calculate total amount in NGN (kobo → naira for Flutterwave Standard)
    let totalNaira = planDef.price_ngn / 100;
    if (setupFee) {
      totalNaira += 350_000; // ₦350,000 setup fee
    }

    const txRef = `flw_${profile.tenant_id}_${planSlug}_${Date.now()}`;
    const origin = new URL(request.url).origin;

    // Return data for the Flutterwave inline/standard checkout to consume client-side
    return NextResponse.json({
      provider: 'flutterwave',
      config: {
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY!,
        tx_ref: txRef,
        amount: totalNaira,
        currency: 'NGN',
        payment_options: 'card,banktransfer,ussd',
        customer: {
          email: user.email,
          name: tenant?.name ?? user.email,
        },
        customizations: {
          title: 'SaaS AI Chat Platform',
          description: `${planDef.name} Plan${setupFee ? ' + Setup Package' : ''}`,
          logo: `${origin}/favicon.ico`,
        },
        meta: {
          tenant_id: profile.tenant_id,
          plan: planSlug,
          has_setup_fee: setupFee ? 'true' : 'false',
        },
        redirect_url: `${origin}/dashboard?billing=success`,
      },
    });
  } catch (err) {
    console.error('Flutterwave checkout error:', err);
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 });
  }
}
