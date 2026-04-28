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
      <header className="sticky top-0 z-40 border-b hairline bg-background/85 backdrop-blur-xl py-3">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="min-w-[44px] min-h-[44px] hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={logoFotoPedido}
              alt=""
              width={28}
              height={28}
              className="w-7 h-7 rounded-md flex-shrink-0"
              loading="lazy"
            />
            <h1 className="font-display text-lg sm:text-xl text-foreground truncate leading-none">
              {eventName}
            </h1>
          </div>
        </div>
      </header>

      {hasHero && (
        <section
          className="relative overflow-hidden border-b hairline"
          aria-label="Detalhes do evento"
        >
          <div className="absolute inset-0">
            <img
              src={coverUrl!}
              alt=""
              loading="eager"
              decoding="async"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              className="absolute inset-0 h-full w-full object-cover scale-110 select-none"
              style={{ filter: 'brightness(0.6)' } as React.CSSProperties}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
            >
              <div
                className="absolute inset-0 flex items-center justify-center text-white font-display"
                style={{
                  fontSize: 'clamp(3rem, 12vw, 8rem)',
                  transform: 'rotate(-18deg)',
                  textShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
              >
                FotoPedido
              </div>
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 watermark-dots opacity-[0.18] mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/15" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/20" />
          </div>

          <div className="relative container mx-auto px-4 py-12 sm:py-16 lg:py-20 animate-fade-in">
            {photographerName && (
              <div className="inline-flex items-center gap-1.5 rounded-sm bg-black/55 backdrop-blur-md border border-white/10 px-3 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-white/95 mb-5">
                <Camera className="h-3 w-3 text-primary-soft" />
                <span className="truncate max-w-[200px]">{photographerName}</span>
              </div>
            )}

            <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl text-white leading-[0.95] drop-shadow-2xl mb-5 max-w-4xl">
              {eventName}
            </h2>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-white/85 uppercase tracking-[0.16em] font-semibold">
              {location && (
                <span className="flex items-center gap-1.5 drop-shadow">
                  <MapPin className="h-3.5 w-3.5 text-primary-soft flex-shrink-0" />
                  {location}
                </span>
              )}
              {dateLabel && (
                <span className="flex items-center gap-1.5 drop-shadow">
                  <Calendar className="h-3.5 w-3.5 text-primary-soft flex-shrink-0" />
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