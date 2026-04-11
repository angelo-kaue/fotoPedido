import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import logoFotoPedido from '@/assets/logo-fotopedido.png';

interface GalleryHeaderProps {
  eventName: string;
}

const GalleryHeader = ({ eventName }: GalleryHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-card/60 backdrop-blur-xl py-3">
      <div className="container mx-auto px-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="min-w-[44px] min-h-[44px] hover:bg-primary/10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <img src={logoFotoPedido} alt="" width={32} height={32} className="w-8 h-8 rounded-lg flex-shrink-0" loading="lazy" />
          <h1 className="text-lg font-bold text-foreground truncate">{eventName}</h1>
        </div>
      </div>
    </header>
  );
};

export default GalleryHeader;
