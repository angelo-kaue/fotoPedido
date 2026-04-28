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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-xl border-t hairline shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full border hairline flex items-center justify-center bg-card">
            <Heart className={`h-4 w-4 ${selectedCount > 0 ? 'text-primary-soft fill-current' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0">
            <span className="font-display text-base text-foreground leading-none">
              {selectedCount} {selectedCount === 1 ? 'foto' : 'fotos'}
            </span>
            {selectedCount > 0 && (
              <p className="text-[11px] text-primary-soft font-semibold uppercase tracking-[0.16em] mt-0.5">
                R$ {totalPrice.toFixed(2).replace('.', ',')}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={() => navigate(`/evento/${slug}/finalizar`)}
          disabled={selectedCount === 0}
          className="min-h-[48px] px-6 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 rounded-md tracking-wide ring-premium"
        >
          Finalizar pedido
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default GalleryBottomBar;