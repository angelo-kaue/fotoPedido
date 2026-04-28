import { useState, useRef, useEffect } from 'react';
import { Heart, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ProtectedImage from './ProtectedImage';

interface PhotoCardProps {
  photo: {
    id: string;
    photo_code: string;
    thumbnail_path: string;
  };
  isSelected: boolean;
  onToggle: () => void;
  onPreview: () => void;
  signedUrl: string | null;
  watermarkText: string;
}

const PhotoCard = ({ photo, isSelected, onToggle, onPreview, signedUrl, watermarkText }: PhotoCardProps) => {
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`relative aspect-square rounded-md overflow-hidden bg-card group transition-all duration-300 ${
        isSelected
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.6)]'
          : 'ring-1 ring-[hsl(var(--hairline))] hover:ring-primary/40'
      }`}
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
    >
      {visible ? (
        <>
          <ProtectedImage
            src={signedUrl}
            alt={`Foto ${photo.photo_code}`}
            watermarkText={watermarkText}
            className="w-full h-full object-cover cursor-pointer"
            onClick={onPreview}
            onLoad={() => setLoaded(true)}
          />

          <div className="absolute top-2 left-2 bg-black/55 backdrop-blur-sm text-white/95 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sm pointer-events-none tracking-wider">
            {photo.photo_code}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`absolute bottom-2 right-2 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
              isSelected
                ? 'bg-primary text-primary-foreground scale-110 shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.7)]'
                : 'bg-black/60 backdrop-blur-sm text-white/90 hover:bg-black/80 hover:scale-110'
            }`}
          >
            {isSelected ? (
              <Check className="h-5 w-5 animate-scale-in" />
            ) : (
              <Heart className="h-5 w-5" />
            )}
          </button>

          {isSelected && (
            <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
          )}

          {!loaded && (
            <Skeleton className="absolute inset-0 rounded-none" />
          )}
        </>
      ) : (
        <Skeleton className="w-full h-full rounded-none" />
      )}
    </div>
  );
};

export default PhotoCard;