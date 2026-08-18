'use client';

import { ExternalLink, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { SABIBIO_TEMPLATES, type SabiBioLink } from '@/lib/sabibio/templates';

interface PreviewConfig {
  name: string;
  slug: string;
  templateId: string;
  enabled: boolean;
  branding: Record<string, any>;
  links: SabiBioLink[];
  channels: Record<string, any>;
  socials?: Record<string, string>;
  products?: Array<{ id: string; name: string; price: number; currency: string; image_url: string | null }>;
}

export function SabiBioPreview({ config }: { config: PreviewConfig }) {
  const template = SABIBIO_TEMPLATES.find((item) => item.id === config.templateId) ?? SABIBIO_TEMPLATES[0];
  const branding = config.branding;
  const activeLinks = config.links.filter((link) => link.active);
  const gridTemplate = ['property-grid', 'retail-drop', 'food-table', 'creative-canvas'].includes(template.id);
  const fontFamily = template.font === 'mono' ? 'monospace' : template.font === 'serif' ? 'Georgia, serif' : 'inherit';

  return (
    <div className="mx-auto w-[290px] overflow-hidden rounded-[2.2rem] border-[7px] border-zinc-800 bg-black shadow-2xl shadow-black/40">
      <div className="h-[580px] overflow-y-auto" style={{ background: branding.background_color || template.background, color: '#f8fafc', fontFamily }}>
        <div className="flex items-center justify-between px-4 py-3 text-[9px] text-white/50">
          <span>9:41</span><span className="h-1.5 w-16 rounded-full bg-white/10" /><span>● ◒</span>
        </div>
        <div className="px-4 pb-8 pt-6 text-center">
          {branding.cover_url && <div className="mb-5 h-20 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${String(branding.cover_url)})` }} />}
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2" style={{ borderColor: branding.primary_color || template.primary, background: `${branding.primary_color || template.primary}22` }}>
            {branding.avatar_url ? <img src={branding.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-xl font-bold" style={{ color: branding.primary_color || template.primary }}>{config.name.slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <h3 className="text-sm font-semibold">{config.name || 'Your business'}</h3>
            {branding.verified && <ShieldCheck className="h-3.5 w-3.5" style={{ color: branding.primary_color || template.primary }} />}
          </div>
          <p className="mx-auto mt-2 max-w-[220px] text-[10px] leading-4 text-white/60">{branding.bio || 'Your short business bio will appear here.'}</p>
          <div className={`mt-6 ${gridTemplate ? 'grid grid-cols-2 gap-2' : 'space-y-2.5'}`}>
            {activeLinks.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-[10px] text-white/40">Add links to preview them here.</p> : activeLinks.map((link) => (
              <div key={link.id} className={`flex items-center justify-between px-4 py-3 text-left text-[11px] font-medium transition ${link.is_featured ? 'ring-1' : ''}`} style={{ background: `${branding.primary_color || template.primary}18`, borderColor: `${branding.primary_color || template.primary}66`, borderRadius: template.radius, ...(link.is_featured ? { boxShadow: `0 0 0 1px ${branding.primary_color || template.primary}` } : {}) }}>
                <span>{link.icon && <span className="mr-2">{link.icon}</span>}{link.title}</span><ExternalLink className="h-3 w-3 text-white/40" />
              </div>
            ))}
          </div>
          {config.products && config.products.length > 0 && <div className={`mt-5 ${gridTemplate ? 'grid grid-cols-2 gap-2' : 'space-y-2'}`}>{config.products.map((product) => <div key={product.id} className="overflow-hidden rounded-lg border border-white/10 bg-white/5 text-left">{product.image_url && <img src={product.image_url} alt="" className="h-12 w-full object-cover" />}<div className="p-2"><p className="truncate text-[9px] font-semibold">{product.name}</p><p className="mt-1 text-[8px] text-white/50">{product.currency} {product.price}</p></div></div>)}</div>}
          <div className="mt-6 flex justify-center gap-3 text-white/50"><span>◎</span><span>◉</span><span>◌</span></div>
        </div>
        {(config.channels.web_chat_enabled || config.channels.whatsapp_enabled || config.channels.telegram_enabled) && (
          <div className="sticky bottom-0 flex justify-center gap-2 border-t border-white/10 bg-black/30 px-3 py-3 backdrop-blur-md">
            {config.channels.web_chat_enabled && <span className="rounded-full p-2" style={{ background: branding.primary_color || template.primary }}><MessageCircle className="h-3.5 w-3.5 text-black" /></span>}
            {config.channels.whatsapp_enabled && <span className="rounded-full bg-emerald-500 p-2"><MessageCircle className="h-3.5 w-3.5 text-black" /></span>}
            {config.channels.telegram_enabled && <span className="rounded-full bg-sky-400 p-2"><Send className="h-3.5 w-3.5 text-black" /></span>}
          </div>
        )}
      </div>
    </div>
  );
}
