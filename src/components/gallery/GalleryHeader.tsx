import { Camera, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface GalleryHeaderProps {
  eventName: string;
}

const GalleryHeader = ({ eventName }: GalleryHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur py-4">
      <div className="container mx-auto px-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Camera className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-bold text-foreground truncate">{eventName}</h1>
      </div>
    </header>
  );
};

export default GalleryHeader;
