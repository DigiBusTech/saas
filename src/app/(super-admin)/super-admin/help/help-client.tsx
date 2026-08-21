'use client';

import { useState } from 'react';
import { Search, BookOpen, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface HelpArticle {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  category: string;
  view_count: number;
}

interface Props {
  initialArticles: HelpArticle[];
}

const CATEGORY_LABELS: Record<string, string> = {
  getting_started: 'Getting Started',
  integrations: 'Integrations',
  billing: 'Billing',
  crm: 'CRM',
  analytics: 'Analytics',
  troubleshooting: 'Troubleshooting',
  api: 'API',
  legal: 'Legal',
  sabibio: 'SabiBio',
  web_chat: 'Web Chat',
};

const CATEGORY_COLORS: Record<string, string> = {
  getting_started: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40',
  integrations: 'bg-indigo-950/40 text-indigo-400 border-indigo-900/40',
  billing: 'bg-amber-950/40 text-amber-400 border-amber-900/40',
  crm: 'bg-purple-950/40 text-purple-400 border-purple-900/40',
  analytics: 'bg-sky-950/40 text-sky-400 border-sky-900/40',
  troubleshooting: 'bg-rose-950/40 text-rose-400 border-rose-900/40',
  api: 'bg-gray-800/40 text-gray-400 border-gray-700/40',
  legal: 'bg-slate-800/40 text-slate-400 border-slate-700/40',
  sabibio: 'bg-fuchsia-950/40 text-fuchsia-400 border-fuchsia-900/40',
  web_chat: 'bg-cyan-950/40 text-cyan-400 border-cyan-900/40',
};

export function HelpArticlesClient({ initialArticles }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = initialArticles.filter((article) => {
    const matchesSearch =
      searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(initialArticles.map((a) => a.category)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-400" />
          Help Center & Documentation
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Browse guides, tutorials, and troubleshooting articles
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-md border transition ${
            selectedCategory === 'all'
              ? 'bg-indigo-950/50 text-indigo-300 border-indigo-800/50'
              : 'text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700'
          }`}
        >
          All Articles
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-md border transition ${
              selectedCategory === cat
                ? CATEGORY_COLORS[cat] || 'bg-gray-800 text-gray-300 border-gray-700'
                : 'text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No articles found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((article) => (
            <Link
              key={article.id}
              href={`/super-admin/help/${article.slug}`}
              className="group border border-gray-800 rounded-lg p-4 bg-gray-900/30 hover:bg-gray-900/50 hover:border-gray-700 transition"
            >
              <div className="flex items-start justify-between mb-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                    CATEGORY_COLORS[article.category] || 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}
                >
                  {CATEGORY_LABELS[article.category] || article.category}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-indigo-400 transition" />
              </div>
              
              <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-indigo-300 transition line-clamp-2">
                {article.title}
              </h3>
              
              {article.excerpt && (
                <p className="text-xs text-gray-500 line-clamp-3 mb-3">{article.excerpt}</p>
              )}
              
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <span>{article.view_count} views</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
