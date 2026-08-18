'use client';

import { useState, useTransition } from 'react';
import { createPlan, updatePlan, deletePlan } from './actions';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_usd: number;
  price_ngn: number;
  stripe_price_id: string | null;
  features: Record<string, boolean>;
  allow_telegram: boolean;
  allow_whatsapp: boolean;
  telegram_message_limit: number;
  whatsapp_message_limit: number;
  monthly_token_limit: number;
  max_workspaces: number;
  is_active: boolean;
  sort_order: number;
}

const DEFAULT_FEATURE_KEYS = ['ai_insights', 'priority_support', 'dedicated_account_manager'];

export default function PlansClient({ plans }: { plans: Plan[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [form, setForm] = useState({
    name: '', slug: '', price_usd: 0, price_ngn: 0, stripe_price_id: '',
    allow_telegram: true, allow_whatsapp: true,
    telegram_message_limit: 100, whatsapp_message_limit: 100,
    monthly_token_limit: 100000, max_workspaces: 1, is_active: true, sort_order: 0,
    features: {} as Record<string, boolean>,
  });

  function loadPlan(p: Plan) {
    setForm({
      name: p.name, slug: p.slug, price_usd: p.price_usd, price_ngn: p.price_ngn,
      stripe_price_id: p.stripe_price_id || '', allow_telegram: p.allow_telegram,
      allow_whatsapp: p.allow_whatsapp, telegram_message_limit: p.telegram_message_limit,
      whatsapp_message_limit: p.whatsapp_message_limit, monthly_token_limit: p.monthly_token_limit,
      max_workspaces: p.max_workspaces ?? 1, is_active: p.is_active, sort_order: p.sort_order,
      features: { ...p.features },
    });
  }

  function resetForm() {
    setForm({
      name: '', slug: '', price_usd: 0, price_ngn: 0, stripe_price_id: '',
      allow_telegram: true, allow_whatsapp: true,
      telegram_message_limit: 100, whatsapp_message_limit: 100,
      monthly_token_limit: 100000, max_workspaces: 1, is_active: true, sort_order: 0,
      features: { ai_insights: false, priority_support: false, dedicated_account_manager: false },
    });
  }

  function buildFormData(id?: string): FormData {
    const fd = new FormData();
    if (id) fd.set('id', id);
    fd.set('name', form.name);
    fd.set('slug', form.slug);
    fd.set('price_usd', String(form.price_usd));
    fd.set('price_ngn', String(form.price_ngn));
    fd.set('stripe_price_id', form.stripe_price_id);
    fd.set('allow_telegram', String(form.allow_telegram));
    fd.set('allow_whatsapp', String(form.allow_whatsapp));
    fd.set('telegram_message_limit', String(form.telegram_message_limit));
    fd.set('whatsapp_message_limit', String(form.whatsapp_message_limit));
    fd.set('monthly_token_limit', String(form.monthly_token_limit));
    fd.set('max_workspaces', String(form.max_workspaces));
    fd.set('is_active', String(form.is_active));
    fd.set('sort_order', String(form.sort_order));
    fd.set('features', JSON.stringify(form.features));
    return fd;
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createPlan(buildFormData());
      if (result.error) setFeedback({ type: 'error', msg: result.error });
      else { setFeedback({ type: 'success', msg: 'Plan created' }); setShowCreate(false); resetForm(); }
    });
  }

  function handleUpdate(id: string) {
    startTransition(async () => {
      const result = await updatePlan(buildFormData(id));
      if (result.error) setFeedback({ type: 'error', msg: result.error });
      else { setFeedback({ type: 'success', msg: 'Plan updated' }); setEditingId(null); }
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete plan "${name}"?`)) return;
    const fd = new FormData();
    fd.set('id', id);
    startTransition(async () => {
      const result = await deletePlan(fd);
      if (result.error) setFeedback({ type: 'error', msg: result.error });
      else setFeedback({ type: 'success', msg: `Plan "${name}" deleted` });
    });
  }

  function toggleFeature(key: string) {
    setForm((prev) => ({ ...prev, features: { ...prev.features, [key]: !prev.features[key] } }));
  }

  const renderForm = (isCreate: boolean, planId?: string) => (
    <div className="bg-[#0F1219] border border-gray-800 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-bold text-white">{isCreate ? 'Create New Plan' : 'Edit Plan'}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Plan Name</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none" />
        </div>
        {isCreate && (
          <div>
            <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Slug</label>
            <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="e.g. enterprise" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none" />
          </div>
        )}
        <div>
          <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Price USD (cents)</label>
          <input type="number" value={form.price_usd} onChange={(e) => setForm({ ...form, price_usd: +e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Price NGN (kobo)</label>
          <input type="number" value={form.price_ngn} onChange={(e) => setForm({ ...form, price_ngn: +e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Stripe Price ID</label>
          <input type="text" value={form.stripe_price_id} onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Sort Order</label>
          <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none" />
        </div>
      </div>

      {/* Channel Limits */}
      <div className="border-t border-gray-800 pt-4">
        <p className="text-[9px] text-gray-500 uppercase font-bold mb-3">Channel Limits</p>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.allow_telegram} onChange={(e) => setForm({ ...form, allow_telegram: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-900 text-indigo-600" />
            <span className="text-xs text-gray-300">Allow Telegram</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.allow_whatsapp} onChange={(e) => setForm({ ...form, allow_whatsapp: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-900 text-indigo-600" />
            <span className="text-xs text-gray-300">Allow WhatsApp</span>
          </label>
          <div>
            <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Telegram Msg Limit</label>
            <input type="number" value={form.telegram_message_limit} onChange={(e) => setForm({ ...form, telegram_message_limit: +e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">WhatsApp Msg Limit</label>
            <input type="number" value={form.whatsapp_message_limit} onChange={(e) => setForm({ ...form, whatsapp_message_limit: +e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Monthly Token Limit</label>
            <input type="number" value={form.monthly_token_limit} onChange={(e) => setForm({ ...form, monthly_token_limit: +e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Max Workspaces</label>
            <input type="number" value={form.max_workspaces} min={1} onChange={(e) => setForm({ ...form, max_workspaces: +e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="border-t border-gray-800 pt-4">
        <p className="text-[9px] text-gray-500 uppercase font-bold mb-3">AI Features</p>
        <div className="flex flex-wrap gap-3">
          {DEFAULT_FEATURE_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.features[key]} onChange={() => toggleFeature(key)}
                className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-900 text-indigo-600" />
              <span className="text-xs text-gray-300">{key.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Active toggle (edit only) */}
      {!isCreate && (
        <div className="border-t border-gray-800 pt-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-900 text-indigo-600" />
            <span className="text-xs text-gray-300">Plan Active</span>
          </label>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button onClick={() => isCreate ? handleCreate() : handleUpdate(planId!)} disabled={isPending || !form.name}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded disabled:opacity-40 transition">
          {isPending ? 'Saving…' : isCreate ? 'Create Plan' : 'Save Changes'}
        </button>
        <button onClick={() => { isCreate ? setShowCreate(false) : setEditingId(null); resetForm(); }}
          className="px-4 py-2 text-gray-400 hover:text-white text-xs border border-gray-800 rounded transition">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {feedback && (
        <div className={`px-4 py-2 rounded text-xs font-medium border ${
          feedback.type === 'success' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' : 'bg-rose-950/40 text-rose-400 border-rose-900/30'
        }`}>{feedback.msg}</div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className={`bg-[#0F1219] border rounded-lg p-5 ${plan.is_active ? 'border-gray-800' : 'border-rose-900/30 opacity-60'}`}>
            {editingId === plan.id ? renderForm(false, plan.id) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                    <span className="px-1.5 py-0.5 bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 rounded text-[8px] font-bold font-mono">{plan.slug}</span>
                    {!plan.is_active && <span className="px-1.5 py-0.5 bg-rose-950/40 text-rose-400 border border-rose-900/30 rounded text-[8px] font-bold">INACTIVE</span>}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => { setEditingId(plan.id); loadPlan(plan); setFeedback(null); }}
                      className="px-2 py-1 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold border border-indigo-900/30 rounded transition">Edit</button>
                    <button onClick={() => handleDelete(plan.id, plan.name)}
                      className="px-2 py-1 text-rose-400 hover:text-rose-300 text-[10px] border border-rose-900/30 rounded transition">Delete</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
                  <div><span className="text-gray-500">USD:</span> <span className="text-white font-mono">${(plan.price_usd / 100).toFixed(0)}/mo</span></div>
                  <div><span className="text-gray-500">NGN:</span> <span className="text-white font-mono">₦{(plan.price_ngn / 100).toLocaleString()}/mo</span></div>
                  <div><span className="text-gray-500">Telegram:</span> <span className={plan.allow_telegram ? 'text-emerald-400' : 'text-rose-400'}>{plan.allow_telegram ? `✓ ${plan.telegram_message_limit.toLocaleString()} msgs` : '✕ disabled'}</span></div>
                  <div><span className="text-gray-500">WhatsApp:</span> <span className={plan.allow_whatsapp ? 'text-emerald-400' : 'text-rose-400'}>{plan.allow_whatsapp ? `✓ ${plan.whatsapp_message_limit.toLocaleString()} msgs` : '✕ disabled'}</span></div>
                  <div className="col-span-2"><span className="text-gray-500">Tokens:</span> <span className="text-white font-mono">{plan.monthly_token_limit.toLocaleString()}/mo</span></div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(plan.features || {}).map(([key, val]) => (
                    <span key={key} className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${val ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' : 'bg-gray-900 text-gray-600 border border-gray-800'}`}>
                      {key.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Create New Plan */}
      {showCreate ? renderForm(true) : (
        <button onClick={() => { setShowCreate(true); setEditingId(null); resetForm(); setFeedback(null); }}
          className="w-full py-3 border border-dashed border-gray-700 hover:border-indigo-500 rounded-lg text-xs text-gray-400 hover:text-indigo-400 transition">
          + Create New Plan
        </button>
      )}
    </div>
  );
}
