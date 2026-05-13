import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, Upload, Check, Clock, X, Download, Loader2, FileImage, ShieldCheck, Hourglass, MessageCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface OrderData {
  selection: {
    id: string;
    customer_name: string;
    total_photos: number;
    total_price: number;
    payment_status: 'pending' | 'proof_uploaded' | 'approved' | 'rejected';
    download_enabled: boolean;
    download_expires_at: string | null;
    created_at: string;
  };
  event: { name: string; slug: string; payment_mode: string };
  settings: {
    photographer_name: string;
    pix_key: string;
    pix_recipient_name: string;
    pix_qrcode_url: string;
    whatsapp_number: string;
  } | null;
  photos: Array<{ id: string; photo_code: string; thumbnail_path: string }>;
  latest_proof: { id: string; status: string; created_at: string } | null;
}

const STATUS_META: Record<string, { label: string; color: string; icon: any; description: string }> = {
  pending: { label: 'Aguardando pagamento', color: 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/40', icon: Clock, description: 'Realize o pagamento via PIX e envie o comprovante.' },
  proof_uploaded: { label: 'Comprovante em análise', color: 'bg-primary/20 text-primary-soft border-primary/40', icon: Hourglass, description: 'Recebemos seu comprovante. O fotógrafo irá validar em breve.' },
  approved: { label: 'Pagamento aprovado', color: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/40', icon: ShieldCheck, description: 'Suas fotos estão liberadas para download.' },
  rejected: { label: 'Comprovante rejeitado', color: 'bg-destructive/15 text-destructive border-destructive/40', icon: X, description: 'Por favor, envie um novo comprovante de pagamento.' },
};

const PublicOrder = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloads, setDownloads] = useState<Array<{ id: string; photo_code: string; filename: string | null; url: string | null }>>([]);
  const [downloadsLoading, setDownloadsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const triggerBlobDownload = async (url: string, filename: string) => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao baixar arquivo');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Allow the browser to process the click before removing
    await new Promise((r) => setTimeout(r, 50));
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
  };

  const downloadOne = async (p: { id: string; photo_code: string; filename: string | null; url: string | null }) => {
    if (!p.url) { toast.error('Link indisponível.'); return; }
    setDownloadingId(p.id);
    try {
      await triggerBlobDownload(p.url, p.filename || `${p.photo_code}.jpg`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao baixar.');
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadAll = async () => {
    const items = downloads.filter((d) => !!d.url);
    if (items.length === 0) { toast.error('Nenhum arquivo disponível.'); return; }
    setDownloadingAll(true);
    setBatchProgress({ current: 0, total: items.length });
    let okCount = 0;
    let failCount = 0;
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      try {
        await triggerBlobDownload(p.url!, p.filename || `${p.photo_code}.jpg`);
        okCount++;
      } catch {
        failCount++;
      }
      setBatchProgress({ current: i + 1, total: items.length });
      // Browsers throttle rapid sequential downloads; spacing helps reliability
      if (i < items.length - 1) await new Promise((r) => setTimeout(r, 900));
    }
    setDownloadingAll(false);
    setBatchProgress(null);
    if (failCount === 0) toast.success(`${okCount} foto(s) baixada(s)!`);
    else toast.warning(`${okCount} baixadas · ${failCount} falharam. Tente novamente as que faltaram.`);
  };

  const load = useCallback(async () => {
    if (!token) return;
    const { data: res, error } = await supabase.functions.invoke('get-order-by-token', { body: { token } });
    if (error || !res || res.error) {
      toast.error('Pedido não encontrado.');
      setLoading(false);
      return;
    }
    setData(res as OrderData);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh instantly when admin updates the selection
  useEffect(() => {
    if (!data?.selection.id) return;
    const ch = supabase
      .channel(`order-${data.selection.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'selections', filter: `id=eq.${data.selection.id}` },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [data?.selection.id, load]);

  // Auto-refresh every 30s as fallback when waiting
  useEffect(() => {
    if (!data) return;
    const status = data.selection.payment_status;
    if (status === 'pending' || status === 'proof_uploaded') {
      const id = setInterval(load, 30000);
      return () => clearInterval(id);
    }
  }, [data, load]);

  const copyPix = () => {
    if (!data?.settings?.pix_key) return;
    navigator.clipboard.writeText(data.settings.pix_key);
    toast.success('Chave PIX copiada!');
  };

  const handleUpload = async (file: File) => {
    if (!token) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo maior que 10MB.'); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('token', token);
      form.append('file', file);
      const { data: res, error } = await supabase.functions.invoke('submit-payment-proof', { body: form });
      if (error || res?.error) throw new Error(res?.error || error?.message);
      toast.success('Comprovante enviado!');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar comprovante.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const loadDownloads = useCallback(async () => {
    if (!token) return;
    setDownloadsLoading(true);
    const { data: res, error } = await supabase.functions.invoke('download-selection', { body: { token } });
    if (error || res?.error) { toast.error(res?.error || 'Erro ao carregar downloads.'); setDownloadsLoading(false); return; }
    setDownloads(res.photos || []);
    setDownloadsLoading(false);
  }, [token]);

  useEffect(() => {
    if (data?.selection.payment_status === 'approved' && data.selection.download_enabled) {
      loadDownloads();
    }
  }, [data, loadDownloads]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div>
          <h1 className="font-display text-2xl text-foreground mb-2">Pedido não encontrado</h1>
          <p className="text-sm text-muted-foreground">O link pode estar incorreto ou expirado.</p>
        </div>
      </div>
    );
  }

  const status = data.selection.payment_status;
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const expired = data.selection.download_expires_at && new Date(data.selection.download_expires_at) < new Date();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 border-b hairline bg-background/85 backdrop-blur-xl py-4">
        <div className="container mx-auto px-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-soft">Pedido</p>
          <h1 className="font-display text-xl text-foreground leading-tight mt-0.5">{data.event.name}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {/* Status card */}
        <Card className={`surface-premium border ${meta.color} animate-fade-in`}>
          <CardContent className="p-5 flex items-start gap-4">
            <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${meta.color}`}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-80">Status</p>
              <h2 className="font-display text-xl text-foreground mt-0.5">{meta.label}</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{meta.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Order summary */}
        <Card className="surface-premium">
          <CardContent className="p-5 space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Cliente</p>
              <p className="text-foreground mt-1">{data.selection.customer_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
                Fotos selecionadas ({data.selection.total_photos})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.photos.map((p) => (
                  <span key={p.id} className="bg-secondary text-foreground border hairline text-[11px] font-mono font-semibold px-2.5 py-1 rounded-sm tracking-wider">
                    {p.photo_code}
                  </span>
                ))}
              </div>
            </div>
            <div className="border-t hairline pt-4 flex justify-between items-end">
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.22em] font-semibold">Total</span>
              <span className="font-display text-3xl text-primary-soft leading-none">
                R$ {Number(data.selection.total_price).toFixed(2).replace('.', ',')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* PIX payment instructions */}
        {(status === 'pending' || status === 'rejected') && (
          <Card className="surface-premium">
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-soft">Pagamento PIX</p>
                <h3 className="font-display text-2xl text-foreground mt-0.5">Como pagar</h3>
              </div>

              {data.settings?.pix_qrcode_url && (
                <div className="flex justify-center bg-card p-4 rounded-md border hairline">
                  <img src={data.settings.pix_qrcode_url} alt="QR Code PIX" className="max-w-[220px] w-full rounded" />
                </div>
              )}

              {data.settings?.pix_recipient_name && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Recebedor</p>
                  <p className="text-foreground mt-1">{data.settings.pix_recipient_name}</p>
                </div>
              )}

              {data.settings?.pix_key ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Chave PIX</p>
                  <div className="flex gap-2">
                    <Input readOnly value={data.settings.pix_key} className="font-mono text-sm bg-background" />
                    <Button variant="outline" size="icon" onClick={copyPix} className="shrink-0 min-w-[44px]">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">O fotógrafo ainda não cadastrou a chave PIX. Entre em contato.</p>
              )}

              <div className="border-t hairline pt-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Enviar comprovante</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                />
                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full min-h-[52px] bg-primary text-primary-foreground hover:bg-primary/90 ring-premium uppercase tracking-wide text-xs font-semibold"
                >
                  {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : <><Upload className="h-4 w-4 mr-2" /> Enviar comprovante</>}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">JPG, PNG, WEBP ou PDF · até 10MB</p>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'proof_uploaded' && (
          <Card className="surface-premium border-primary/30">
            <CardContent className="p-6 space-y-4 text-center">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full bg-primary/15 animate-ping" />
                <div className="relative w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <Hourglass className="h-7 w-7 text-primary-soft" />
                </div>
              </div>
              <div>
                <p className="font-display text-xl text-foreground">Aguardando aprovação</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm mx-auto">
                  Seu comprovante foi recebido e está em análise pelo fotógrafo. Normalmente a confirmação acontece em até <span className="text-foreground font-medium">algumas horas</span>.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground bg-secondary/50 border hairline rounded-md px-3 py-2 max-w-sm mx-auto">
                <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                Esta página atualiza automaticamente. Você pode fechá-la e voltar com o mesmo link.
              </div>

              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="min-h-[44px] mt-2"
              >
                <Upload className="h-4 w-4 mr-2" /> Enviar novo comprovante
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              />
            </CardContent>
          </Card>
        )}

        {/* Download center */}
        {status === 'approved' && data.selection.download_enabled && !expired && (
          <Card className="surface-premium border-[hsl(var(--success))]/40">
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--success))]">Liberado</p>
                <h3 className="font-display text-2xl text-foreground mt-0.5">Suas fotos</h3>
                {data.selection.download_expires_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Disponível até {new Date(data.selection.download_expires_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              {downloadsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  {downloads.map((p) => {
                    const isDownloading = downloadingId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => downloadOne(p)}
                        disabled={isDownloading || !p.url}
                        className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-md border hairline bg-card hover:border-primary/50 active:scale-[0.99] transition-all min-h-[56px] disabled:opacity-60"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded bg-secondary flex items-center justify-center shrink-0">
                            <FileImage className="h-4 w-4 text-primary-soft" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-sm text-foreground truncate">{p.photo_code}</p>
                            {p.filename && <p className="text-[11px] text-muted-foreground truncate">{p.filename}</p>}
                          </div>
                        </div>
                        {isDownloading
                          ? <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />
                          : <Download className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                  {downloads.length > 1 && (
                    <div className="space-y-2 mt-2">
                      <Button
                        onClick={downloadAll}
                        disabled={downloadingAll}
                        variant="outline"
                        className="w-full min-h-[48px]"
                      >
                        {downloadingAll
                          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Baixando {batchProgress ? `${batchProgress.current}/${batchProgress.total}` : 'todas'}...</>
                          : <><Download className="h-4 w-4 mr-2" /> Baixar todas ({downloads.length})</>}
                      </Button>
                      {downloadingAll && batchProgress && (
                        <>
                          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground text-center">
                            Não feche esta página até concluir. Seu navegador pode pedir permissão para baixar vários arquivos.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              <Button onClick={loadDownloads} variant="ghost" className="w-full text-xs">
                Renovar links de download
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'approved' && expired && (
          <Card className="surface-premium border-destructive/40">
            <CardContent className="p-5 text-center">
              <p className="font-display text-lg text-foreground">Link expirado</p>
              <p className="text-sm text-muted-foreground mt-1">Entre em contato com o fotógrafo para renovar.</p>
            </CardContent>
          </Card>
        )}

        {/* Help / support section */}
        {data.settings?.whatsapp_number && (() => {
          const cleanWa = data.settings.whatsapp_number.replace(/\D/g, '');
          const fullWa = cleanWa.startsWith('55') ? cleanWa : `55${cleanWa}`;
          const baseMsg = status === 'proof_uploaded'
            ? `Olá! Já enviei o comprovante do pedido do evento *${data.event.name}* e gostaria de saber sobre a aprovação.`
            : status === 'approved'
              ? `Olá! Tenho uma dúvida sobre o download das minhas fotos do evento *${data.event.name}*.`
              : `Olá! Preciso de ajuda com o pagamento do pedido do evento *${data.event.name}*.`;
          const supportUrl = `https://wa.me/${fullWa}?text=${encodeURIComponent(baseMsg)}`;
          return (
            <Card className="surface-premium">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="shrink-0 w-11 h-11 rounded-full bg-secondary border hairline flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-primary-soft" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base text-foreground">Precisa de ajuda?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Fale com o fotógrafo pelo WhatsApp.</p>
                </div>
                <Button asChild size="sm" variant="outline" className="min-h-[40px] shrink-0">
                  <a href={supportUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-1.5" /> Falar
                  </a>
                </Button>
              </CardContent>
            </Card>
          );
        })()}
      </main>

      {/* Floating WhatsApp support button */}
      {data.settings?.whatsapp_number && (() => {
        const cleanWa = data.settings.whatsapp_number.replace(/\D/g, '');
        const fullWa = cleanWa.startsWith('55') ? cleanWa : `55${cleanWa}`;
        const msg = `Olá! Estou na página do meu pedido (${data.event.name}) e preciso de ajuda.`;
        return (
          <a
            href={`https://wa.me/${fullWa}?text=${encodeURIComponent(msg)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Suporte via WhatsApp"
            className="fixed bottom-5 right-5 z-50 inline-flex items-center justify-center w-14 h-14 rounded-full bg-[hsl(var(--success))] text-white shadow-lg hover:scale-105 active:scale-95 transition-transform ring-2 ring-[hsl(var(--success))]/30"
          >
            <MessageCircle className="h-6 w-6" />
          </a>
        );
      })()}
    </div>
  );
};

export default PublicOrder;