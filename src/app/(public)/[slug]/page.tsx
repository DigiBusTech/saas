import { createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SABIBIO_TEMPLATES } from '@/lib/sabibio/templates';
import { PublicSabiBioPage } from '@/components/sabibio/PublicSabiBioPage';

interface ContentBlock {
  type: 'text' | 'image' | 'cta';
  content?: string;
  src?: string;
  alt?: string;
  label?: string;
  href?: string;
}

interface PageParams {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const db = createServiceClient();
  const { data: workspace } = await db
    .from('workspaces')
    .select('name, sabibio_enabled, sabibio_branding')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (workspace && workspace.sabibio_enabled !== false) {
    const branding = (workspace.sabibio_branding ?? {}) as Record<string, string>;
    return { title: workspace.name, description: branding.bio || `${workspace.name} on SabiBio` };
  }

  const { data: page } = await db
    .from('pages')
    .select('title, meta_description')
    .eq('slug', slug)
    .eq('published_status', 'published')
    .single();

  if (!page) return { title: 'Page Not Found' };

  return {
    title: page.title,
    description: page.meta_description ?? undefined,
  };
}

function renderBlock(block: ContentBlock, index: number) {
  switch (block.type) {
    case 'text':
      return (
        <div key={index} className="prose dark:prose-invert max-w-none">
          {(block.content ?? '').split('\n').map((paragraph, pi) => (
            <p key={pi}>{paragraph}</p>
          ))}
        </div>
      );

    case 'image':
      return (
        <div key={index} className="my-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.src ?? ''}
            alt={block.alt ?? ''}
            className="rounded-lg max-w-full h-auto shadow-lg"
          />
          {block.alt && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center italic">
              {block.alt}
            </p>
          )}
        </div>
      );

    case 'cta':
      return (
        <div key={index} className="my-6 text-center">
          <a
            href={block.href ?? '#'}
            className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm transition shadow-lg shadow-indigo-600/30"
          >
            {block.label ?? 'Click Here'}
          </a>
        </div>
      );

    default:
      return null;
  }
}

export default async function PublicPage({ params }: PageParams) {
  const { slug } = await params;
  const db = createServiceClient();

  const { data: workspace } = await db
    .from('workspaces')
    .select('id, name, slug, logo_url, is_active, telegram_bot_token, whatsapp_phone_number_id, whatsapp_access_token, sabibio_enabled, sabibio_template_id, sabibio_branding, sabibio_links, sabibio_channels, sabibio_socials, sabibio_products, payment_options, workspace_products(*), workspace_services(*), workspace_articles(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (workspace && workspace.sabibio_enabled !== false) {
    const template = SABIBIO_TEMPLATES.find((item) => item.id === workspace.sabibio_template_id) ?? SABIBIO_TEMPLATES[0];
    return <PublicSabiBioPage workspace={workspace} template={template} />;
  }

  const { data: page, error } = await db
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .eq('published_status', 'published')
    .single();

  if (error || !page) {
    notFound();
  }

  const blocks: ContentBlock[] = page.content_blocks ?? [];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0E14]">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/" className="text-lg font-bold text-gray-900 dark:text-white">
            SabiBio
          </a>
          <nav className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
            <a href="/login" className="hover:text-gray-900 dark:hover:text-white transition">Login</a>
            <a href="/signup" className="hover:text-gray-900 dark:hover:text-white transition">Sign Up</a>
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          {page.title}
        </h1>

        <div className="space-y-6 text-gray-700 dark:text-gray-300">
          {blocks.length > 0 ? (
            blocks.map((block, i) => renderBlock(block, i))
          ) : (
            <p className="text-gray-500 dark:text-gray-500 italic">This page has no content yet.</p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 px-6 text-center text-xs text-gray-400 dark:text-gray-600">
        © {new Date().getFullYear()} SabiBio. All rights reserved.
      </footer>
    </div>
  );
}
