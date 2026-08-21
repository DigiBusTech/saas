'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Trash2, BriefcaseBusiness } from 'lucide-react';
import { createService, deleteService, getWorkspaceServices, toggleServiceActive } from './actions';
import type { WorkspaceService } from '@/lib/types/database';

export default function ServicesPage() {
  const params = useParams<{ workspace_id: string }>();
  const workspaceId = params.workspace_id;
  const [services, setServices] = useState<WorkspaceService[]>([]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  useEffect(() => { getWorkspaceServices(workspaceId).then((result) => setServices(result.data)); }, [workspaceId]);

  async function submit(formData: FormData) {
    const result = await createService(workspaceId, formData);
    if (result.error) setMessage(result.error);
    else { setMessage('Service added.'); (document.getElementById('service-form') as HTMLFormElement)?.reset(); const latest = await getWorkspaceServices(workspaceId); setServices(latest.data); }
  }

  function remove(id: string) { startTransition(async () => { const result = await deleteService(workspaceId, id); if (result.error) setMessage(result.error); else setServices((items) => items.filter((item) => item.id !== id)); }); }

  function toggleActive(id: string, next: boolean) {
    setServices((items) => items.map((item) => item.id === id ? { ...item, is_active: next } : item));
    startTransition(async () => { await toggleServiceActive(workspaceId, id, next); });
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-cyan-500 dark:text-cyan-400" /><h1 className="text-xl font-semibold text-foreground">Services</h1></div>
        <p className="mt-1 text-xs text-muted-foreground">Add services with descriptions and pricing, then feature them on SabiBio.</p>
      </div>
      <form id="service-form" action={submit} className="grid gap-3 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
        <input name="name" required placeholder="Service name" className="field" />
        <input name="price" type="number" min="0" step="0.01" placeholder="Price" className="field" />
        <input name="currency" defaultValue="USD" placeholder="Currency" className="field" />
        <input name="image_url" placeholder="Image URL" className="field" />
        <input name="code" placeholder="Service code, e.g. SRV-101" className="field" />
        <input name="checkout_url" placeholder="Checkout URL (optional)" className="field" />
        <input name="payment_link" placeholder="Booking or payment link" className="field md:col-span-2" />
        <textarea name="description" placeholder="Describe what the client gets" rows={3} className="field resize-none md:col-span-2" />
        <button className="flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"><Plus className="h-3.5 w-3.5" /> Add service</button>
        {message && <p className="text-xs text-primary">{message}</p>}
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {services.map((service) => (
          <div key={service.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">{service.name}</h2>
                  {service.code && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-mono">{service.code}</span>}
                  {!service.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">Inactive</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{service.description}</p>
                <p className="mt-3 text-sm font-bold text-primary">{service.currency} {service.price ?? 'Contact us'}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button disabled={pending} onClick={() => remove(service.id)} className="text-muted-foreground hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                <button disabled={pending} onClick={() => toggleActive(service.id, !service.is_active)} className="text-[9px] text-muted-foreground hover:text-primary">
                  {service.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

