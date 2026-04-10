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
      className={`relative aspect-square rounded-xl overflow-hidden bg-card group transition-all duration-300 ${
        isSelected
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg glow-primary'
          : 'hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.02]'
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

          <div className="absolute top-2 left-2 bg-background/70 backdrop-blur-sm text-foreground text-xs font-mono px-2 py-0.5 rounded-full pointer-events-none">
            {photo.photo_code}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`absolute bottom-2 right-2 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
              isSelected
                ? 'bg-primary text-primary-foreground scale-110 shadow-lg glow-primary'
                : 'bg-card/70 backdrop-blur-sm text-muted-foreground hover:bg-card hover:scale-110'
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
