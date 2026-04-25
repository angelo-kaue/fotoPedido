import { ArrowLeft, MapPin, Calendar, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import logoFotoPedido from '@/assets/logo-fotopedido.png';
import { formatDateBR } from '@/lib/date-utils';

interface GalleryHeaderProps {
  eventName: string;
  location?: string | null;
  eventDate?: string | null;
  photographerName?: string;
  coverUrl?: string | null;
}

const GalleryHeader = ({
  eventName,
  location,
  eventDate,
  photographerName,
  coverUrl,
}: GalleryHeaderProps) => {
  const navigate = useNavigate();
  const dateLabel = eventDate ? formatDateBR(eventDate, { long: true }) : null;
  const hasHero = !!eventName && !!coverUrl;

  return (
    <>
      {/* Sticky compact bar (always present for nav) */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/70 backdrop-blur-xl py-3">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="min-w-[44px] min-h-[44px] hover:bg-primary/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={logoFotoPedido}
              alt=""
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg flex-shrink-0"
              loading="lazy"
            />
            <h1 className="text-base sm:text-lg font-bold text-foreground truncate">
              {eventName}
            </h1>
          </div>
        </div>
      </header>

      {/* Premium hero with cover image */}
      {hasHero && (
        <section
          className="relative overflow-hidden border-b border-border/50"
          aria-label="Detalhes do evento"
        >
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src={coverUrl!}
              alt=""
              loading="eager"
              decoding="async"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              className="absolute inset-0 h-full w-full object-cover scale-110 select-none"
              style={{ filter: 'brightness(0.7)' } as React.CSSProperties}
            />
            {/* Watermark overlay (lightweight CSS) */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
            >
              <div
                className="absolute inset-0 flex items-center justify-center text-white font-black tracking-wider"
                style={{
                  fontSize: 'clamp(3rem, 12vw, 8rem)',
                  transform: 'rotate(-22deg)',
                  letterSpacing: '0.08em',
                  textShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
              >
                FotoPedido
              </div>
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 28px)',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/30" />
          </div>

          {/* Content */}
          <div className="relative container mx-auto px-4 py-10 sm:py-14 lg:py-16 animate-fade-in">
            {photographerName && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/15 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-white shadow-md mb-4">
                <Camera className="h-3 w-3 text-primary" />
                <span className="truncate max-w-[200px]">{photographerName}</span>
              </div>
            )}

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-white leading-[0.95] drop-shadow-2xl mb-4">
              {eventName}
            </h2>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm sm:text-base text-white/90 font-medium">
              {location && (
                <span className="flex items-center gap-1.5 drop-shadow">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  {location}
                </span>
              )}
              {dateLabel && (
                <span className="flex items-center gap-1.5 drop-shadow">
                  <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                  {dateLabel}
                </span>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default GalleryHeader;