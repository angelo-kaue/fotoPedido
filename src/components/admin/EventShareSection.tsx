import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Download, Link2, Check } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

interface EventShareSectionProps {
  slug: string;
}

const PUBLISHED_URL = 'https://fotopedido.shop';

const EventShareSection = ({ slug }: EventShareSectionProps) => {
  const eventUrl = `${PUBLISHED_URL}/evento/${slug}`;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, eventUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#ffffff', light: '#00000000' },
      });
    }
  }, [eventUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link.');
    }
  };

  const handleDownloadQR = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(eventUrl, {
        width: 512,
        margin: 2,
        color: { dark: '#1e3a5f', light: '#ffffff' },
      });
      const link = document.createElement('a');
      link.download = `qrcode-${slug}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('QR Code baixado!');
    } catch {
      toast.error('Erro ao gerar QR Code.');
    }
  };

  return (
    <Card className="border-border/50 bg-card/80 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      <CardHeader className="relative">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Link2 className="h-4 w-4 text-primary" />
          </div>
          Compartilhar Evento
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* URL + Copy */}
        <div className="flex gap-2">
          <Input
            readOnly
            value={eventUrl}
            className="min-h-[44px] bg-secondary/50 border-border/50 text-sm font-mono truncate"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button
            onClick={handleCopy}
            variant="outline"
            className="min-h-[44px] min-w-[44px] border-border/50 hover:bg-primary/10 hover:border-primary/30 flex-shrink-0"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* QR Code Preview + Download */}
        <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/30">
          <div className="p-3 rounded-xl bg-background/50 border border-border/30 shadow-lg shadow-primary/5">
            <canvas ref={canvasRef} className="rounded-lg" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Compartilhe este QR Code com seus clientes
          </p>
          <Button
            onClick={handleDownloadQR}
            className="min-h-[44px] rounded-xl bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-400 w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar QR Code (PNG)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventShareSection;
