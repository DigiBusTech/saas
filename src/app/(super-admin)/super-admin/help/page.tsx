import { createServiceClient } from '@/lib/supabase/server';
import { HelpArticlesClient } from './help-client';

export const dynamic = 'force-dynamic';

export default async function HelpCenterPage() {
  const supabase = createServiceClient();
  
  const { data: articles } = await supabase
    .from('help_articles')
    .select('id, title, excerpt, slug, category, view_count')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  return (
    <div className="p-6">
      <HelpArticlesClient initialArticles={articles || []} />
    </div>
  );
}
