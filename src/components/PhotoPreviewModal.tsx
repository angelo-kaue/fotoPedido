import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProtectedImage from '@/components/gallery/ProtectedImage';

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
  getSignedUrl: (path: string) => string | null;
  watermarkText: string;
}

const PhotoPreviewModal = ({
  photos,
  currentIndex,
  selectedIds,
  onToggle,
  onClose,
  onNavigate,
  getSignedUrl,
  watermarkText,
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
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col animate-fade-in"
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
    >
      <div className="flex items-center justify-between p-4">
        <span className="text-foreground font-mono text-sm bg-secondary px-3 py-1 rounded-full">{photo.photo_code}</span>
        <span className="text-muted-foreground text-sm">
          {currentIndex + 1} / {photos.length}
        </span>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-foreground hover:bg-secondary min-w-[44px] min-h-[44px]">
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div
        className="flex-1 flex items-center justify-center relative px-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 hidden md:flex w-12 h-12 items-center justify-center rounded-full bg-secondary/80 text-foreground hover:bg-secondary transition-all"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <ProtectedImage
          src={getSignedUrl(photo.preview_path)}
          alt={`Foto ${photo.photo_code}`}
          watermarkText={watermarkText}
          className="max-h-[70vh] max-w-full object-contain rounded-xl"
        />

        {currentIndex < photos.length - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex w-12 h-12 items-center justify-center rounded-full bg-secondary/80 text-foreground hover:bg-secondary transition-all"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      <div className="p-4 pb-6 flex justify-center">
        <Button
          onClick={() => onToggle(photo.id)}
          className={`min-h-[52px] px-8 text-base rounded-xl font-semibold transition-all duration-200 ${
            isSelected
              ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
              : 'bg-secondary text-foreground hover:bg-secondary/80'
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
