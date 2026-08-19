export interface SabiBioTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  primary: string;
  background: string;
  accent: string;
  font: string;
  radius: string;
  shadow: string;
  density: 'compact' | 'balanced' | 'airy';
}

export function getTemplateLogoDefaults(templateId: string) {
  const defaults: Record<string, { shape: 'circle' | 'square' | 'rounded'; position: 'left' | 'center' | 'right'; overlap: boolean }> = {
    'developer-portfolio': { shape: 'square', position: 'left', overlap: false },
    'property-grid': { shape: 'rounded', position: 'left', overlap: true },
    'consulting-ledger': { shape: 'square', position: 'left', overlap: false },
    'beauty-glow': { shape: 'circle', position: 'center', overlap: true },
    'creator-studio': { shape: 'circle', position: 'right', overlap: true },
    'event-night': { shape: 'rounded', position: 'center', overlap: true },
  };
  return defaults[templateId] ?? { shape: 'circle', position: 'center', overlap: false };
}

export const SABIBIO_TEMPLATES: SabiBioTemplate[] = [
  { id: 'tech-minimal', name: 'Tech Minimal', category: 'Tech / IT / Software', description: 'Crisp, focused and product-led.', primary: '#06b6d4', background: '#07131c', accent: '#164e63', font: 'geist', radius: '0.75rem', shadow: '0 20px 60px rgba(6,182,212,.12)', density: 'balanced' },
  { id: 'developer-portfolio', name: 'Developer Portfolio', category: 'Developer / Personal Portfolio', description: 'A sharp canvas for projects and expertise.', primary: '#a78bfa', background: '#100d1b', accent: '#4c1d95', font: 'mono', radius: '0.5rem', shadow: '0 20px 60px rgba(167,139,250,.12)', density: 'compact' },
  { id: 'beauty-glow', name: 'Beauty Glow', category: 'Beauty & Aesthetics', description: 'Soft, elegant and editorial.', primary: '#fb7185', background: '#1c1015', accent: '#9f1239', font: 'serif', radius: '1.5rem', shadow: '0 20px 60px rgba(251,113,133,.14)', density: 'airy' },
  { id: 'fitness-energy', name: 'Fitness Energy', category: 'Fitness & Sports', description: 'High contrast momentum for active brands.', primary: '#84cc16', background: '#11170a', accent: '#365314', font: 'display', radius: '0.35rem', shadow: '0 20px 60px rgba(132,204,22,.12)', density: 'compact' },
  { id: 'travel-atlas', name: 'Travel Atlas', category: 'Travel Guide & Agency', description: 'Warm, inviting and destination-first.', primary: '#f59e0b', background: '#191207', accent: '#92400e', font: 'serif', radius: '1rem', shadow: '0 20px 60px rgba(245,158,11,.12)', density: 'airy' },
  { id: 'creator-studio', name: 'Creator Studio', category: 'Content Creator / Vlogger', description: 'Expressive, social and media-ready.', primary: '#f472b6', background: '#180d19', accent: '#86198f', font: 'display', radius: '1.25rem', shadow: '0 20px 60px rgba(244,114,182,.14)', density: 'balanced' },
  { id: 'property-grid', name: 'Property Grid', category: 'Real Estate & Property', description: 'Refined presentation for spaces and listings.', primary: '#d6a35c', background: '#17130d', accent: '#713f12', font: 'serif', radius: '0.35rem', shadow: '0 20px 60px rgba(214,163,92,.1)', density: 'airy' },
  { id: 'consulting-ledger', name: 'Consulting Ledger', category: 'Consulting & Professional Services', description: 'Trustworthy, precise and authority-led.', primary: '#60a5fa', background: '#0b1424', accent: '#1e3a8a', font: 'geist', radius: '0.5rem', shadow: '0 20px 60px rgba(96,165,250,.1)', density: 'balanced' },
  { id: 'creative-canvas', name: 'Creative Canvas', category: 'Creative / Design Agency', description: 'A bold frame for original work.', primary: '#f97316', background: '#1b1009', accent: '#9a3412', font: 'display', radius: '1rem', shadow: '0 20px 60px rgba(249,115,22,.14)', density: 'airy' },
  { id: 'music-stage', name: 'Music Stage', category: 'Music & Entertainment', description: 'Dark, electric and performance-ready.', primary: '#e879f9', background: '#160d1b', accent: '#86198f', font: 'display', radius: '0.75rem', shadow: '0 20px 60px rgba(232,121,249,.15)', density: 'compact' },
  { id: 'food-table', name: 'Food Table', category: 'Restaurant / Food & Bar', description: 'Appetizing warmth with a clear menu flow.', primary: '#ef4444', background: '#1a0d0b', accent: '#991b1b', font: 'serif', radius: '1rem', shadow: '0 20px 60px rgba(239,68,68,.12)', density: 'airy' },
  { id: 'retail-drop', name: 'Retail Drop', category: 'E-commerce & Retail', description: 'Product-first and conversion-minded.', primary: '#2dd4bf', background: '#071817', accent: '#115e59', font: 'geist', radius: '0.5rem', shadow: '0 20px 60px rgba(45,212,191,.12)', density: 'balanced' },
  { id: 'clinic-care', name: 'Clinic Care', category: 'Healthcare & Medical Clinic', description: 'Calm, clear and reassuring.', primary: '#34d399', background: '#071713', accent: '#065f46', font: 'geist', radius: '0.75rem', shadow: '0 20px 60px rgba(52,211,153,.1)', density: 'airy' },
  { id: 'learning-room', name: 'Learning Room', category: 'Education & Online Tutor', description: 'Friendly structure for lessons and resources.', primary: '#facc15', background: '#191606', accent: '#854d0e', font: 'geist', radius: '1rem', shadow: '0 20px 60px rgba(250,204,21,.1)', density: 'balanced' },
  { id: 'event-night', name: 'Event Night', category: 'Event Host & Venue', description: 'A polished invitation to the next big moment.', primary: '#fb923c', background: '#1b0f08', accent: '#9a3412', font: 'display', radius: '1.25rem', shadow: '0 20px 60px rgba(251,146,60,.14)', density: 'airy' },
];

export const DEFAULT_SABIBIO_BRANDING = {
  primary_color: '#06b6d4',
  background_color: '#07131c',
  accent_color: '#164e63',
  font_family: 'geist',
  avatar_url: '',
  cover_url: '',
  logo_shape: 'circle',
  logo_position: 'center',
  bio: '',
  verified: false,
};

export const DEFAULT_SABIBIO_CHANNELS = {
  web_chat_enabled: true,
  whatsapp_enabled: false,
  telegram_enabled: false,
  whatsapp_number: '',
  telegram_username: '',
  default_welcome_msg: 'Hi there! How can I help you today?',
};

export const DEFAULT_SABIBIO_SOCIALS = {
  instagram: '',
  tiktok: '',
  youtube: '',
  x: '',
  linkedin: '',
  facebook: '',
};

export interface SabiBioLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  category: string;
  active: boolean;
  is_featured: boolean;
}
