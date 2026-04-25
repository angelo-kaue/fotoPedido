import { Link } from 'react-router-dom';
import { Calendar, MapPin, Camera, ImageIcon } from 'lucide-react';
import { formatDateBR } from '@/lib/date-utils';

export interface PremiumEvent {
  id: string;
  name: string;
  slug: string;
  event_date: string | null;
  location: string | null;
  cover_url: string | null;
}

interface Props {
  event: PremiumEvent;
  photographerName: string;
  index?: number;
}

/**
 * Premium event card for the public home page.
 * - Compact square cover image with strong multi-layer watermark
 * - Layer 1: Central "FotoPedido" text watermark (medium opacity)
 * - Layer 2: Diagonal dashed protection lines
 * - Layer 3: Corner "PREVIEW" labels
 * - Photographer badge, event title, location, date
 */
const PremiumEventCard = ({ event, photographerName, index = 0 }: Props) => {
  const dateLabel = event.event_date ? formatDateBR(event.event_date) : null;

  return (
    <Link
      to={`/evento/${event.slug}`}
      className="group relative block overflow-hidden rounded-xl border border-border/50 bg-card/80 shadow-md shadow-black/20 transition-all duration-500 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/25 animate-fade-in"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Cover image area - compact square */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/50">
        {event.cover_url ? (
          <img
            src={event.cover_url}
            alt={event.name}
            loading="lazy"
            decoding="async"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 select-none"
            style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        {event.cover_url && (
          <>
            {/* Layer 2: Diagonal dashed protection lines (denser, subtle) */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 14px), repeating-linear-gradient(45deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 14px)",
              }}
            />

            {/* Layer 1: Central "FotoPedido" text watermark (stronger) */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div
                className="font-black tracking-wider text-white/35"
                style={{
                  fontSize: 'clamp(1.25rem, 5vw, 2.25rem)',
                  transform: 'rotate(-22deg)',
                  textShadow: '0 2px 6px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.6)',
                  letterSpacing: '0.1em',
                  WebkitTextStroke: '0.5px rgba(0,0,0,0.25)',
                }}
              >
                FotoPedido
              </div>
            </div>

            {/* Repeating diagonal "FotoPedido" stamps (very subtle, full coverage) */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.10]"
            >
              <div
                className="absolute -inset-1/4 flex flex-wrap content-center justify-center gap-x-6 gap-y-8 text-white font-bold"
                style={{
                  fontSize: '0.7rem',
                  transform: 'rotate(-22deg)',
                  letterSpacing: '0.15em',
                }}
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <span key={i} className="whitespace-nowrap">FotoPedido</span>
                ))}
              </div>
            </div>

            {/* Layer 3: Corner PREVIEW labels */}
            <div
              aria-hidden
              className="pointer-events-none absolute top-2 right-2 z-[5] rounded-sm bg-black/45 backdrop-blur-sm px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-white/85 border border-white/10"
            >
              Preview
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-1 right-2 z-[5] text-[8px] font-bold uppercase tracking-[0.18em] text-white/40"
            >
              No Copy
            </div>
          </>
        )}

        {/* Dark gradient overlay for text contrast */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/45 z-[1]" />

        {/* Hover glow */}
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-primary/25 via-transparent to-primary/10 z-[2]" />

        {/* Top: photographer badge */}
        {photographerName && (
          <div className="absolute top-2 left-2 z-10">
            <div className="inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white shadow-md">
              <Camera className="h-2.5 w-2.5 text-primary" />
              <span className="truncate max-w-[110px]">{photographerName}</span>
            </div>
          </div>
        )}

        {/* Bottom: event info */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-2.5 sm:p-3 space-y-1">
          <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-white leading-tight drop-shadow-lg line-clamp-2 group-hover:text-primary-foreground transition-colors">
            {event.name}
          </h2>
          <div className="space-y-0.5">
            {event.location && (
              <p className="flex items-center gap-1 text-[10px] sm:text-xs text-white/90 font-medium drop-shadow">
                <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </p>
            )}
            {dateLabel && (
              <p className="flex items-center gap-1 text-[10px] sm:text-xs text-white/80 font-medium drop-shadow">
                <Calendar className="h-3 w-3 text-primary flex-shrink-0" />
                {dateLabel}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PremiumEventCard;