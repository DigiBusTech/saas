'use client';

import { useEffect, useRef } from 'react';

interface Partner {
  id: string;
  entity_name: string;
  logo_url: string;
  link_url: string | null;
  description: string | null;
}

interface Props {
  partners: Partner[];
}

export function TrustBadgeMarquee({ partners }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || partners.length === 0) return;

    let animationFrameId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5; // pixels per frame

    const animate = () => {
      scrollPosition += scrollSpeed;
      
      if (scrollContainer) {
        scrollContainer.scrollLeft = scrollPosition;
        
        // Reset when we've scrolled past the duplicated content
        if (scrollPosition >= scrollContainer.scrollWidth / 2) {
          scrollPosition = 0;
        }
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [partners.length]);

  if (partners.length === 0) return null;

  // Duplicate partners for seamless infinite scroll
  const displayPartners = [...partners, ...partners];

  return (
    <section className="border-y border-white/5 bg-[#060b1a] overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Trusted By & Compliant
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Recognized by leading Nigerian regulators and technology partners
          </p>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-12 overflow-hidden"
          style={{ scrollBehavior: 'auto' }}
        >
          {displayPartners.map((partner, index) => (
            <div
              key={`${partner.id}-${index}`}
              className="shrink-0"
              style={{ width: '180px' }}
            >
              {partner.link_url ? (
                <a
                  href={partner.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block h-20 rounded-lg border border-white/5 bg-white/2 p-4 transition hover:border-cyan-400/20 hover:bg-white/5"
                  title={partner.description || partner.entity_name}
                >
                  <img
                    src={partner.logo_url}
                    alt={partner.entity_name}
                    className="h-full w-full object-contain opacity-60 grayscale transition group-hover:opacity-100 group-hover:grayscale-0"
                  />
                </a>
              ) : (
                <div
                  className="h-20 rounded-lg border border-white/5 bg-white/2 p-4"
                  title={partner.description || partner.entity_name}
                >
                  <img
                    src={partner.logo_url}
                    alt={partner.entity_name}
                    className="h-full w-full object-contain opacity-60 grayscale"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
