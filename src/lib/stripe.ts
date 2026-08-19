import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY in Vercel Environment Variables.');
  stripeClient = new Stripe(secretKey, {
    apiVersion: '2026-06-24.dahlia',
    typescript: true,
  });
  return stripeClient;
}
