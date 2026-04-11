import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowUp, ImageOff, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignedUrls } from '@/hooks/useSignedUrls';
import GalleryHeader from '@/components/gallery/GalleryHeader';
import GalleryFilters from '@/components/gallery/GalleryFilters';
import GalleryBottomBar from '@/components/gallery/GalleryBottomBar';
import TimeGroupSection from '@/components/gallery/TimeGroupSection';
import PhotoPreviewModal from '@/components/PhotoPreviewModal';
import PhotoCardComponent from '@/components/gallery/PhotoCard';
import FeaturedSection from '@/components/gallery/FeaturedSection';
import { Skeleton } from '@/components/ui/skeleton';

interface Photo {
  id: string;
  photo_code: string;
  thumbnail_path: string;
  preview_path: string;
  captured_at: string | null;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  price_per_photo: number;
}

const BATCH_SIZE = 200;

function getTimeGroupLabel(capturedAt: string | null): string {
  if (!capturedAt) return 'Sem horário';
  try {
    const date = new Date(capturedAt);
    if (isNaN(date.getTime())) return 'Sem horário';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const h = String(date.getHours()).padStart(2, '0');
    return `${day}/${month}/${year} - ${h}:00`;
  } catch {
    return 'Sem horário';
  }
}

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
  const [searchCode, setSearchCode] = useState('');
  const [selectedTimeGroup, setSelectedTimeGroup] = useState('all');
  const [showSelected, setShowSelected] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const { getSignedUrl, fetchSignedUrls } = useSignedUrls();

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (slug) {
      const saved = localStorage.getItem(`selection_${slug}`);
      if (saved) { try { setSelectedIds(new Set(JSON.parse(saved))); } catch {} }
    }
  }, [slug]);

  useEffect(() => {
    if (slug && selectedIds.size > 0) {
      localStorage.setItem(`selection_${slug}`, JSON.stringify([...selectedIds]));
    }
  }, [selectedIds, slug]);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) return;
      const [{ data }, { data: settings }] = await Promise.all([
        supabase.from('events').select('id, name, slug, price_per_photo').eq('slug', slug).eq('status', 'active').single(),
        supabase.from('photographer_settings').select('watermark_text').limit(1).single(),
      ]);
      if (data) { setEvent(data); } else { navigate('/'); toast.error('Evento não encontrado'); }
      if (settings?.watermark_text) setWatermarkText(settings.watermark_text);
    };
    fetchEvent();
  }, [slug, navigate]);

  const fetchPhotos = useCallback(async () => {
    if (!event) return;
    const from = page * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;
    const { data } = await supabase
      .from('event_photos')
      .select('id, photo_code, thumbnail_path, preview_path, captured_at')
      .eq('event_id', event.id)
      .order('captured_at', { ascending: true })
      .order('sort_order')
      .range(from, to);
    if (data) {
      setPhotos((prev) => page === 0 ? data : [...prev, ...data]);
      setHasMore(data.length === BATCH_SIZE);
      fetchSignedUrls(data.flatMap((p) => [p.thumbnail_path, p.preview_path]));
    }
    setLoading(false);
  }, [event, page, fetchSignedUrls]);

  useEffect(() => { if (event) fetchPhotos(); }, [event, fetchPhotos]);

  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !loading && hasMore) setPage((p) => p + 1); },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const parseCodeRange = (input: string): { start: string; end: string } | null => {
    const cleaned = input.replace(/#/g, '').trim();
    const match = cleaned.match(/^([A-Z]\d{3})\s*[-–]\s*([A-Z]\d{3})$/i);
    if (!match) return null;
    return { start: match[1].toUpperCase(), end: match[2].toUpperCase() };
  };

  const filteredPhotos = useMemo(() => {
    let result = photos;
    if (searchCode.trim()) {
      const range = parseCodeRange(searchCode);
      if (range) {
        result = result.filter((p) => { const code = p.photo_code.replace('#', ''); return code >= range.start && code <= range.end; });
      } else {
        const q = searchCode.replace('#', '').toLowerCase();
        result = result.filter((p) => p.photo_code.toLowerCase().includes(q));
      }
    }
    if (showSelected) result = result.filter((p) => selectedIds.has(p.id));
    if (selectedTimeGroup !== 'all') result = result.filter((p) => getTimeGroupLabel(p.captured_at) === selectedTimeGroup);
    return result;
  }, [photos, searchCode, showSelected, selectedTimeGroup, selectedIds]);

  const timeGroups = useMemo(() => {
    const groups = new Map<string, Photo[]>();
    filteredPhotos.forEach((photo) => {
      const label = getTimeGroupLabel(photo.captured_at);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(photo);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPhotos]);

  const allTimeGroupLabels = useMemo(() => {
    const labels = new Set<string>();
    photos.forEach((p) => labels.add(getTimeGroupLabel(p.captured_at)));
    return Array.from(labels).sort();
  }, [photos]);

  const allPhotosIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    filteredPhotos.forEach((p, i) => map.set(p.id, i));
    return map;
  }, [filteredPhotos]);

  const showFeatured = !searchCode.trim() && selectedTimeGroup === 'all' && !showSelected;

  if (loading && photos.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <GalleryHeader eventName="" />
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <GalleryHeader eventName={event?.name || ''} />
      <GalleryFilters
        searchCode={searchCode}
        onSearchChange={setSearchCode}
        timeGroups={allTimeGroupLabels}
        selectedTimeGroup={selectedTimeGroup}
        onTimeGroupChange={setSelectedTimeGroup}
        showSelected={showSelected}
        onToggleShowSelected={() => setShowSelected(!showSelected)}
        selectedCount={selectedIds.size}
      />

      <main className="container mx-auto px-3 py-4">
        {showFeatured && filteredPhotos.length > 0 && (
          <FeaturedSection
            photos={filteredPhotos}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
            onPreview={setPreviewIndex}
            getSignedUrl={getSignedUrl}
            watermarkText={watermarkText}
            allPhotosIndexMap={allPhotosIndexMap}
          />
        )}

        {filteredPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              {selectedIds.size === 0 && showSelected ? (
                <Heart className="h-8 w-8 text-muted-foreground" />
              ) : (
                <ImageOff className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {showSelected && selectedIds.size === 0
                ? 'Nenhuma foto selecionada ainda'
                : photos.length === 0 ? 'Nenhuma foto disponível' : 'Nenhuma foto encontrada'}
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              {showSelected && selectedIds.size === 0
                ? 'Toque nas fotos para escolher suas favoritas.'
                : photos.length === 0
                  ? 'As fotos deste evento ainda não foram publicadas.'
                  : 'Tente ajustar os filtros ou buscar por outro código.'}
            </p>
          </div>
        ) : timeGroups.length <= 1 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredPhotos.map((photo, index) => (
              <PhotoCardComponent
                key={photo.id}
                photo={photo}
                isSelected={selectedIds.has(photo.id)}
                onToggle={() => toggleSelect(photo.id)}
                onPreview={() => setPreviewIndex(index)}
                signedUrl={getSignedUrl(photo.thumbnail_path)}
                watermarkText={watermarkText}
              />
            ))}
          </div>
        ) : (
          (() => {
            let offset = 0;
            return timeGroups.map(([label, groupPhotos], gi) => {
              const currentOffset = offset;
              offset += groupPhotos.length;
              return (
                <TimeGroupSection
                  key={label}
                  label={label}
                  photos={groupPhotos}
                  selectedIds={selectedIds}
                  onToggle={toggleSelect}
                  onPreview={setPreviewIndex}
                  getSignedUrl={getSignedUrl}
                  watermarkText={watermarkText}
                  defaultOpen={gi === 0}
                  globalIndexOffset={currentOffset}
                />
              );
            });
          })()
        )}

        <div ref={loaderRef} className="py-8 flex justify-center">
          {hasMore && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />}
        </div>
      </main>

      {showScrollTop && (
        <Button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-4 z-50 rounded-full w-12 h-12 shadow-lg glow-primary"
          size="icon"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      <GalleryBottomBar
        selectedCount={selectedIds.size}
        totalPrice={selectedIds.size * (event?.price_per_photo || 0)}
        slug={slug || ''}
      />

      {previewIndex !== null && (
        <PhotoPreviewModal
          photos={filteredPhotos}
          currentIndex={previewIndex}
          selectedIds={selectedIds}
          onToggle={toggleSelect}
          onClose={() => setPreviewIndex(null)}
          onNavigate={setPreviewIndex}
          getSignedUrl={getSignedUrl}
          watermarkText={watermarkText}
        />
      )}
    </div>
  );
};

export default EventGallery;
