import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GalleryHeader from '@/components/gallery/GalleryHeader';
import GalleryFilters from '@/components/gallery/GalleryFilters';
import GalleryBottomBar from '@/components/gallery/GalleryBottomBar';
import TimeGroupSection from '@/components/gallery/TimeGroupSection';
import PhotoPreviewModal from '@/components/PhotoPreviewModal';

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

  // Track scroll for "back to top"
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load selections from localStorage
  useEffect(() => {
    if (slug) {
      const saved = localStorage.getItem(`selection_${slug}`);
      if (saved) {
        try { setSelectedIds(new Set(JSON.parse(saved))); } catch {}
      }
    }
  }, [slug]);

  // Save selections
  useEffect(() => {
    if (slug && selectedIds.size > 0) {
      localStorage.setItem(`selection_${slug}`, JSON.stringify([...selectedIds]));
    }
  }, [selectedIds, slug]);

  // Fetch event + settings
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
      .select('id, photo_code, thumbnail_path, preview_path, captured_at')
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

  // Infinite scroll
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
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('event-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  // Parse code range like "A001-A200" or "#A001–#A200"
  const parseCodeRange = (input: string): { start: string; end: string } | null => {
    const cleaned = input.replace(/#/g, '').trim();
    const match = cleaned.match(/^([A-Z]\d{3})\s*[-–]\s*([A-Z]\d{3})$/i);
    if (!match) return null;
    return { start: match[1].toUpperCase(), end: match[2].toUpperCase() };
  };

  // Filter photos
  const filteredPhotos = useMemo(() => {
    let result = photos;

    // Search filter
    if (searchCode.trim()) {
      const range = parseCodeRange(searchCode);
      if (range) {
        result = result.filter((p) => {
          const code = p.photo_code.replace('#', '');
          return code >= range.start && code <= range.end;
        });
      } else {
        const q = searchCode.replace('#', '').toLowerCase();
        result = result.filter((p) =>
          p.photo_code.toLowerCase().includes(q)
        );
      }
    }

    // Show selected only
    if (showSelected) {
      result = result.filter((p) => selectedIds.has(p.id));
    }

    // Time group filter
    if (selectedTimeGroup !== 'all') {
      result = result.filter((p) => getTimeGroupLabel(p.captured_at) === selectedTimeGroup);
    }

    return result;
  }, [photos, searchCode, showSelected, selectedTimeGroup, selectedIds]);

  // Group photos by hour
  const timeGroups = useMemo(() => {
    const groups = new Map<string, Photo[]>();
    
    filteredPhotos.forEach((photo) => {
      const label = getTimeGroupLabel(photo.captured_at);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(photo);
    });

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPhotos]);

  // All unique time group labels for the filter dropdown
  const allTimeGroupLabels = useMemo(() => {
    const labels = new Set<string>();
    photos.forEach((p) => labels.add(getTimeGroupLabel(p.captured_at)));
    return Array.from(labels).sort();
  }, [photos]);

  // Build flat filtered list for preview navigation
  const flatFiltered = filteredPhotos;

  if (loading && photos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
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

      <main className="container mx-auto px-2 py-4">
        {filteredPhotos.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            {photos.length === 0
              ? 'Nenhuma foto disponível neste evento ainda.'
              : 'Nenhuma foto encontrada com esses filtros.'}
          </p>
        ) : timeGroups.length <= 1 ? (
          /* No grouping needed — flat grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredPhotos.map((photo, index) => (
              <PhotoCardWrapper
                key={photo.id}
                photo={photo}
                index={index}
                selectedIds={selectedIds}
                onToggle={toggleSelect}
                onPreview={setPreviewIndex}
                getPublicUrl={getPublicUrl}
                watermarkText={watermarkText}
              />
            ))}
          </div>
        ) : (
          /* Time-grouped sections */
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
                  getPublicUrl={getPublicUrl}
                  watermarkText={watermarkText}
                  defaultOpen={gi === 0}
                  globalIndexOffset={currentOffset}
                />
              );
            });
          })()
        )}

        <div ref={loaderRef} className="py-8 flex justify-center">
          {hasMore && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          )}
        </div>
      </main>

      {/* Scroll to top */}
      {showScrollTop && (
        <Button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-4 z-50 rounded-full w-12 h-12 shadow-lg"
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
          photos={flatFiltered}
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

/* Helper: get time group label from a timestamp */
function getTimeGroupLabel(capturedAt: string | null): string {
  if (!capturedAt) return 'Sem horário';
  try {
    const date = new Date(capturedAt);
    if (isNaN(date.getTime())) return 'Sem horário';
    const h = date.getHours();
    const nextH = h + 1;
    return `${String(h).padStart(2, '0')}:00 – ${String(nextH).padStart(2, '0')}:00`;
  } catch {
    return 'Sem horário';
  }
}

/* Inline wrapper to avoid importing PhotoCard directly in this file */
import PhotoCardComponent from '@/components/gallery/PhotoCard';

function PhotoCardWrapper({
  photo,
  index,
  selectedIds,
  onToggle,
  onPreview,
  getPublicUrl,
  watermarkText,
}: {
  photo: Photo;
  index: number;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onPreview: (i: number) => void;
  getPublicUrl: (p: string) => string;
  watermarkText: string;
}) {
  return (
    <PhotoCardComponent
      photo={photo}
      isSelected={selectedIds.has(photo.id)}
      onToggle={() => onToggle(photo.id)}
      onPreview={() => onPreview(index)}
      getPublicUrl={getPublicUrl}
      watermarkText={watermarkText}
    />
  );
}

export default EventGallery;
