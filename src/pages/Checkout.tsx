import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Send, Check, Loader2, MessageCircle, User } from 'lucide-react';
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

const buildWhatsAppUrl = (phone: string, message: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${fullPhone}?text=${encoded}`;
};

const buildMessage = (name: string, eventName: string, codes: string[], total: number, whatsapp: string): string => {
  const codeList = codes.join(', ');
  const price = `R$ ${total.toFixed(2).replace('.', ',')}`;
  return [
    `Ola! Gostaria de encomendar fotos do evento *${eventName}*.`,
    '',
    `Fotos selecionadas (${codes.length}):`,
    codeList,
    '',
    `Valor total: ${price}`,
    '',
    `Nome: ${name}`,
    `WhatsApp: ${whatsapp}`,
  ].join('\n');
};

const Checkout = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoCode[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [photographerWa, setPhotographerWa] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) return;
      const [{ data: eventData }, { data: settings }] = await Promise.all([
        supabase.from('events').select('id, name, slug, price_per_photo').eq('slug', slug).eq('status', 'active').single(),
        supabase.from('photographer_settings').select('whatsapp_number').limit(1).single(),
      ]);
      if (!eventData) { navigate('/'); return; }
      setEvent(eventData);
      if (settings?.whatsapp_number) setPhotographerWa(settings.whatsapp_number);

      const saved = localStorage.getItem(`selection_${slug}`);
      if (!saved) { navigate(`/evento/${slug}`); return; }
      const ids: string[] = JSON.parse(saved);
      if (ids.length === 0) { navigate(`/evento/${slug}`); return; }

      const { data: photos } = await supabase.from('event_photos').select('id, photo_code').in('id', ids);
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
    if (!customerName.trim()) { toast.error('Por favor, insira seu nome.'); return; }
    const cleanWa = getCleanWhatsapp();
    if (cleanWa.length < 10 || cleanWa.length > 11) {
      toast.error('Por favor, insira um numero de WhatsApp valido.');
      return;
    }
    if (!event) return;

    setSending(true);
    try {
      const { data: selection, error: selError } = await supabase
        .from('selections')
        .insert({
          event_id: event.id,
          whatsapp: cleanWa,
          customer_name: customerName.trim(),
          total_photos: selectedPhotos.length,
          total_price: totalPrice,
        })
        .select('id')
        .single();
      if (selError) throw selError;
      if (!selection?.id) throw new Error('Falha ao criar selecao');

      const photoRows = selectedPhotos.map((p) => ({ selection_id: selection.id, photo_id: p.id }));
      const { error: photosError } = await supabase.from('selection_photos').insert(photoRows);
      if (photosError) throw photosError;

      localStorage.removeItem(`selection_${slug}`);

      const codes = selectedPhotos.map((p) => p.photo_code);
      const message = buildMessage(customerName.trim(), event.name, codes, totalPrice, formatWhatsapp(cleanWa));

      const targetWa = photographerWa || cleanWa;
      const waUrl = buildWhatsAppUrl(targetWa, message);

      setSent(true);
      toast.success('Selecao salva com sucesso!');

      // Redirect immediately via location.href for mobile compatibility
      window.location.href = waUrl;
    } catch (error) {
      toast.error('Erro ao salvar selecao. Tente novamente.');
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
    const codes = selectedPhotos.map((p) => p.photo_code);
    const message = buildMessage(customerName.trim(), event.name, codes, totalPrice, formatWhatsapp(getCleanWhatsapp()));
    const targetWa = photographerWa || getCleanWhatsapp();
    const waUrl = buildWhatsAppUrl(targetWa, message);

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center shadow-xl border-border/50 bg-card/80">
          <CardContent className="p-8">
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-6 animate-scale-in glow-primary">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Selecao Enviada!</h2>
            <p className="text-muted-foreground mb-8">
              {`Suas ${selectedPhotos.length} fotos foram registradas. O fotografo entrara em contato pelo WhatsApp.`}
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => { window.location.href = waUrl; }}
                variant="outline"
                className="w-full min-h-[48px] border-border/50"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Abrir WhatsApp novamente
              </Button>
              <Button onClick={() => navigate('/')} variant="ghost" className="w-full min-h-[48px]">
                Voltar ao Inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/60 backdrop-blur-xl py-4">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/evento/${slug}`)} className="hover:bg-primary/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Finalizar Selecao</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-6">
        <Card className="shadow-lg border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Evento</p>
              <p className="font-semibold text-foreground text-lg">{event.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Fotos selecionadas ({selectedPhotos.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedPhotos.map((p) => (
                  <span key={p.id} className="bg-primary/15 text-primary text-xs font-mono px-2.5 py-1 rounded-full">
                    {p.photo_code}
                  </span>
                ))}
              </div>
            </div>
            <div className="border-t border-border/50 pt-4 flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Valor total</span>
              <span className="text-3xl font-bold text-primary">
                R$ {totalPrice.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Seus Dados</CardTitle>
            <p className="text-sm text-muted-foreground">Informe seus dados para o fotografo entrar em contato.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Seu nome completo"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={100}
                className="min-h-[52px] text-lg pl-10 bg-secondary/50 border-border/50 focus-visible:ring-primary"
              />
            </div>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={handleWhatsappChange}
                maxLength={16}
                className="min-h-[52px] text-lg pl-10 bg-secondary/50 border-border/50 focus-visible:ring-primary"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={sending || getCleanWhatsapp().length < 10 || !customerName.trim()}
              className="w-full min-h-[52px] text-base font-semibold bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-400 transition-all duration-200 shadow-lg glow-primary"
            >
              {sending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Enviar via WhatsApp
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Checkout;
