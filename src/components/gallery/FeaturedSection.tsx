import { useMemo } from 'react';
import { Flame, Star } from 'lucide-react';
import ProtectedImage from './ProtectedImage';

interface Photo {
  id: string;
  photo_code: string;
  thumbnail_path: string;
}

interface FeaturedSectionProps {
  photos: Photo[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onPreview: (index: number) => void;
  getSignedUrl: (path: string) => string | null;
  watermarkText: string;
  allPhotosIndexMap: Map<string, number>;
}

const FeaturedSection = ({
  photos,
  selectedIds,
  onToggle,
  onPreview,
  getSignedUrl,
  watermarkText,
  allPhotosIndexMap,
}: FeaturedSectionProps) => {
  const featured = useMemo(() => {
    // Show up to 8 random photos as "featured"
    const shuffled = [...photos].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(8, photos.length));
  }, [photos]);

  if (photos.length < 6) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <Flame className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-base font-bold text-foreground">Fotos em destaque</h2>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
        {featured.map((photo) => {
          const isSelected = selectedIds.has(photo.id);
          const globalIndex = allPhotosIndexMap.get(photo.id) ?? 0;
          return (
            <div
              key={photo.id}
              className={`relative flex-shrink-0 w-36 h-36 sm:w-44 sm:h-44 rounded-xl overflow-hidden cursor-pointer snap-start transition-all duration-300 ${
                isSelected
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background glow-primary'
                  : 'hover:scale-105'
              }`}
              onClick={() => onPreview(globalIndex)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <ProtectedImage
                src={getSignedUrl(photo.thumbnail_path)}
                alt={`Foto ${photo.photo_code}`}
                watermarkText={watermarkText}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/80 to-transparent p-2">
                <span className="text-xs font-mono text-foreground/90">{photo.photo_code}</span>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Star className="h-3.5 w-3.5 text-primary-foreground fill-current" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedSection;
