import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Check, Camera, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PhotoPreviewModal from '@/components/PhotoPreviewModal';

interface Photo {
  id: string;
  photo_code: string;
  thumbnail_path: string;
  preview_path: string;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  price_per_photo: number;
}

const BATCH_SIZE = 50;

const EventGallery = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [watermarkText, setWatermarkText] = useState('AMOSTRA');
  const loaderRef = useRef<HTMLDivElement>(null);

  // Load selections from localStorage
  useEffect(() => {
    if (slug) {
      const saved = localStorage.getItem(`selection_${slug}`);
      if (saved) {
        try {
          setSelectedIds(new Set(JSON.parse(saved)));
        } catch {}
      }
    }
  }, [slug]);

  // Save selections to localStorage
  useEffect(() => {
    if (slug && selectedIds.size > 0) {
      localStorage.setItem(`selection_${slug}`, JSON.stringify([...selectedIds]));
    }
  }, [selectedIds, slug]);

  // Fetch event
  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) return;
      const [{ data }, { data: settings }] = await Promise.all([
        supabase.from('events').select('id, name, slug, price_per_photo').eq('slug', slug).eq('status', 'active').single(),
        supabase.from('photographer_settings').select('watermark_text').limit(1).single(),
      ]);
      if (data) {
        setEvent(data);
      } else {
        navigate('/');
        toast.error('Evento não encontrado');
      }
      if (settings?.watermark_text) setWatermarkText(settings.watermark_text);
    };
    fetchEvent();
  }, [slug, navigate]);

  // Fetch photos with pagination
  const fetchPhotos = useCallback(async () => {
    if (!event) return;
    const from = page * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;

    const { data } = await supabase
      .from('event_photos')
      .select('id, photo_code, thumbnail_path, preview_path')
      .eq('event_id', event.id)
      .order('sort_order')
      .range(from, to);

    if (data) {
      setPhotos((prev) => page === 0 ? data : [...prev, ...data]);
      setHasMore(data.length === BATCH_SIZE);
    }
    setLoading(false);
  }, [event, page]);

  useEffect(() => {
    if (event) fetchPhotos();
  }, [event, fetchPhotos]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('event-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  if (loading && photos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur py-4">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Camera className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold text-foreground truncate">{event?.name}</h1>
        </div>
      </header>

      {/* Photo Grid */}
      <main className="container mx-auto px-2 py-4">
        {photos.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            Nenhuma foto disponível neste evento ainda.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {photos.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                isSelected={selectedIds.has(photo.id)}
                onToggle={() => toggleSelect(photo.id)}
                onPreview={() => setPreviewIndex(index)}
                getPublicUrl={getPublicUrl}
              />
            ))}
          </div>
        )}

        {/* Infinite scroll loader */}
        <div ref={loaderRef} className="py-8 flex justify-center">
          {hasMore && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          )}
        </div>
      </main>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? 'foto' : 'fotos'}
            </span>
            {event && selectedIds.size > 0 && (
              <span className="text-sm text-muted-foreground">
                • R$ {(selectedIds.size * event.price_per_photo).toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>
          <Button
            onClick={() => navigate(`/evento/${slug}/finalizar`)}
            disabled={selectedIds.size === 0}
            className="min-h-[44px] px-6"
          >
            Finalizar Seleção
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      {previewIndex !== null && (
        <PhotoPreviewModal
          photos={photos}
          currentIndex={previewIndex}
          selectedIds={selectedIds}
          onToggle={toggleSelect}
          onClose={() => setPreviewIndex(null)}
          onNavigate={setPreviewIndex}
          getPublicUrl={getPublicUrl}
        />
      )}
    </div>
  );
};

interface PhotoCardProps {
  photo: Photo;
  isSelected: boolean;
  onToggle: () => void;
  onPreview: () => void;
  getPublicUrl: (path: string) => string;
}

const PhotoCard = ({ photo, isSelected, onToggle, onPreview, getPublicUrl }: PhotoCardProps) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
      {/* Lazy loaded image */}
      <img
        src={getPublicUrl(photo.thumbnail_path)}
        alt={`Foto ${photo.photo_code}`}
        className={`w-full h-full object-cover cursor-pointer transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onClick={onPreview}
      />

      {/* Watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        onClick={onPreview}
      >
        <span className="text-white/30 font-bold text-lg rotate-[-30deg] tracking-widest">
          AMOSTRA
        </span>
      </div>

      {/* Photo code badge */}
      <div className="absolute top-2 left-2 bg-foreground/70 text-background text-xs font-mono px-2 py-0.5 rounded">
        {photo.photo_code}
      </div>

      {/* Select button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
          isSelected
            ? 'bg-primary text-primary-foreground scale-110'
            : 'bg-card/80 text-muted-foreground hover:bg-card'
        }`}
      >
        {isSelected ? <Check className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
      </button>

      {/* Loading skeleton */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
};

export default EventGallery;
