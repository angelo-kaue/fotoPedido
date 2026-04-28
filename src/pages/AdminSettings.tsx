import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Lock } from 'lucide-react';
import { toast } from 'sonner';

const AdminSettings = () => {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
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
    if (!tenantId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('photographer_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

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
  }, [tenantId]);

  const formatWhatsapp = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleSave = async () => {
    if (!tenantId) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }
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
        const { data, error } = await supabase
          .from('photographer_settings')
          .insert({
            tenant_id: tenantId,
            photographer_name: form.photographer_name,
            whatsapp_number: cleanWa,
            default_price_per_photo: parseFloat(form.default_price_per_photo),
            watermark_text: form.watermark_text,
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        if (data?.id) setSettingsId(data.id);
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
      <header className="border-b hairline bg-background/85 backdrop-blur-xl py-4">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-xl text-foreground leading-none">Configurações</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg space-y-5">
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-soft mb-2">Conta</p>
          <h2 className="font-display text-3xl text-foreground leading-tight">Identidade do estúdio</h2>
        </div>

        <Card className="surface-premium">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Dados do fotógrafo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Nome / Empresa</label>
              <Input
                value={form.photographer_name}
                onChange={(e) => setForm((f) => ({ ...f, photographer_name: e.target.value }))}
                placeholder="Seu nome ou empresa"
                className="min-h-[48px] mt-1.5 bg-background border-[hsl(var(--hairline))] focus-visible:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">WhatsApp para receber pedidos</label>
              <Input
                type="tel"
                value={formatWhatsapp(form.whatsapp_number)}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp_number: e.target.value }))}
                placeholder="(11) 99999-9999"
                maxLength={16}
                className="min-h-[48px] mt-1.5 bg-background border-[hsl(var(--hairline))] focus-visible:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Os clientes serão direcionados a este número ao finalizar a seleção.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-premium">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Padrões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Preço padrão por foto (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={form.default_price_per_photo}
                onChange={(e) => setForm((f) => ({ ...f, default_price_per_photo: e.target.value }))}
                className="min-h-[48px] mt-1.5 bg-background border-[hsl(var(--hairline))] focus-visible:ring-primary"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="surface-premium relative overflow-hidden">
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[hsl(var(--warning))]/12 text-[hsl(var(--warning))] text-[10px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1 rounded-sm border border-[hsl(var(--warning))]/30">
            <Lock className="h-3 w-3" />
            Premium
          </div>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Marca d'água</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Texto da marca d'água</label>
              <Input
                value={form.watermark_text}
                disabled
                className="min-h-[48px] mt-1.5 bg-secondary/30 border-[hsl(var(--hairline))] opacity-60 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Personalização da marca d'água disponível no plano <span className="text-[hsl(var(--warning))] font-semibold">Premium</span>.
            </p>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full min-h-[48px] text-xs font-semibold uppercase tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 ring-premium">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </Button>
      </main>
    </div>
  );
};

export default AdminSettings;