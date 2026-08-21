import { createServiceClient } from '@/lib/supabase/server';
import { MarketingClient } from './marketing-client';

export const dynamic = 'force-dynamic';

export default async function MarketingCMSPage() {
  const db = createServiceClient();
  
  const [{ data: reviews }, { data: partners }] = await Promise.all([
    db.from('platform_reviews').select('*').order('display_order'),
    db.from('trusted_partners').select('*').order('display_order'),
  ]);

  return (
    <div className="p-6">
      <MarketingClient 
        initialReviews={reviews || []} 
        initialPartners={partners || []} 
      />
    </div>
  );
}
