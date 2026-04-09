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
    <div className="sticky top-[65px] z-30 bg-background/95 backdrop-blur border-b py-3">
      <div className="container mx-auto px-2 space-y-2">
        <div className="flex gap-2">
          {/* Search by code */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchCode}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar código (#A123 ou A001–A200)"
              className="pl-9 min-h-[44px]"
            />
          </div>

          {/* Time filter */}
          {timeGroups.length > 1 && (
            <Select value={selectedTimeGroup} onValueChange={onTimeGroupChange}>
              <SelectTrigger className="w-[140px] min-h-[44px]">
                <Clock className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Horário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {timeGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Show selected filter */}
        <div className="flex gap-2">
          <Button
            variant={showSelected ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleShowSelected}
            className="min-h-[36px]"
          >
            <Heart className="h-4 w-4 mr-1" />
            {showSelected ? 'Mostrando selecionadas' : `Selecionadas (${selectedCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GalleryFilters;
