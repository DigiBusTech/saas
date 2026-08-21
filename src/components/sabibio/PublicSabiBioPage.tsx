import { ExternalLink, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { siFacebook, siInstagram, siTiktok, siX, siYoutube } from 'simple-icons/icons';
import { getTemplateLogoDefaults, type SabiBioTemplate, type SabiBioLink } from '@/lib/sabibio/templates';
import { WebChatDrawer } from './WebChatDrawer';
import { ProductCollection } from './ProductCollection';
import { AnalyticsTracker } from './AnalyticsTracker';

interface Props {
  workspace: any;
  template: SabiBioTemplate;
}

export function PublicSabiBioPage({ workspace, template }: Props) {
  const branding = { primary_color: template.primary, background_color: template.background, ...(workspace.sabibio_branding ?? {}) } as Record<string, string | boolean>;
  const channels = {
    ...(workspace.sabibio_channels ?? {}),
    whatsapp_enabled: Boolean(workspace.whatsapp_phone_number_id && workspace.whatsapp_access_token) || workspace.sabibio_channels?.whatsapp_enabled === true,
    telegram_enabled: Boolean(workspace.telegram_bot_token) || workspace.sabibio_channels?.telegram_enabled === true,
  };
  const socials = workspace.sabibio_socials ?? {};
  const links = (workspace.sabibio_links ?? []) as SabiBioLink[];
  const activeLinks = links.filter((link) => link.active);
  const selectedProductIds = (workspace.sabibio_products ?? []) as string[];
  const products = ((workspace.workspace_products ?? []) as Array<{ id: string; name: string; description: string | null; price: number; currency: string; image_url: string | null; payment_link: string | null }>)
    .filter((product) => selectedProductIds.includes(product.id));
  const services = (workspace.workspace_services ?? []).filter((service: { is_active: boolean }) => service.is_active);
  const articles = (workspace.workspace_articles ?? []).filter((article: { is_published: boolean; show_on_sabibio: boolean }) => article.is_published && article.show_on_sabibio);
  const legal = (workspace.sabibio_legal ?? {}) as Record<string, unknown>;
  
  // PHASE 1: Get verified badge from subscription plan
  const hasVerifiedBadge = workspace.tenants?.subscription_plans?.has_verified_badge ?? false;
  
  const primary = String(branding.primary_color);
  const isGridTemplate = ['property-grid', 'retail-drop', 'food-table', 'creative-canvas'].includes(template.id);
  const isEditorialTemplate = ['beauty-glow', 'travel-atlas', 'creator-studio', 'event-night'].includes(template.id);
  const isCompactTemplate = template.density === 'compact';
  const logoDefaults = getTemplateLogoDefaults(template.id);
  const logoShape = String(branding.logo_shape ?? logoDefaults.shape);
  const logoPosition = String(branding.logo_position ?? logoDefaults.position);
  const coverOverlap = branding.cover_overlap === undefined ? logoDefaults.overlap : Boolean(branding.cover_overlap);
  const logoRadius = logoShape === 'circle' ? '9999px' : logoShape === 'rounded' ? template.radius : '0.5rem';
  const logoAlign = logoPosition === 'left' ? 'items-start text-left' : logoPosition === 'right' ? 'items-end text-right' : 'items-center text-center';
  const phone = String(channels.whatsapp_number ?? '').replace(/\D/g, '');
  const telegram = String(channels.telegram_username ?? '').replace(/^@/, '');

  const socialItems = [
    { key: 'instagram', href: normalizeSocialUrl('instagram', socials.instagram), icon: siInstagram },
    { key: 'tiktok', href: normalizeSocialUrl('tiktok', socials.tiktok), icon: siTiktok },
    { key: 'youtube', href: normalizeSocialUrl('youtube', socials.youtube), icon: siYoutube },
    { key: 'linkedin', href: normalizeSocialUrl('linkedin', socials.linkedin), icon: { path: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11.5 20h-3v-9h3v9zm-1.5-10.25c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13 10.25h-3v-4.5c0-1.071-.021-2.447-1.5-2.447-1.5 0-1.73 1.172-1.73 2.369v4.578h-3v-9h2.881v1.229h.041c.401-.76 1.381-1.561 2.84-1.561 3.039 0 3.6 2.001 3.6 4.601v4.731z' } },
    { key: 'facebook', href: normalizeSocialUrl('facebook', socials.facebook), icon: siFacebook },
    { key: 'x', href: normalizeSocialUrl('x', socials.x), icon: siX },
  ].filter((item) => item.href);

  return (
    <main className="min-h-screen px-4 py-8 text-white" style={{ background: String(branding.background_color), fontFamily: branding.font_family === 'mono' || template.font === 'mono' ? 'monospace' : branding.font_family === 'serif' || template.font === 'serif' ? 'Georgia, serif' : 'inherit' }}>
      {/* PHASE 3: Track page views */}
      <AnalyticsTracker workspaceId={workspace.id} />
      
      <div className={`mx-auto ${isGridTemplate ? 'max-w-2xl' : isCompactTemplate ? 'max-w-md' : 'max-w-xl'}`}>
        <header className={`relative flex flex-col overflow-hidden ${logoAlign}`} style={{ borderRadius: template.radius, boxShadow: template.shadow }}>
          {branding.cover_url && <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url(${String(branding.cover_url)})` }} />}
          <div className={`w-full ${branding.cover_url ? 'px-4 pb-4 pt-0' : ''} ${coverOverlap && branding.cover_url ? '-mt-12 px-4 pb-4' : ''}`}>
          <div className={`flex h-24 w-24 items-center justify-center overflow-hidden border-2 ${logoPosition === 'right' ? 'ml-auto' : logoPosition === 'left' ? 'mr-auto' : 'mx-auto'}`} style={{ borderColor: primary, background: `${primary}22`, borderRadius: logoRadius }}>
            {workspace.logo_url || branding.avatar_url ? <img src={String(workspace.logo_url || branding.avatar_url)} alt="" className="h-full w-full object-cover" /> : <span className="text-3xl font-bold" style={{ color: primary }}>{String(workspace.name).slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className={`mt-4 flex gap-2 ${logoPosition === 'center' ? 'justify-center' : ''}`}><h1 className="text-xl font-bold">{String(workspace.name)}</h1>{hasVerifiedBadge && <ShieldCheck className="h-5 w-5" style={{ color: primary }} />}</div>
          {branding.bio && <p className={`mt-3 max-w-md text-sm leading-6 text-white/65 ${logoPosition === 'center' ? 'mx-auto' : ''}`}>{String(branding.bio)}</p>}
          {socialItems.length > 0 && <div className={`mt-5 flex gap-4 text-white/60 ${logoPosition === 'center' ? 'justify-center' : ''}`}>{socialItems.map((item) => <a key={item.key} href={String(item.href)} target="_blank" rel="noreferrer" className="transition hover:text-white"><SocialIcon path={item.icon.path} title={item.key} /></a>)}</div>}
          </div>
        </header>

        <section className={`mt-8 ${isGridTemplate ? 'grid gap-3 sm:grid-cols-2' : `space-y-3 ${template.density === 'airy' ? 'sm:space-y-5' : template.density === 'balanced' ? 'sm:space-y-4' : ''}`}`}>
          {activeLinks.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className={`group flex items-center justify-between border px-5 py-4 text-sm font-semibold transition hover:-translate-y-0.5 ${isEditorialTemplate ? 'text-center justify-center' : ''}`} style={{ borderColor: link.is_featured ? primary : `${primary}55`, background: `${primary}${link.is_featured ? '2c' : '15'}`, borderRadius: template.radius, boxShadow: link.is_featured ? template.shadow : 'none' }}><span>{link.icon && <span className="mr-2">{link.icon}</span>}{link.title}</span><ExternalLink className="h-4 w-4 text-white/40 transition group-hover:text-white" /></a>)}
        </section>

        {products.length > 0 && <ProductCollection products={products} primary={primary} radius={template.radius} grid={isGridTemplate} workspaceId={workspace.id} paymentOptions={workspace.payment_options ?? { methods: [], checkout_fields: [] }} />}

        {services.length > 0 && <section className="mt-8"><h2 className="mb-3 text-sm font-semibold" style={{ color: primary }}>Services</h2><div className="space-y-3">{services.map((service: { id: string; name: string; description: string | null; price: number | null; currency: string; image_url: string | null; payment_link: string | null }) => <a key={service.id} href={service.payment_link || '#'} target={service.payment_link ? '_blank' : undefined} rel="noreferrer" className="block overflow-hidden border p-4 transition hover:-translate-y-0.5" style={{ borderColor: `${primary}55`, background: `${primary}12`, borderRadius: template.radius }}>{service.image_url && <img src={service.image_url} alt="" className="mb-3 h-24 w-full rounded object-cover" />}<p className="text-xs font-semibold">{service.name}</p><p className="mt-1 text-[10px] text-white/55">{service.description}</p>{service.price !== null && <p className="mt-2 text-xs font-bold" style={{ color: primary }}>{service.currency} {service.price}</p>}</a>)}</div></section>}

        {articles.length > 0 && <section className="mt-8"><h2 className="mb-3 text-sm font-semibold" style={{ color: primary }}>From the journal</h2><div className="space-y-3">{articles.map((article: { id: string; title: string; excerpt: string | null; cover_image_url: string | null }) => <article key={article.id} className="overflow-hidden border" style={{ borderColor: `${primary}55`, borderRadius: template.radius }}>{article.cover_image_url && <img src={article.cover_image_url} alt="" className="h-28 w-full object-cover" />}<div className="p-4"><h3 className="text-xs font-semibold">{article.title}</h3><p className="mt-1 text-[10px] text-white/55">{article.excerpt}</p></div></article>)}</div></section>}

        <footer className="mt-10 flex justify-center gap-3">
          {channels.web_chat_enabled && <WebChatDrawer workspaceId={workspace.id} welcomeMessage={String(channels.default_welcome_msg ?? 'Hi there! How can I help you today?')} primary={primary} />}
          {channels.whatsapp_enabled && phone && <a href={`https://wa.me/${phone}?text=${encodeURIComponent(String(channels.default_welcome_msg ?? 'Hi, I would like to learn more.'))}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-emerald-400"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
          {channels.telegram_enabled && telegram && <a href={`https://t.me/${telegram}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-sky-400 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-sky-300"><Send className="h-4 w-4" /> Telegram</a>}
        </footer>
        
        {/* PHASE 1: Business Legal Footer with Workspace Name */}
        <div className="mt-10 flex flex-wrap justify-center gap-3 text-[10px] text-white/40">
          {Boolean(legal.show_privacy) && <a href="#privacy_policy" className="hover:text-white">{workspace.name as string} Privacy Policy</a>}
          {Boolean(legal.show_terms) && <a href="#terms_of_service" className="hover:text-white">{workspace.name as string} Terms</a>}
          {Boolean(legal.show_disclaimer) && <a href="#disclaimer" className="hover:text-white">Legal Disclaimer</a>}
        </div>
        <div className="mt-6 space-y-4 text-left">
          {Boolean(legal.show_privacy) && String(legal.privacy_policy ?? '').trim() && (
            <section id="privacy_policy" className="scroll-mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
              <h2 className="text-xs font-semibold text-white">{workspace.name as string} Privacy Policy</h2>
              <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-white/55">{String(legal.privacy_policy)}</p>
            </section>
          )}
          {Boolean(legal.show_terms) && String(legal.terms_of_service ?? '').trim() && (
            <section id="terms_of_service" className="scroll-mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
              <h2 className="text-xs font-semibold text-white">{workspace.name as string} Terms of Service</h2>
              <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-white/55">{String(legal.terms_of_service)}</p>
            </section>
          )}
          {Boolean(legal.show_disclaimer) && String(legal.disclaimer ?? '').trim() && (
            <section id="disclaimer" className="scroll-mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
              <h2 className="text-xs font-semibold text-white">Legal Disclaimer</h2>
              <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-white/55">{String(legal.disclaimer)}</p>
            </section>
          )}
        </div>
        <p className="mt-4 text-center text-[10px] text-white/30">Powered by SabiBio · Sabi AI Technologies Ltd.</p>
      </div>
    </main>
  );
}

function SocialIcon({ path, title }: { path: string; title: string }) {
  return <svg aria-label={title} role="img" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d={path} /></svg>;
}

function normalizeSocialUrl(network: string, value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, '');
  const hosts: Record<string, string> = {
    instagram: 'https://instagram.com/',
    tiktok: 'https://tiktok.com/@',
    youtube: 'https://youtube.com/@',
    linkedin: 'https://linkedin.com/in/',
    facebook: 'https://facebook.com/',
    x: 'https://x.com/',
  };
  return `${hosts[network] ?? 'https://'}${handle}`;
}
