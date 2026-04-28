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
  tenant_id: string;
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
      const { data: eventData } = await supabase
        .from('events')
        .select('id, name, slug, price_per_photo, tenant_id' as any)
        .eq('slug', slug)
        .eq('status', 'active')
        .single();

      if (!eventData) { navigate('/'); return; }
      const ev = eventData as unknown as Event;
      setEvent(ev);

      // Fetch the WhatsApp of the photographer (tenant) who owns this event
      const { data: settings } = await supabase
        .from('photographer_settings')
        .select('whatsapp_number')
        .eq('tenant_id', ev.tenant_id)
        .maybeSingle();
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
        } as any)
        .select('id')
        .single();
      if (selError) throw selError;
      if (!selection?.id) throw new Error('Falha ao criar selecao');

      const photoRows = selectedPhotos.map((p) => ({ selection_id: selection.id, photo_id: p.id }));
      const { error: photosError } = await supabase.from('selection_photos').insert(photoRows as any);
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
        <Card className="w-full max-w-md text-center surface-premium">
          <CardContent className="p-10">
            <div className="w-20 h-20 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-6 animate-scale-in">
              <Check className="h-10 w-10 text-primary-soft" />
            </div>
            <h2 className="font-display text-3xl text-foreground mb-3">Seleção enviada</h2>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              {`Suas ${selectedPhotos.length} fotos foram registradas. O fotógrafo entrará em contato pelo WhatsApp.`}
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => { window.location.href = waUrl; }}
                variant="outline"
                className="w-full min-h-[48px] border-[hsl(var(--hairline))] hover:bg-secondary"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Abrir WhatsApp novamente
              </Button>
              <Button onClick={() => navigate('/')} variant="ghost" className="w-full min-h-[48px]">
                Voltar ao início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b hairline bg-background/85 backdrop-blur-xl py-4">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/evento/${slug}`)} className="hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-xl text-foreground leading-none">Finalizar seleção</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg space-y-5">
        <Card className="surface-premium">
          <CardHeader className="pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-soft">Resumo</p>
            <CardTitle className="font-display text-2xl text-foreground">Seu pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">Evento</p>
              <p className="font-display text-xl text-foreground mt-1">{event.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2">
                Fotos selecionadas ({selectedPhotos.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedPhotos.map((p) => (
                  <span key={p.id} className="bg-secondary text-foreground border hairline text-[11px] font-mono font-semibold px-2.5 py-1 rounded-sm tracking-wider">
                    {p.photo_code}
                  </span>
                ))}
              </div>
            </div>
            <div className="border-t hairline pt-4 flex justify-between items-end">
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.22em] font-semibold">Valor total</span>
              <span className="font-display text-4xl text-primary-soft leading-none">
                R$ {totalPrice.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-premium">
          <CardHeader className="pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-soft">Contato</p>
            <CardTitle className="font-display text-2xl text-foreground">Seus dados</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Para o fotógrafo entrar em contato.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Seu nome completo"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={100}
                className="min-h-[52px] text-base pl-10 bg-background border-[hsl(var(--hairline))] focus-visible:ring-primary"
              />
            </div>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={handleWhatsappChange}
                maxLength={16}
                className="min-h-[52px] text-base pl-10 bg-background border-[hsl(var(--hairline))] focus-visible:ring-primary"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={sending || getCleanWhatsapp().length < 10 || !customerName.trim()}
              className="w-full min-h-[52px] text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 ring-premium tracking-wide uppercase"
            >
              {sending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
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