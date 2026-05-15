import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Lock, Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRef } from 'react';
import PushNotificationsCard from '@/components/admin/PushNotificationsCard';

const AdminSettings = () => {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrFileRef = useRef<HTMLInputElement>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [form, setForm] = useState({
    photographer_name: '',
    whatsapp_number: '',
    default_price_per_photo: '15.00',
    watermark_text: 'AMOSTRA',
    pix_key: '',
    pix_recipient_name: '',
    pix_qrcode_url: '',
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
          pix_key: (data as any).pix_key || '',
          pix_recipient_name: (data as any).pix_recipient_name || '',
          pix_qrcode_url: (data as any).pix_qrcode_url || '',
        });
      }
      setLoading(false);
    };
    fetch();
  }, [tenantId]);

  const uploadQrCode = async (file: File) => {
    if (!tenantId) { toast.error('Sessão inválida.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Use uma imagem JPG, PNG ou WEBP.'); return;
    }
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB.'); return; }
    setUploadingQr(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `${tenantId}/qrcode-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('pix-qrcodes')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('pix-qrcodes').getPublicUrl(path);
      setForm((f) => ({ ...f, pix_qrcode_url: pub.publicUrl }));
      toast.success('QR Code enviado! Lembre-se de salvar.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar QR Code.');
    } finally {
      setUploadingQr(false);
      if (qrFileRef.current) qrFileRef.current.value = '';
    }
  };

  const removeQrCode = () => {
    setForm((f) => ({ ...f, pix_qrcode_url: '' }));
    toast.info('QR Code removido. Salve para confirmar.');
  };

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
            pix_key: form.pix_key,
            pix_recipient_name: form.pix_recipient_name,
            pix_qrcode_url: form.pix_qrcode_url,
          } as any)
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
            pix_key: form.pix_key,
            pix_recipient_name: form.pix_recipient_name,
            pix_qrcode_url: form.pix_qrcode_url,
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

        <PushNotificationsCard />

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

        <Card className="surface-premium">
          <CardHeader>
            <CardTitle className="font-display text-2xl">PIX</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Usado em eventos com modo de pagamento PIX manual.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Chave PIX</label>
              <Input
                value={form.pix_key}
                onChange={(e) => setForm((f) => ({ ...f, pix_key: e.target.value }))}
                placeholder="CPF, e-mail, telefone ou aleatória"
                className="min-h-[48px] mt-1.5 bg-background border-[hsl(var(--hairline))] focus-visible:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Nome do recebedor</label>
              <Input
                value={form.pix_recipient_name}
                onChange={(e) => setForm((f) => ({ ...f, pix_recipient_name: e.target.value }))}
                placeholder="Nome que aparece no PIX"
                className="min-h-[48px] mt-1.5 bg-background border-[hsl(var(--hairline))] focus-visible:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">QR Code do PIX</label>
              <input
                ref={qrFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQrCode(f); }}
              />
              {form.pix_qrcode_url ? (
                <div className="mt-2 rounded-md border hairline bg-card p-3 flex items-center gap-3">
                  <img
                    src={form.pix_qrcode_url}
                    alt="QR Code PIX"
                    className="w-20 h-20 object-contain rounded bg-background border hairline"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                  <div className="flex-1 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => qrFileRef.current?.click()}
                      disabled={uploadingQr}
                      className="min-h-[40px] justify-start"
                    >
                      {uploadingQr ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : <><Upload className="h-4 w-4 mr-2" /> Substituir</>}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeQrCode}
                      className="min-h-[40px] justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4 mr-2" /> Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => qrFileRef.current?.click()}
                  disabled={uploadingQr}
                  className="mt-2 w-full min-h-[120px] rounded-md border-2 border-dashed border-[hsl(var(--hairline))] bg-card/50 hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
                >
                  {uploadingQr ? (
                    <><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="text-xs">Enviando QR Code...</span></>
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6" />
                      <span className="text-xs font-medium">Toque para enviar QR Code</span>
                      <span className="text-[10px]">JPG, PNG ou WEBP · até 5MB</span>
                    </>
                  )}
                </button>
              )}
              <details className="mt-3">
                <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">Avançado: usar URL externa</summary>
                <Input
                  value={form.pix_qrcode_url}
                  onChange={(e) => setForm((f) => ({ ...f, pix_qrcode_url: e.target.value }))}
                  placeholder="https://..."
                  className="min-h-[44px] mt-2 bg-background border-[hsl(var(--hairline))] focus-visible:ring-primary text-xs"
                />
              </details>
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