import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { MarketingNav, MarketingFooter } from '../marketing-nav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Documentation | SabiBio' };

export default async function DocsIndexPage() {
  const db = createServiceClient();
  const { data } = await db
    .from('docs')
    .select('slug, title, category, sort_order')
    .eq('published_status', 'published')
    .order('sort_order');

  const docs = data ?? [];
  const byCategory = new Map<string, typeof docs>();
  for (const doc of docs) {
    const key = doc.category || 'General';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(doc);
  }

  return (
    <main className="min-h-screen bg-[#081018] text-slate-100">
      <MarketingNav />

      <section className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Documentation</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Everything you need to set up SabiBio.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
          Step-by-step guides for connecting Telegram and WhatsApp, training your knowledge base, and managing your workspace.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24 lg:px-8">
        {docs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0b1620] p-8 text-center text-sm text-slate-500">
            Documentation is being written. Check back soon, or{' '}
            <Link href="/contact" className="text-cyan-300 hover:text-cyan-200">contact us</Link> with questions.
          </div>
        ) : (
          <div className="space-y-10">
            {Array.from(byCategory.entries()).map(([category, items]) => (
              <div key={category}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{category}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {items.map((doc) => (
                    <Link
                      key={doc.slug}
                      href={`/docs/${doc.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0b1620] p-4 transition hover:border-cyan-300/40"
                    >
                      <BookOpen className="h-4 w-4 shrink-0 text-cyan-300" />
                      <span className="text-sm font-medium text-white">{doc.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <MarketingFooter />
    </main>
  );
}
