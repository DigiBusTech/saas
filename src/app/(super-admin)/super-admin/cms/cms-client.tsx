'use client';

import { useState, useTransition } from 'react';
import { createPage, updatePage, deletePage, createDoc, updateDoc, deleteDoc } from './actions';

interface ContentBlock {
  type: 'text' | 'image' | 'cta';
  content?: string;
  src?: string;
  alt?: string;
  label?: string;
  href?: string;
}

interface Page {
  id: string; slug: string; title: string; meta_description: string | null;
  published_status: string; content_blocks: ContentBlock[]; updated_at: string;
}

interface Doc {
  id: string; slug: string; title: string; category: string | null;
  content: string; sort_order: number; published_status: string; updated_at: string;
}

// ==================== PAGE BUILDER ====================

function BlockEditor({ blocks, onChange }: { blocks: ContentBlock[]; onChange: (b: ContentBlock[]) => void }) {
  function addBlock(type: ContentBlock['type']) {
    const newBlock: ContentBlock = type === 'text' ? { type: 'text', content: '' }
      : type === 'image' ? { type: 'image', src: '', alt: '' }
      : { type: 'cta', label: '', href: '' };
    onChange([...blocks, newBlock]);
  }

  function updateBlock(i: number, updates: Partial<ContentBlock>) {
    const updated = [...blocks];
    updated[i] = { ...updated[i], ...updates };
    onChange(updated);
  }

  function removeBlock(i: number) {
    onChange(blocks.filter((_, idx) => idx !== i));
  }

  function moveBlock(i: number, dir: -1 | 1) {
    if ((dir === -1 && i === 0) || (dir === 1 && i === blocks.length - 1)) return;
    const arr = [...blocks];
    [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
    onChange(arr);
  }

  return (
    <div className="space-y-3">
      <p className="text-[9px] text-gray-500 uppercase font-bold">Content Blocks</p>
      {blocks.map((block, i) => (
        <div key={i} className="bg-gray-900/50 border border-gray-800 rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 rounded text-[8px] font-bold uppercase">{block.type}</span>
            <div className="flex gap-1">
              <button onClick={() => moveBlock(i, -1)} className="text-gray-500 hover:text-white text-[10px] px-1">↑</button>
              <button onClick={() => moveBlock(i, 1)} className="text-gray-500 hover:text-white text-[10px] px-1">↓</button>
              <button onClick={() => removeBlock(i)} className="text-rose-400 hover:text-rose-300 text-[10px] px-1">✕</button>
            </div>
          </div>
          {block.type === 'text' && (
            <textarea value={block.content || ''} onChange={(e) => updateBlock(i, { content: e.target.value })} rows={3}
              placeholder="Enter text content (supports markdown)…"
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none" />
          )}
          {block.type === 'image' && (
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={block.src || ''} onChange={(e) => updateBlock(i, { src: e.target.value })} placeholder="Image URL"
                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none" />
              <input type="text" value={block.alt || ''} onChange={(e) => updateBlock(i, { alt: e.target.value })} placeholder="Alt text"
                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none" />
            </div>
          )}
          {block.type === 'cta' && (
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={block.label || ''} onChange={(e) => updateBlock(i, { label: e.target.value })} placeholder="Button label"
                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none" />
              <input type="text" value={block.href || ''} onChange={(e) => updateBlock(i, { href: e.target.value })} placeholder="Link URL"
                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none" />
            </div>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={() => addBlock('text')} className="px-3 py-1.5 text-[10px] text-gray-400 border border-dashed border-gray-700 hover:border-indigo-500 hover:text-indigo-400 rounded transition">+ Text Block</button>
        <button onClick={() => addBlock('image')} className="px-3 py-1.5 text-[10px] text-gray-400 border border-dashed border-gray-700 hover:border-indigo-500 hover:text-indigo-400 rounded transition">+ Image Block</button>
        <button onClick={() => addBlock('cta')} className="px-3 py-1.5 text-[10px] text-gray-400 border border-dashed border-gray-700 hover:border-indigo-500 hover:text-indigo-400 rounded transition">+ CTA Button</button>
      </div>
    </div>
  );
}

// ==================== MAIN CMS CLIENT ====================

export default function CmsClient({ pages, docs }: { pages: Page[]; docs: Doc[] }) {
  const [tab, setTab] = useState<'pages' | 'docs'>('pages');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Page form state
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [pageForm, setPageForm] = useState({ slug: '', title: '', meta_description: '', published_status: 'draft', content_blocks: [] as ContentBlock[] });

  // Doc form state
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [docForm, setDocForm] = useState({ slug: '', title: '', category: '', content: '', sort_order: 0, published_status: 'draft' });

  function resetPageForm() { setPageForm({ slug: '', title: '', meta_description: '', published_status: 'draft', content_blocks: [] }); }
  function resetDocForm() { setDocForm({ slug: '', title: '', category: '', content: '', sort_order: 0, published_status: 'draft' }); }

  function loadPage(p: Page) { setPageForm({ slug: p.slug, title: p.title, meta_description: p.meta_description || '', published_status: p.published_status, content_blocks: p.content_blocks || [] }); }
  function loadDoc(d: Doc) { setDocForm({ slug: d.slug, title: d.title, category: d.category || '', content: d.content, sort_order: d.sort_order, published_status: d.published_status }); }

  function buildPageFD(id?: string) {
    const fd = new FormData();
    if (id) fd.set('id', id);
    fd.set('slug', pageForm.slug);
    fd.set('title', pageForm.title);
    fd.set('meta_description', pageForm.meta_description);
    fd.set('published_status', pageForm.published_status);
    fd.set('content_blocks', JSON.stringify(pageForm.content_blocks));
    return fd;
  }

  function buildDocFD(id?: string) {
    const fd = new FormData();
    if (id) fd.set('id', id);
    fd.set('slug', docForm.slug);
    fd.set('title', docForm.title);
    fd.set('category', docForm.category);
    fd.set('content', docForm.content);
    fd.set('sort_order', String(docForm.sort_order));
    fd.set('published_status', docForm.published_status);
    return fd;
  }

  function handlePageAction(action: (fd: FormData) => Promise<{ error: string | null }>, fd: FormData, successMsg: string) {
    startTransition(async () => {
      const r = await action(fd);
      if (r.error) setFeedback({ type: 'error', msg: r.error });
      else { setFeedback({ type: 'success', msg: successMsg }); setEditingPageId(null); setShowCreatePage(false); resetPageForm(); }
    });
  }

  function handleDocAction(action: (fd: FormData) => Promise<{ error: string | null }>, fd: FormData, successMsg: string) {
    startTransition(async () => {
      const r = await action(fd);
      if (r.error) setFeedback({ type: 'error', msg: r.error });
      else { setFeedback({ type: 'success', msg: successMsg }); setEditingDocId(null); setShowCreateDoc(false); resetDocForm(); }
    });
  }

  const pageFormUI = (isCreate: boolean, pageId?: string) => (
    <div className="bg-[#0F1219] border border-gray-800 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-bold text-white">{isCreate ? 'Create New Page' : 'Edit Page'}</h3>
      <div className="grid grid-cols-2 gap-4">
        {isCreate && (
          <div>
            <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Slug</label>
            <input type="text" value={pageForm.slug} onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })} placeholder="e.g. about-us"
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none" />
          </div>
        )}
        <div>
          <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Title</label>
          <input type="text" value={pageForm.title} onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none" />
        </div>
        <div className={isCreate ? '' : 'col-span-2'}>
          <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Meta Description</label>
          <input type="text" value={pageForm.meta_description} onChange={(e) => setPageForm({ ...pageForm, meta_description: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Status</label>
          <select value={pageForm.published_status} onChange={(e) => setPageForm({ ...pageForm, published_status: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>
      <BlockEditor blocks={pageForm.content_blocks} onChange={(blocks) => setPageForm({ ...pageForm, content_blocks: blocks })} />
      <div className="flex gap-2">
        <button onClick={() => handlePageAction(isCreate ? createPage : updatePage, buildPageFD(pageId), isCreate ? 'Page created' : 'Page updated')} disabled={isPending || !pageForm.title}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded disabled:opacity-40 transition">{isPending ? 'Saving…' : 'Save'}</button>
        <button onClick={() => { isCreate ? setShowCreatePage(false) : setEditingPageId(null); resetPageForm(); }}
          className="px-4 py-2 text-gray-400 hover:text-white text-xs border border-gray-800 rounded transition">Cancel</button>
      </div>
    </div>
  );

  const docFormUI = (isCreate: boolean, docId?: string) => (
    <div className="bg-[#0F1219] border border-gray-800 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-bold text-white">{isCreate ? 'Create New Doc' : 'Edit Doc'}</h3>
      <div className="grid grid-cols-2 gap-4">
        {isCreate && (
          <div>
            <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Slug</label>
            <input type="text" value={docForm.slug} onChange={(e) => setDocForm({ ...docForm, slug: e.target.value })} placeholder="e.g. getting-started"
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none" />
          </div>
        )}
        <div>
          <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Title</label>
          <input type="text" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Category</label>
          <input type="text" value={docForm.category} onChange={(e) => setDocForm({ ...docForm, category: e.target.value })} placeholder="e.g. Setup"
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Sort Order</label>
          <input type="number" value={docForm.sort_order} onChange={(e) => setDocForm({ ...docForm, sort_order: +e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Status</label>
          <select value={docForm.published_status} onChange={(e) => setDocForm({ ...docForm, published_status: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Content</label>
        <textarea value={docForm.content} onChange={(e) => setDocForm({ ...docForm, content: e.target.value })} rows={10}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => handleDocAction(isCreate ? createDoc : updateDoc, buildDocFD(docId), isCreate ? 'Doc created' : 'Doc updated')} disabled={isPending || !docForm.title}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded disabled:opacity-40 transition">{isPending ? 'Saving…' : 'Save'}</button>
        <button onClick={() => { isCreate ? setShowCreateDoc(false) : setEditingDocId(null); resetDocForm(); }}
          className="px-4 py-2 text-gray-400 hover:text-white text-xs border border-gray-800 rounded transition">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {feedback && (
        <div className={`px-4 py-2 rounded text-xs font-medium border ${feedback.type === 'success' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' : 'bg-rose-950/40 text-rose-400 border-rose-900/30'}`}>{feedback.msg}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('pages')} className={`px-4 py-2 rounded text-xs font-semibold transition ${tab === 'pages' ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-400 border border-gray-800'}`}>Pages ({pages.length})</button>
        <button onClick={() => setTab('docs')} className={`px-4 py-2 rounded text-xs font-semibold transition ${tab === 'docs' ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-400 border border-gray-800'}`}>Docs ({docs.length})</button>
      </div>

      {/* PAGES TAB */}
      {tab === 'pages' && (
        <div className="space-y-3">
          {pages.map((page) => (
            <div key={page.id} className="bg-[#0F1219] border border-gray-800 rounded-lg overflow-hidden">
              {editingPageId === page.id ? pageFormUI(false, page.id) : (
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${page.published_status === 'published' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
                      {page.published_status}
                    </span>
                    <span className="text-xs text-white font-medium">{page.title}</span>
                    <span className="text-[9px] text-gray-500 font-mono">/{page.slug}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => { setEditingPageId(page.id); loadPage(page); setFeedback(null); }}
                      className="px-2 py-1 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold border border-indigo-900/30 rounded transition">Edit</button>
                    <button onClick={() => { if (confirm(`Delete "${page.title}"?`)) { const fd = new FormData(); fd.set('id', page.id); handlePageAction(deletePage, fd, 'Page deleted'); } }}
                      className="px-2 py-1 text-rose-400 hover:text-rose-300 text-[10px] border border-rose-900/30 rounded transition">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {showCreatePage ? pageFormUI(true) : (
            <button onClick={() => { setShowCreatePage(true); setEditingPageId(null); resetPageForm(); setFeedback(null); }}
              className="w-full py-3 border border-dashed border-gray-700 hover:border-indigo-500 rounded-lg text-xs text-gray-400 hover:text-indigo-400 transition">+ Create New Page</button>
          )}
        </div>
      )}

      {/* DOCS TAB */}
      {tab === 'docs' && (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="bg-[#0F1219] border border-gray-800 rounded-lg overflow-hidden">
              {editingDocId === doc.id ? docFormUI(false, doc.id) : (
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${doc.published_status === 'published' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
                      {doc.published_status}
                    </span>
                    <span className="text-xs text-white font-medium">{doc.title}</span>
                    {doc.category && <span className="text-[8px] text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 border border-indigo-900/30 rounded font-bold">{doc.category}</span>}
                    <span className="text-[9px] text-gray-500 font-mono">/{doc.slug}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => { setEditingDocId(doc.id); loadDoc(doc); setFeedback(null); }}
                      className="px-2 py-1 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold border border-indigo-900/30 rounded transition">Edit</button>
                    <button onClick={() => { if (confirm(`Delete "${doc.title}"?`)) { const fd = new FormData(); fd.set('id', doc.id); handleDocAction(deleteDoc, fd, 'Doc deleted'); } }}
                      className="px-2 py-1 text-rose-400 hover:text-rose-300 text-[10px] border border-rose-900/30 rounded transition">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {showCreateDoc ? docFormUI(true) : (
            <button onClick={() => { setShowCreateDoc(true); setEditingDocId(null); resetDocForm(); setFeedback(null); }}
              className="w-full py-3 border border-dashed border-gray-700 hover:border-indigo-500 rounded-lg text-xs text-gray-400 hover:text-indigo-400 transition">+ Create New Doc</button>
          )}
        </div>
      )}
    </div>
  );
}
