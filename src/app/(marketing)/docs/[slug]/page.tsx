import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import { MarketingNav, MarketingFooter } from '../../marketing-nav';

export const dynamic = 'force-dynamic';

interface PageParams {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const db = createServiceClient();
  const { data: doc } = await db.from('docs').select('title').eq('slug', slug).single();
  return { title: doc ? `${doc.title} | Documentation` : 'Documentation | rgistplus' };
}

export default async function DocPage({ params }: PageParams) {
  const { slug } = await params;
  const db = createServiceClient();
  const { data: doc } = await db
    .from('docs')
    .select('title, content, category')
    .eq('slug', slug)
    .eq('published_status', 'published')
    .single();

  if (!doc) notFound();

  return (
    <main className="min-h-screen bg-[#081018] text-slate-100">
      <MarketingNav />
      <article className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
        <Link href="/docs" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to documentation
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{doc.category || 'Guide'}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{doc.title}</h1>
        <div className="prose prose-invert prose-sm sm:prose-base mt-8 max-w-none leading-7 text-slate-300">
          {(doc.content ?? '').split('\n').map((paragraph: string, i: number) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </article>
      <MarketingFooter />
    </main>
  );
}
