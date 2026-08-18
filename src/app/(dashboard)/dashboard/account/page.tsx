'use client';

import { useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { requestAccountDeletion } from './actions';

export default function AccountPage() {
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  async function submit() { if (confirm !== 'DELETE MY ACCOUNT') return; const result = await requestAccountDeletion(); if (result?.error) setError(result.error); }
  return <div className="max-w-2xl space-y-6"><div><h1 className="text-xl font-semibold text-white">Account & data</h1><p className="mt-1 text-xs text-gray-500">Manage your account lifecycle and data controls.</p></div><div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><ShieldCheck className="h-4 w-4" /> Data governance</div><p className="mt-2 text-xs leading-5 text-gray-400">Deletion removes your tenant from normal product access immediately. A restricted retention record may remain for fraud prevention, legal obligations, and legitimate government requests.</p></div><div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-rose-300"><AlertTriangle className="h-4 w-4" /> Delete account and data</div><p className="mt-2 text-xs leading-5 text-gray-400">This suspends the tenant and removes access to its workspaces, messages, products, knowledge base, and SabiBio pages. Type the phrase below to confirm.</p><input value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="DELETE MY ACCOUNT" className="field mt-4" /><button onClick={submit} disabled={confirm !== 'DELETE MY ACCOUNT'} className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Delete account</button>{error && <p className="mt-2 text-xs text-rose-300">{error}</p>}</div></div>;
}
