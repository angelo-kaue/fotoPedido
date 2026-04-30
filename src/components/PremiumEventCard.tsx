import { Link } from 'react-router-dom';
import { Calendar, MapPin, ImageIcon } from 'lucide-react';
import { formatDateBR } from '@/lib/date-utils';

export interface PremiumEvent {
  id: string;
  name: string;
  slug: string;
  event_date: string | null;
  location: string | null;
  cover_url: string | null;
  tenant_id?: string;
}

interface Props {
  event: PremiumEvent;
  photographerName: string;
  index?: number;
}

/**
 * Premium event card — Midnight Studio.
 * Editorial composition: square cover, dotted protection mesh, repeated
 * watermark stamp grid, clean info block beneath the image.
 */
const PremiumEventCard = ({ event, photographerName, index = 0 }: Props) => {
  const dateLabel = event.event_date ? formatDateBR(event.event_date) : null;

  return (
    <Link
      to={`/evento/${event.slug}`}
      className="group block animate-fade-in"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Cover */}
      <div className="relative aspect-square overflow-hidden rounded-md bg-card ring-1 ring-[hsl(var(--hairline))] transition-all duration-500 group-hover:ring-primary/40 group-hover:shadow-[0_24px_60px_-30px_hsl(var(--primary)/0.6)]">
        {event.cover_url ? (
          <img
            src={event.cover_url}
            alt={event.name}
            loading="lazy"
            decoding="async"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06] select-none"
            style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}

        {event.cover_url && (
          <>
            {/* Premium dotted protection mesh */}
            <div aria-hidden className="pointer-events-none absolute inset-0 watermark-dots opacity-[0.22] mix-blend-overlay" />
            <div aria-hidden className="pointer-events-none absolute inset-0 watermark-mesh opacity-30 mix-blend-overlay" />

            {/* Repeated diagonal stamp grid (visible but elegant) */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.16]">
              <div
                className="absolute -inset-1/4 flex flex-wrap content-center justify-center gap-x-5 gap-y-7 text-white"
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  transform: 'rotate(-22deg)',
                  letterSpacing: '0.22em',
                }}
              >
                {Array.from({ length: 30 }).map((_, i) => (
                  <span key={i} className="whitespace-nowrap uppercase">FotoPedido · Amostra</span>
                ))}
              </div>
            </div>

            {/* Central editorial wordmark */}
            <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="font-display text-white/35"
                style={{
                  fontSize: 'clamp(1.5rem, 6vw, 2.75rem)',
                  transform: 'rotate(-18deg)',
                  textShadow: '0 2px 12px rgba(0,0,0,0.55)',
                  letterSpacing: '0.02em',
                }}
              >
                FotoPedido
              </div>
            </div>

            {/* Subtle bottom shade only — keep image breathing */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

            {/* Photographer chip */}
            {photographerName && (
              <div className="absolute top-2.5 left-2.5 z-10">
                <div className="inline-flex items-center gap-1.5 rounded-sm bg-black/55 backdrop-blur-md border border-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/95">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  <span className="truncate max-w-[120px]">{photographerName}</span>
                </div>
              </div>
            )}

            {/* Tiny preview tag */}
            <div className="absolute top-2.5 right-2.5 z-10 text-[9px] font-bold uppercase tracking-[0.22em] text-white/70">
              Amostra
            </div>
          </>
        )}
      </div>

      {/* Info — clean editorial block under the image */}
      <div className="pt-3 px-0.5">
        <h2 className="font-display text-xl sm:text-2xl text-foreground leading-[1.05] line-clamp-2 group-hover:text-primary-soft transition-colors">
          {event.name}
        </h2>
        <div className="mt-1.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 text-[11px] text-muted-foreground uppercase tracking-[0.14em] font-medium">
          {event.location && (
            <span className="flex items-start gap-1 min-w-0 max-w-full">
              <MapPin className="h-3 w-3 mt-[2px] text-primary/80 flex-shrink-0" />
              <span className="break-words leading-snug line-clamp-2 sm:line-clamp-1 sm:truncate">
                {event.location}
              </span>
            </span>
          )}
          {dateLabel && (
            <span className="flex items-center gap-1 flex-shrink-0">
              <Calendar className="h-3 w-3 text-primary/80" />
              {dateLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default PremiumEventCard;