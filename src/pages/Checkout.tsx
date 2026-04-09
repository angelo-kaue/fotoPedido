import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Send, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Event {
  id: string;
  name: string;
  slug: string;
  price_per_photo: number;
}

interface PhotoCode {
  id: string;
  photo_code: string;
}

const Checkout = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoCode[]>([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from('events')
        .select('id, name, slug, price_per_photo')
        .eq('slug', slug)
        .eq('status', 'active')
        .single();
      if (!data) {
        navigate('/');
        return;
      }
      setEvent(data);

      // Get selected IDs from localStorage
      const saved = localStorage.getItem(`selection_${slug}`);
      if (!saved) {
        navigate(`/evento/${slug}`);
        return;
      }
      const ids: string[] = JSON.parse(saved);
      if (ids.length === 0) {
        navigate(`/evento/${slug}`);
        return;
      }

      const { data: photos } = await supabase
        .from('event_photos')
        .select('id, photo_code')
        .in('id', ids);
      setSelectedPhotos(photos || []);
    };
    fetchEvent();
  }, [slug, navigate]);

  const formatWhatsapp = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsapp(e.target.value));
  };

  const getCleanWhatsapp = () => whatsapp.replace(/\D/g, '');

  const totalPrice = event ? selectedPhotos.length * event.price_per_photo : 0;

  const handleSubmit = async () => {
    const cleanWa = getCleanWhatsapp();
    if (cleanWa.length < 10 || cleanWa.length > 11) {
      toast.error('Por favor, insira um número de WhatsApp válido.');
      return;
    }
    if (!event) return;

    setSending(true);
    try {
      // Save selection to database
      const { data: selection, error: selError } = await supabase
        .from('selections')
        .insert({
          event_id: event.id,
          whatsapp: cleanWa,
          total_photos: selectedPhotos.length,
          total_price: totalPrice,
        })
        .select('id')
        .single();

      if (selError) {
        console.error('Error inserting selection:', selError);
        throw selError;
      }

      if (!selection?.id) {
        console.error('No selection ID returned after insert');
        throw new Error('Falha ao criar seleção: ID não retornado');
      }

      // Save selected photos
      const photoRows = selectedPhotos.map((p) => ({
        selection_id: selection.id,
        photo_id: p.id,
      }));
      const { error: photosError } = await supabase
        .from('selection_photos')
        .insert(photoRows);

      if (photosError) throw photosError;

      // Clear localStorage
      localStorage.removeItem(`selection_${slug}`);

      // Build WhatsApp message
      const codes = selectedPhotos.map((p) => p.photo_code).join(', ');
      const message = encodeURIComponent(
        `Olá! Gostaria de encomendar fotos do evento *${event.name}*.\n\n` +
        `📸 Fotos selecionadas (${selectedPhotos.length}):\n${codes}\n\n` +
        `💰 Valor total: R$ ${totalPrice.toFixed(2).replace('.', ',')}\n\n` +
        `📱 Meu WhatsApp: ${whatsapp}`
      );

      setSent(true);
      toast.success('Seleção salva com sucesso!');

      // Open WhatsApp
      setTimeout(() => {
        window.open(`https://wa.me/55${cleanWa}?text=${message}`, '_blank');
      }, 500);
    } catch (error) {
      toast.error('Erro ao salvar seleção. Tente novamente.');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  if (!event || selectedPhotos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Seleção Enviada!</h2>
            <p className="text-muted-foreground mb-6">
              Suas {selectedPhotos.length} fotos foram registradas. O fotógrafo entrará em contato pelo WhatsApp.
            </p>
            <Button onClick={() => navigate('/')} className="min-h-[44px]">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card py-4">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/evento/${slug}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Finalizar Seleção</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Evento</p>
              <p className="font-semibold text-foreground">{event.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fotos selecionadas ({selectedPhotos.length})</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedPhotos.map((p) => (
                  <span
                    key={p.id}
                    className="bg-primary/10 text-primary text-xs font-mono px-2 py-1 rounded"
                  >
                    {p.photo_code}
                  </span>
                ))}
              </div>
            </div>
            <div className="border-t pt-4 flex justify-between items-center">
              <span className="text-muted-foreground">Valor total</span>
              <span className="text-2xl font-bold text-foreground">
                R$ {totalPrice.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seu WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="tel"
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={handleWhatsappChange}
              maxLength={16}
              className="min-h-[48px] text-lg"
            />
            <Button
              onClick={handleSubmit}
              disabled={sending || getCleanWhatsapp().length < 10}
              className="w-full min-h-[48px] text-base"
            >
              <Send className="h-5 w-5 mr-2" />
              {sending ? 'Enviando...' : 'Enviar via WhatsApp'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Checkout;
