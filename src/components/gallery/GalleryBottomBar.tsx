import { Heart, ArrowRight } from 'lucide-react';
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-foreground text-sm">
              {selectedCount} {selectedCount === 1 ? 'foto' : 'fotos'}
            </span>
            {selectedCount > 0 && (
              <p className="text-xs text-muted-foreground font-medium">
                R$ {totalPrice.toFixed(2).replace('.', ',')}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={() => navigate(`/evento/${slug}/finalizar`)}
          disabled={selectedCount === 0}
          className="min-h-[48px] px-6 font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all duration-200 rounded-xl"
        >
          Finalizar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default GalleryBottomBar;
