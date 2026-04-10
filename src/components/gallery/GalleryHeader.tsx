import { Camera, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface GalleryHeaderProps {
  eventName: string;
}

const GalleryHeader = ({ eventName }: GalleryHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-xl py-3">
      <div className="container mx-auto px-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="min-w-[44px] min-h-[44px]">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Camera className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground truncate">{eventName}</h1>
        </div>
      </div>
    </header>
  );
};

export default GalleryHeader;
