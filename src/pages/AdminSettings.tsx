import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Lock } from 'lucide-react';
import { toast } from 'sonner';

const AdminSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [form, setForm] = useState({
    photographer_name: '',
    whatsapp_number: '',
    default_price_per_photo: '15.00',
    watermark_text: 'AMOSTRA',
  });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('photographer_settings')
        .select('*')
        .limit(1)
        .single();

      if (data) {
        setSettingsId(data.id);
        setForm({
          photographer_name: data.photographer_name,
          whatsapp_number: data.whatsapp_number,
          default_price_per_photo: String(data.default_price_per_photo),
          watermark_text: data.watermark_text,
        });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const formatWhatsapp = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleSave = async () => {
    const cleanWa = form.whatsapp_number.replace(/\D/g, '');
    if (cleanWa.length < 10 || cleanWa.length > 11) {
      toast.error('Número de WhatsApp inválido.');
      return;
    }

    setSaving(true);
    try {
      if (settingsId) {
        const { error } = await supabase
          .from('photographer_settings')
          .update({
            photographer_name: form.photographer_name,
            whatsapp_number: cleanWa,
            default_price_per_photo: parseFloat(form.default_price_per_photo),
            watermark_text: form.watermark_text,
          })
          .eq('id', settingsId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('photographer_settings')
          .insert({
            photographer_name: form.photographer_name,
            whatsapp_number: cleanWa,
            default_price_per_photo: parseFloat(form.default_price_per_photo),
            watermark_text: form.watermark_text,
          });
        if (error) throw error;
      }
      toast.success('Configurações salvas!');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-xl py-4">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="hover:bg-primary/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Configurações</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-6">
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">Dados do Fotógrafo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nome / Empresa</label>
              <Input
                value={form.photographer_name}
                onChange={(e) => setForm((f) => ({ ...f, photographer_name: e.target.value }))}
                placeholder="Seu nome ou empresa"
                className="min-h-[48px] mt-1 bg-secondary/50 border-border/50 focus-visible:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">WhatsApp para receber pedidos</label>
              <Input
                type="tel"
                value={formatWhatsapp(form.whatsapp_number)}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp_number: e.target.value }))}
                placeholder="(11) 99999-9999"
                maxLength={16}
                className="min-h-[48px] mt-1 bg-secondary/50 border-border/50 focus-visible:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Os clientes serão direcionados a este número ao finalizar a seleção.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">Padrões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Preço padrão por foto (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={form.default_price_per_photo}
                onChange={(e) => setForm((f) => ({ ...f, default_price_per_photo: e.target.value }))}
                className="min-h-[48px] mt-1 bg-secondary/50 border-border/50 focus-visible:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Texto da marca d'água</label>
              <Input
                value={form.watermark_text}
                onChange={(e) => setForm((f) => ({ ...f, watermark_text: e.target.value }))}
                placeholder="AMOSTRA"
                className="min-h-[48px] mt-1 bg-secondary/50 border-border/50 focus-visible:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Exibido sobre as fotos na galeria pública.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full min-h-[48px] text-base bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-400 glow-primary">
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </main>
    </div>
  );
};

export default AdminSettings;
