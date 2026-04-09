import { useState, useRef, useEffect } from 'react';
import { Heart, Check } from 'lucide-react';

interface PhotoCardProps {
  photo: {
    id: string;
    photo_code: string;
    thumbnail_path: string;
  };
  isSelected: boolean;
  onToggle: () => void;
  onPreview: () => void;
  getPublicUrl: (path: string) => string;
  watermarkText: string;
}

const PhotoCard = ({ photo, isSelected, onToggle, onPreview, getPublicUrl, watermarkText }: PhotoCardProps) => {
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
    <div ref={ref} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
      {visible && (
        <>
          <img
            src={getPublicUrl(photo.thumbnail_path)}
            alt={`Foto ${photo.photo_code}`}
            className={`w-full h-full object-cover cursor-pointer transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onClick={onPreview}
          />

          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-white/30 font-bold text-lg rotate-[-30deg] tracking-widest">
              {watermarkText}
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
            className={`absolute bottom-2 right-2 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
              isSelected
                ? 'bg-primary text-primary-foreground scale-110 shadow-lg'
                : 'bg-card/80 text-muted-foreground hover:bg-card'
            }`}
          >
            {isSelected ? <Check className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
          </button>

          {!loaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
        </>
      )}
      {!visible && <div className="w-full h-full bg-muted" />}
    </div>
  );
};

export default PhotoCard;
