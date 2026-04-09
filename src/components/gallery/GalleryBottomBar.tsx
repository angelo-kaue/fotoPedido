import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface GalleryBottomBarProps {
  selectedCount: number;
  totalPrice: number;
  slug: string;
}

const GalleryBottomBar = ({ selectedCount, totalPrice, slug }: GalleryBottomBarProps) => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">
            {selectedCount} {selectedCount === 1 ? 'foto' : 'fotos'}
          </span>
          {selectedCount > 0 && (
            <span className="text-sm text-muted-foreground">
              • R$ {totalPrice.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>
        <Button
          onClick={() => navigate(`/evento/${slug}/finalizar`)}
          disabled={selectedCount === 0}
          className="min-h-[44px] px-6"
        >
          Finalizar Seleção
        </Button>
      </div>
    </div>
  );
};

export default GalleryBottomBar;
