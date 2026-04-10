import { Search, Clock, Heart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GalleryFiltersProps {
  searchCode: string;
  onSearchChange: (val: string) => void;
  timeGroups: string[];
  selectedTimeGroup: string;
  onTimeGroupChange: (val: string) => void;
  showSelected: boolean;
  onToggleShowSelected: () => void;
  selectedCount: number;
}

const GalleryFilters = ({
  searchCode,
  onSearchChange,
  timeGroups,
  selectedTimeGroup,
  onTimeGroupChange,
  showSelected,
  onToggleShowSelected,
  selectedCount,
}: GalleryFiltersProps) => {
  return (
    <div className="sticky top-[57px] z-30 bg-background/80 backdrop-blur-xl border-b py-3">
      <div className="container mx-auto px-4 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchCode}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar código (#A123 ou A001–A200)"
              className="pl-9 min-h-[44px] rounded-xl bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>

          {timeGroups.length > 1 && (
            <Select value={selectedTimeGroup} onValueChange={onTimeGroupChange}>
              <SelectTrigger className="w-[160px] min-h-[44px] rounded-xl bg-muted/50 border-0">
                <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Horário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {timeGroups.map((group) => (
                  <SelectItem key={group} value={group}>{group}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button
          variant={showSelected ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleShowSelected}
          className={`min-h-[36px] rounded-full transition-all duration-200 ${
            showSelected ? 'shadow-md' : ''
          }`}
        >
          <Heart className={`h-3.5 w-3.5 mr-1.5 ${showSelected ? 'fill-current' : ''}`} />
          {showSelected ? 'Mostrando selecionadas' : `Selecionadas (${selectedCount})`}
        </Button>
      </div>
    </div>
  );
};

export default GalleryFilters;
