import { getGlobalSiteSettings } from '@/lib/global-settings';

interface BrandMarkProps {
  fallbackText?: string;
  gradient?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES: Record<string, string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

const IMG_SIZES: Record<string, string> = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

// Server component: renders the universal logo from global settings, else a gradient fallback tile.
export async function BrandMark({
  fallbackText = 'SB',
  gradient = 'from-cyan-400 to-blue-500',
  size = 'sm',
}: BrandMarkProps) {
  const settings = await getGlobalSiteSettings();
  const logoUrl = settings?.universal_logo_url;

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={settings?.site_title ?? 'Logo'}
        className={`${IMG_SIZES[size]} shrink-0 rounded-lg object-contain`}
      />
    );
  }

  return (
    <div
      className={`bg-linear-to-br ${gradient} ${SIZES[size]} shrink-0 rounded-lg flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-cyan-500/20`}
    >
      {fallbackText}
    </div>
  );
}
