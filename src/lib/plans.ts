export type PlanKey = 'trial' | 'basic' | 'pro' | 'unlimited';

export interface PlanDefinition {
  label: string;
  monthlyMessageLimit: number;
  monthlyTokenLimit: number;
  priceUSD: number;        // monthly in cents
  priceNGN: number;        // monthly in kobo (Flutterwave)
  stripePriceId: string;   // Stripe recurring price ID — set after creating in Stripe Dashboard
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  trial: {
    label: 'Free Trial',
    monthlyMessageLimit: 100,
    monthlyTokenLimit: 100_000,
    priceUSD: 0,
    priceNGN: 0,
    stripePriceId: '',
  },
  basic: {
    label: 'Basic',
    monthlyMessageLimit: 500,
    monthlyTokenLimit: 500_000,
    priceUSD: 2900, // $29
    priceNGN: 25_000_00, // ₦25,000
    stripePriceId: 'price_basic_monthly', // replace with real Stripe price ID
  },
  pro: {
    label: 'Pro',
    monthlyMessageLimit: 2000,
    monthlyTokenLimit: 2_000_000,
    priceUSD: 7900, // $79
    priceNGN: 65_000_00, // ₦65,000
    stripePriceId: 'price_pro_monthly',
  },
  unlimited: {
    label: 'Unlimited',
    monthlyMessageLimit: 999_999,
    monthlyTokenLimit: 999_999_999,
    priceUSD: 19900, // $199
    priceNGN: 150_000_00, // ₦150,000
    stripePriceId: 'price_unlimited_monthly',
  },
};

/** Map plan key to its token/message limits for provisioning after payment */
export function getPlanLimits(plan: PlanKey) {
  const p = PLANS[plan];
  return {
    monthly_message_limit: p.monthlyMessageLimit,
    monthly_token_limit: p.monthlyTokenLimit,
  };
}
