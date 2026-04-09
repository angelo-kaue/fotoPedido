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
  getPublicUrl: (path: string) => string;
  watermarkText: string;
  defaultOpen: boolean;
  globalIndexOffset: number;
}

const TimeGroupSection = ({
  label,
  photos,
  selectedIds,
  onToggle,
  onPreview,
  getPublicUrl,
  watermarkText,
  defaultOpen,
  globalIndexOffset,
}: TimeGroupSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const selectedInGroup = photos.filter((p) => selectedIds.has(p.id)).length;

  return (
    <div className="mb-4" id={`time-group-${label}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-3 px-2 rounded-lg hover:bg-accent/50 transition-colors"
      >
        {open ? <ChevronDown className="h-5 w-5 text-primary" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
        <Clock className="h-4 w-4 text-primary" />
        <span className="font-semibold text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">
          ({photos.length} {photos.length === 1 ? 'foto' : 'fotos'})
        </span>
        {selectedInGroup > 0 && (
          <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {selectedInGroup} selecionadas
          </span>
        )}
      </button>

      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-2 transition-all">
          {photos.map((photo, i) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isSelected={selectedIds.has(photo.id)}
              onToggle={() => onToggle(photo.id)}
              onPreview={() => onPreview(globalIndexOffset + i)}
              getPublicUrl={getPublicUrl}
              watermarkText={watermarkText}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeGroupSection;
