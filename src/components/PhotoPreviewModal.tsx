import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Photo {
  id: string;
  photo_code: string;
  preview_path: string;
}

interface PhotoPreviewModalProps {
  photos: Photo[];
  currentIndex: number;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onClose: () => void;
  onNavigate: (index: number) => void;
  getPublicUrl: (path: string) => string;
}

const PhotoPreviewModal = ({
  photos,
  currentIndex,
  selectedIds,
  onToggle,
  onClose,
  onNavigate,
  getPublicUrl,
}: PhotoPreviewModalProps) => {
  const photo = photos[currentIndex];
  const isSelected = selectedIds.has(photo.id);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) onNavigate(currentIndex + 1);
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [currentIndex, photos.length, onClose, onNavigate]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < photos.length - 1) onNavigate(currentIndex + 1);
      if (diff < 0 && currentIndex > 0) onNavigate(currentIndex - 1);
    }
    setTouchStart(null);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/95 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4">
        <span className="text-background font-mono text-sm">{photo.photo_code}</span>
        <span className="text-background/70 text-sm">
          {currentIndex + 1} / {photos.length}
        </span>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-background hover:text-background/80">
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center relative px-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-background/20 text-background hover:bg-background/30"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div className="relative max-w-full max-h-full">
          <img
            src={getPublicUrl(photo.preview_path)}
            alt={`Foto ${photo.photo_code}`}
            className="max-h-[70vh] max-w-full object-contain rounded-lg"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white/20 font-bold text-3xl rotate-[-30deg] tracking-widest">
              AMOSTRA
            </span>
          </div>
        </div>

        {currentIndex < photos.length - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-background/20 text-background hover:bg-background/30"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Bottom bar */}
      <div className="p-4 flex justify-center">
        <Button
          onClick={() => onToggle(photo.id)}
          className={`min-h-[48px] px-8 text-base ${
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'bg-background/20 text-background hover:bg-background/30'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="h-5 w-5 mr-2" /> Selecionada
            </>
          ) : (
            <>
              <Heart className="h-5 w-5 mr-2" /> Selecionar
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PhotoPreviewModal;
