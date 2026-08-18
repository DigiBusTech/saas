'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Trash2, BriefcaseBusiness } from 'lucide-react';
import { createService, deleteService, getWorkspaceServices } from './actions';

export default function ServicesPage() {
  const params = useParams<{ workspace_id: string }>();
  const workspaceId = params.workspace_id;
  const [services, setServices] = useState<any[]>([]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  useEffect(() => { getWorkspaceServices(workspaceId).then((result) => setServices(result.data)); }, [workspaceId]);

  async function submit(formData: FormData) {
    const result = await createService(workspaceId, formData);
    if (result.error) setMessage(result.error);
    else { setMessage('Service added.'); (document.getElementById('service-form') as HTMLFormElement)?.reset(); const latest = await getWorkspaceServices(workspaceId); setServices(latest.data); }
  }

  function remove(id: string) { startTransition(async () => { const result = await deleteService(workspaceId, id); if (result.error) setMessage(result.error); else setServices((items) => items.filter((item) => item.id !== id)); }); }

  return <div className="max-w-5xl space-y-6"><div><div className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-cyan-400" /><h1 className="text-xl font-semibold text-white">Services</h1></div><p className="mt-1 text-xs text-gray-500">Add services with descriptions and pricing, then feature them on SabiBio.</p></div><form id="service-form" action={submit} className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-900/50 p-5 md:grid-cols-2"><input name="name" required placeholder="Service name" className="field" /><input name="price" type="number" min="0" step="0.01" placeholder="Price" className="field" /><input name="currency" defaultValue="USD" placeholder="Currency" className="field" /><input name="image_url" placeholder="Image URL" className="field" /><input name="payment_link" placeholder="Booking or payment link" className="field md:col-span-2" /><textarea name="description" placeholder="Describe what the client gets" rows={3} className="field resize-none md:col-span-2" /><button className="flex w-fit items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950"><Plus className="h-3.5 w-3.5" /> Add service</button>{message && <p className="text-xs text-cyan-300">{message}</p>}</form><div className="grid gap-3 md:grid-cols-2">{services.map((service) => <div key={service.id} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold text-white">{service.name}</h2><p className="mt-1 text-xs text-gray-500">{service.description}</p><p className="mt-3 text-sm font-bold text-cyan-300">{service.currency} {service.price ?? 'Contact us'}</p></div><button disabled={pending} onClick={() => remove(service.id)} className="text-gray-500 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button></div></div>)}</div></div>;
}
