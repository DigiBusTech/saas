import Link from 'next/link';
import { Check } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { MarketingNav, MarketingFooter } from '../marketing-nav';
import { PricingPageClient } from './pricing-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pricing | SabiBio' };

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  price_usd: number;
  price_monthly_usd: number | null;
  price_annual_usd: number | null;
  price_monthly_ngn: number | null;
  price_annual_ngn: number | null;
  annual_discount_percentage: number | null;
  telegram_message_limit: number;
  whatsapp_message_limit: number;
  monthly_token_limit: number;
  max_workspaces: number;
  allow_telegram: boolean;
  allow_whatsapp: boolean;
  ai_message_cap: number | null;
  knowledge_doc_cap: number | null;
  crm_lead_cap: number | null;
  has_telegram: boolean | null;
  has_whatsapp: boolean | null;
  is_enterprise_contact_sales: boolean | null;
  features: Record<string, boolean> | null;
  sort_order: number;
}

export default async function PricingPage() {
  const db = createServiceClient();
  const { data } = await db
    .from('subscription_plans')
    .select('id, name, slug, price_usd, price_monthly_usd, price_annual_usd, price_monthly_ngn, price_annual_ngn, annual_discount_percentage, telegram_message_limit, whatsapp_message_limit, monthly_token_limit, max_workspaces, allow_telegram, allow_whatsapp, ai_message_cap, knowledge_doc_cap, crm_lead_cap, has_telegram, has_whatsapp, is_enterprise_contact_sales, features, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  const plans = (data ?? []) as PlanRow[];

  return (
    <main className="min-h-screen bg-[#081018] text-slate-100">
      <MarketingNav />
      <PricingPageClient plans={plans} />
      <MarketingFooter />
    </main>
  );
}
