import { useEffect, useState, useRef } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ProofViewerModalProps {
  url: string;
  filename: string | null;
  fileType: 'image' | 'pdf';
  onClose: () => void;
}

const ProofViewerModal = ({ url, filename, fileType, onClose }: ProofViewerModalProps) => {
  const [zoom, setZoom] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 4));
      if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.5));
      if (e.key === '0') setZoom(1);
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom !== 1) return;
    setTouchStartY(e.touches[0].clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const diff = e.touches[0].clientY - touchStartY;
    if (diff > 0) setDragOffset(diff);
  };
  const handleTouchEnd = () => {
    if (dragOffset > 120) {
      onClose();
    } else {
      setDragOffset(0);
    }
    setTouchStartY(null);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col animate-fade-in"
      style={{
        transform: dragOffset ? `translateY(${dragOffset}px)` : undefined,
        opacity: dragOffset ? Math.max(1 - dragOffset / 400, 0.4) : 1,
        transition: touchStartY === null ? 'transform 200ms ease, opacity 200ms ease' : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b hairline bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 min-w-0">
          {fileType === 'pdf' && <FileText className="h-4 w-4 text-primary-soft shrink-0" />}
          <span className="text-sm text-foreground truncate font-medium">{filename || 'comprovante'}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {fileType === 'image' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="min-w-[40px] min-h-[40px]"
                aria-label="Diminuir zoom"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
                className="min-w-[40px] min-h-[40px]"
                aria-label="Aumentar zoom"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              {zoom !== 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(1)}
                  className="min-w-[40px] min-h-[40px]"
                  aria-label="Resetar zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              try {
                const res = await fetch(url);
                const blob = await res.blob();
                const obj = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = obj;
                a.download = filename || 'comprovante';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(obj), 1000);
              } catch {
                toast.error('Erro ao baixar comprovante.');
              }
            }}
            className="min-w-[40px] min-h-[40px]"
            aria-label="Baixar"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px]"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {!loaded && fileType === 'image' && (
          <Loader2 className="h-8 w-8 animate-spin text-primary absolute" />
        )}

        {fileType === 'image' ? (
          <img
            src={url}
            alt={filename || 'Comprovante'}
            onLoad={() => setLoaded(true)}
            onClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
            className="max-w-full max-h-full object-contain rounded-lg select-none transition-transform duration-200 cursor-zoom-in"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full max-w-4xl">
            <iframe
              src={url}
              title={filename || 'Comprovante PDF'}
              className="w-full h-[75vh] rounded-lg border hairline bg-card"
              onLoad={() => setLoaded(true)}
            />
          </div>
        )}
      </div>

      {/* Mobile hint */}
      <div className="md:hidden text-center text-[11px] text-muted-foreground pb-3">
        Arraste para baixo para fechar
      </div>
    </div>
  );
};

export default ProofViewerModal;