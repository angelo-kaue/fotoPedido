import { useEffect, useRef, useState, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Download, Sparkles, Image as ImageIcon, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { supabase } from '@/integrations/supabase/client';

interface EventPromoCardProps {
  slug: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  location: string;
}

const PUBLISHED_URL = 'https://foto-seleciona-rapido.lovable.app';

const CTA_OPTIONS = [
  'Encontre suas fotos',
  'Fotos oficiais do evento',
  'Acesse a galeria',
  'Escaneie o QR Code',
];

const EventPromoCard = ({ slug, eventId, eventName, eventDate, location }: EventPromoCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [photographerName, setPhotographerName] = useState('');
  const [overlay, setOverlay] = useState([72]);
  const [showQr, setShowQr] = useState(true);
  const [ctaIndex, setCtaIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [loadingCover, setLoadingCover] = useState(true);

  const eventUrl = `${PUBLISHED_URL}/evento/${slug}`;

  // Generate QR
  useEffect(() => {
    QRCode.toDataURL(eventUrl, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#0a0a0a', light: '#ffffff' },
    }).then(setQrDataUrl).catch(() => {});
  }, [eventUrl]);

  // Load cover photo + photographer name
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingCover(true);
      try {
        const { data: ev } = await supabase
          .from('events')
          .select('cover_photo_id, tenant_id')
          .eq('id', eventId)
          .maybeSingle();

        const eventMeta = ev as { tenant_id?: string | null; cover_photo_id?: string | null } | null;
        const tenantId = eventMeta?.tenant_id;
        const coverId = eventMeta?.cover_photo_id;

        if (tenantId) {
          const { data: settings } = await supabase
            .from('photographer_settings')
            .select('photographer_name')
            .eq('tenant_id', tenantId)
            .maybeSingle();
          if (!cancelled && settings?.photographer_name) {
            setPhotographerName(settings.photographer_name);
          }
        }

        let photoPath: string | null = null;
        if (coverId) {
          const { data } = await supabase
            .from('event_photos')
            .select('preview_path, thumbnail_path')
            .eq('id', coverId)
            .maybeSingle();
          if (data) photoPath = data.preview_path || data.thumbnail_path;
        }
        if (!photoPath) {
          const { data } = await supabase
            .from('event_photos')
            .select('preview_path, thumbnail_path')
            .eq('event_id', eventId)
            .order('sort_order', { ascending: true })
            .order('captured_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          if (data) photoPath = data.preview_path || data.thumbnail_path;
        }

        if (photoPath) {
          const { data } = await supabase.functions.invoke('get-signed-urls', {
            body: { paths: [photoPath], expiresIn: 1800 },
          });
          if (!cancelled && data?.urls?.[photoPath]) {
            setCoverUrl(data.urls[photoPath]);
          }
        }
      } catch (err) {
        console.error('promo cover load failed', err);
      } finally {
        if (!cancelled) setLoadingCover(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [eventId]);

  const formattedDate = (() => {
    if (!eventDate) return '';
    try {
      const d = new Date(eventDate + 'T00:00:00');
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch { return eventDate; }
  })();

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      // Preload cover as data URL to avoid CORS taint
      let coverDataUrl: string | undefined;
      if (coverUrl) {
        try {
          const res = await fetch(coverUrl, { mode: 'cors' });
          const blob = await res.blob();
          coverDataUrl = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = reject;
            r.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn('cover fetch failed, falling back', e);
        }
      }

      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 1,
        cacheBust: true,
        width: 1080,
        height: 1920,
        fetchRequestInit: { mode: 'cors' },
        imagePlaceholder: coverDataUrl,
        skipFonts: false,
      });

      const link = document.createElement('a');
      link.download = `fotopedido-${slug}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Card promocional baixado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar o card. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  // Responsive preview width — scales with container without allowing collapse
  const [previewWidth, setPreviewWidth] = useState(260);
  const previewWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!previewWrapperRef.current) return;
    const el = previewWrapperRef.current;
    const update = () => {
      const available = el.clientWidth;
      const next = Math.max(220, Math.min(available, 360));
      setPreviewWidth(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = previewWidth / 1080;

  return (
    <Card className="border-border/50 bg-card/80 overflow-hidden relative w-full min-w-0">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/10 pointer-events-none" />
      <CardHeader className="relative">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          Card Promocional
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Imagem 1080×1920 pronta para Instagram Stories e WhatsApp Status.
        </p>
      </CardHeader>

      <CardContent className="relative space-y-5 min-w-0 overflow-hidden px-4 sm:px-6">
        <div className="flex flex-col 2xl:flex-row gap-5 sm:gap-6 min-w-0 w-full overflow-hidden">
          {/* Preview */}
          <div
            ref={previewWrapperRef}
            className="flex justify-center 2xl:justify-start w-full max-w-[260px] sm:max-w-[300px] md:max-w-[340px] lg:max-w-[360px] 2xl:max-w-[320px] min-w-[220px] sm:min-w-[260px] 2xl:min-w-[320px] shrink-0 2xl:flex-none mx-auto 2xl:mx-0"
          >
            <div
              className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10 bg-black max-w-full shrink-0"
              style={{ width: previewWidth, height: previewWidth * (1920 / 1080), aspectRatio: '9 / 16' }}
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  width: 1080,
                  height: 1920,
                }}
              >
                <PromoCardArtwork
                  ref={cardRef}
                  coverUrl={coverUrl}
                  eventName={eventName || 'Nome do Evento'}
                  formattedDate={formattedDate}
                  location={location}
                  photographerName={photographerName}
                  qrDataUrl={qrDataUrl}
                  cta={CTA_OPTIONS[ctaIndex]}
                  overlay={overlay[0] / 100}
                  showQr={showQr}
                  eventUrl={eventUrl}
                />
              </div>
              {loadingCover && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 min-w-0 w-full space-y-4 2xl:min-w-[360px] 2xl:flex-1">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Frase de chamada</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-2 gap-2 min-w-0">
                {CTA_OPTIONS.map((opt, i) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCtaIndex(i)}
                    className={`w-full text-left text-xs leading-snug whitespace-normal break-normal px-3 sm:px-4 py-2.5 rounded-lg border transition-colors min-h-[48px] ${
                      i === ctaIndex
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border/50 bg-secondary/40 text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Intensidade do overlay</Label>
                <span className="text-xs font-mono text-foreground">{overlay[0]}%</span>
              </div>
              <Slider value={overlay} onValueChange={setOverlay} min={30} max={95} step={1} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/30">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="show-qr" className="text-sm cursor-pointer">Exibir QR Code</Label>
              </div>
              <Switch id="show-qr" checked={showQr} onCheckedChange={setShowQr} />
            </div>

            <Button
              onClick={handleDownload}
              disabled={generating || loadingCover}
              className="w-full h-auto min-h-[52px] px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-400 whitespace-normal text-center leading-snug"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="min-w-0 whitespace-normal leading-snug">Gerando card promocional...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  <span className="min-w-0 whitespace-normal leading-snug">Baixar Card (PNG 1080×1920)</span>
                </>
              )}
            </Button>

            {!coverUrl && !loadingCover && (
              <p className="text-xs text-amber-400/90 flex items-center gap-2">
                <Camera className="h-3.5 w-3.5" />
                Faça upload de pelo menos uma foto para usar como capa.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Artwork — rendered at real 1080×1920 size (scaled visually for preview)
interface ArtworkProps {
  coverUrl: string | null;
  eventName: string;
  formattedDate: string;
  location: string;
  photographerName: string;
  qrDataUrl: string;
  cta: string;
  overlay: number;
  showQr: boolean;
  eventUrl: string;
}

const PromoCardArtwork = forwardRef<HTMLDivElement, ArtworkProps>((props, ref) => {
  const {
    coverUrl, eventName, formattedDate, location, photographerName,
    qrDataUrl, cta, overlay, showQr, eventUrl,
  } = props;


    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#08080b',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          color: '#ffffff',
        }}
      >
        {/* Cover */}
        {coverUrl && (
          <img
            src={coverUrl}
            crossOrigin="anonymous"
            alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', filter: 'saturate(1.05)',
            }}
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(180deg, rgba(8,8,11,${overlay * 0.55}) 0%, rgba(8,8,11,${overlay * 0.35}) 35%, rgba(8,8,11,${Math.min(overlay + 0.05, 1)}) 100%)`,
          }}
        />

        {/* Subtle accent glow */}
        <div
          style={{
            position: 'absolute',
            top: -200, right: -200,
            width: 600, height: 600,
            background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Top brand bar */}
        <div
          style={{
            position: 'absolute', top: 60, left: 60, right: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 22px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#a855f7,#3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff',
            }}>F</div>
            <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: 0.5 }}>FotoPedido</span>
          </div>

          {formattedDate && (
            <div style={{
              padding: '12px 20px',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.15)',
              fontSize: 22, fontWeight: 500,
              backdropFilter: 'blur(12px)',
            }}>
              {formattedDate}
            </div>
          )}
        </div>

        {/* Bottom content */}
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '0 60px 80px 60px',
          }}
        >
          {/* CTA pill */}
          <div style={{
            display: 'inline-block',
            padding: '12px 24px',
            borderRadius: 999,
            background: 'rgba(168,85,247,0.25)',
            border: '1px solid rgba(168,85,247,0.5)',
            fontSize: 22, fontWeight: 600,
            letterSpacing: 1.5, textTransform: 'uppercase',
            marginBottom: 32,
            color: '#f3e8ff',
          }}>
            {cta}
          </div>

          {/* Event name */}
          <h1 style={{
            fontSize: 96,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: -2,
            margin: 0,
            marginBottom: 28,
            textShadow: '0 6px 30px rgba(0,0,0,0.55)',
          }}>
            {eventName}
          </h1>

          {/* Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 50 }}>
            {photographerName && (
              <div style={{ fontSize: 30, fontWeight: 500, opacity: 0.95 }}>
                por <span style={{ fontWeight: 700 }}>{photographerName}</span>
              </div>
            )}
            {location && (
              <div style={{ fontSize: 26, fontWeight: 400, opacity: 0.85 }}>
                📍 {location}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{
            height: 1, width: '100%',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)',
            marginBottom: 40,
          }} />

          {/* Footer row: QR + URL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {showQr && qrDataUrl && (
              <div style={{
                padding: 16,
                background: '#ffffff',
                borderRadius: 22,
                boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
              }}>
                <img src={qrDataUrl} width={180} height={180} alt="QR" style={{ display: 'block' }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 20, fontWeight: 600, letterSpacing: 3,
                opacity: 0.7, textTransform: 'uppercase', marginBottom: 8,
              }}>
                {showQr ? 'Aponte a câmera' : 'Acesse pelo link'}
              </div>
              <div style={{
                fontSize: 28, fontWeight: 600,
                wordBreak: 'break-all', lineHeight: 1.25,
              }}>
                {eventUrl.replace(/^https?:\/\//, '')}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
});
PromoCardArtwork.displayName = 'PromoCardArtwork';


export default EventPromoCard;