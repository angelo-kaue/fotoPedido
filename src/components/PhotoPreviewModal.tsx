import { useEffect, useState, useRef } from 'react';
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
  const [showHint, setShowHint] = useState(true);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [animating, setAnimating] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') navigateTo('left');
      if (e.key === 'ArrowRight') navigateTo('right');
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [currentIndex, photos.length, onClose, onNavigate]);

  // Auto-hide swipe hint after 3 seconds
  useEffect(() => {
    hintTimer.current = setTimeout(() => setShowHint(false), 3000);
    return () => clearTimeout(hintTimer.current);
  }, []);

  const navigateTo = (dir: 'left' | 'right') => {
    if (animating) return;
    const nextIndex = dir === 'right'
      ? (currentIndex + 1) % photos.length
      : (currentIndex - 1 + photos.length) % photos.length;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      onNavigate(nextIndex);
      setAnimating(false);
      setDirection(null);
    }, 150);
  };

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      navigateTo(diff > 0 ? 'right' : 'left');
    }
    setTouchStart(null);
  };

  const animClass = animating
    ? direction === 'right'
      ? 'opacity-0 -translate-x-4'
      : 'opacity-0 translate-x-4'
    : 'opacity-100 translate-x-0';

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col animate-fade-in"
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <span className="text-foreground font-mono text-sm bg-secondary px-3 py-1 rounded-full">{photo.photo_code}</span>
        <span className="text-muted-foreground text-sm">
          {currentIndex + 1} / {photos.length}
        </span>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-foreground hover:bg-secondary min-w-[44px] min-h-[44px]">
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Image area with arrows */}
      <div
        className="flex-1 flex items-center justify-center relative px-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left arrow — always visible on mobile & desktop */}
        <button
          onClick={() => navigateTo('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex w-11 h-11 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm text-foreground/70 hover:bg-background/80 hover:text-foreground active:scale-95 transition-all"
          aria-label="Foto anterior"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className={`transition-all duration-150 ease-in-out ${animClass}`}>
          <ProtectedImage
            src={getSignedUrl(photo.preview_path)}
            alt={`Foto ${photo.photo_code}`}
            watermarkText={watermarkText}
            className="max-h-[70vh] max-w-full object-contain rounded-xl"
          />
        </div>

        {/* Right arrow — always visible on mobile & desktop */}
        <button
          onClick={() => navigateTo('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex w-11 h-11 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm text-foreground/70 hover:bg-background/80 hover:text-foreground active:scale-95 transition-all"
          aria-label="Próxima foto"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Bottom bar */}
      <div className="p-4 pb-6 flex flex-col items-center gap-2">
        {/* Swipe hint — auto-hides */}
        {showHint && (
          <span className="text-muted-foreground/60 text-xs animate-fade-in transition-opacity">
            Arraste ou use as setas
          </span>
        )}
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
