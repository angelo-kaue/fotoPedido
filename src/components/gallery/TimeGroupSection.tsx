import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import PhotoCard from './PhotoCard';

interface Photo {
  id: string;
  photo_code: string;
  thumbnail_path: string;
  preview_path: string;
  captured_at: string | null;
}

interface TimeGroupSectionProps {
  label: string;
  photos: Photo[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onPreview: (globalIndex: number) => void;
  getSignedUrl: (path: string) => string | null;
  watermarkText: string;
  defaultOpen: boolean;
  globalIndexOffset: number;
  allPhotosIndexMap?: Map<string, number>;
}

const TimeGroupSection = ({
  label,
  photos,
  selectedIds,
  onToggle,
  onPreview,
  getSignedUrl,
  watermarkText,
  defaultOpen,
  globalIndexOffset,
  allPhotosIndexMap,
}: TimeGroupSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const selectedInGroup = photos.filter((p) => selectedIds.has(p.id)).length;

  return (
    <div className="mb-6" id={`time-group-${label}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-secondary/50 transition-all duration-200 group"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${open ? 'bg-primary/15' : 'bg-secondary'}`}>
          {open ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
        <Clock className="h-4 w-4 text-primary" />
        <span className="font-semibold text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">
          ({photos.length} {photos.length === 1 ? 'foto' : 'fotos'})
        </span>
        {selectedInGroup > 0 && (
          <span className="ml-auto text-xs bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full font-medium">
            {selectedInGroup} selecionadas
          </span>
        )}
      </button>

      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3 animate-fade-in">
          {photos.map((photo, i) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isSelected={selectedIds.has(photo.id)}
              onToggle={() => onToggle(photo.id)}
              onPreview={() => onPreview(allPhotosIndexMap?.get(photo.id) ?? (globalIndexOffset + i))}
              signedUrl={getSignedUrl(photo.thumbnail_path)}
              watermarkText={watermarkText}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeGroupSection;
