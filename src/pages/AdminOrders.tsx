import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSignedUrls } from '@/hooks/useSignedUrls';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Phone, Image as ImageIcon, Copy, ClipboardCheck, Eye, X, ShoppingBag, User, FileCheck, FileX, Receipt, Link as LinkIcon, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import ProofViewerModal from '@/components/admin/ProofViewerModal';

interface PhotoDetail {
  id: string;
  photo_code: string;
  thumbnail_path: string;
  preview_path: string;
  filename: string | null;
}

interface PaymentProof {
  id: string;
  file_path: string;
  original_filename: string | null;
  status: string;
  created_at: string;
}

interface Selection {
  id: string;
  customer_name: string;
  whatsapp: string;
  status: string;
  total_photos: number;
  total_price: number;
  created_at: string;
  event_name: string;
  event_id: string;
  payment_status: string;
  payment_method: string;
  download_enabled: boolean;
  download_expires_at: string | null;
  public_token: string | null;
  photo_codes: string[];
  photos: PhotoDetail[];
  proofs: PaymentProof[];
}

const STATUS_OPTIONS = [
  {
    value: 'pendente',
    label: 'Pendente',
    color: 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border border-[hsl(var(--warning))]/40 hover:bg-[hsl(var(--warning))]/25',
    dot: 'bg-[hsl(var(--warning))]',
  },
  {
    value: 'editando',
    label: 'Editando',
    color: 'bg-primary/20 text-primary-soft border border-primary/40 hover:bg-primary/30',
    dot: 'bg-primary',
  },
  {
    value: 'entregue',
    label: 'Entregue',
    color: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border border-[hsl(var(--success))]/40 hover:bg-[hsl(var(--success))]/25',
    dot: 'bg-[hsl(var(--success))]',
  },
  {
    value: 'cancelado',
    label: 'Cancelado',
    color: 'bg-destructive/15 text-destructive border border-destructive/40 hover:bg-destructive/25',
    dot: 'bg-destructive',
  },
];

const AdminOrders = () => {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const [selections, setSelections] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoDetail | null>(null);
  const [proofViewer, setProofViewer] = useState<{ url: string; filename: string | null; fileType: 'image' | 'pdf' } | null>(null);
  const [proofLoadingId, setProofLoadingId] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const { getSignedUrl, fetchSignedUrls } = useSignedUrls();

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    const { data: eventsData } = await supabase.from('events').select('id, name').eq('tenant_id', tenantId).order('name');
    setEvents(eventsData || []);

    const { data: selectionsData, error: selError } = await supabase
      .from('selections')
      .select('*, events(name)')
      .order('created_at', { ascending: false });

    if (selError || !selectionsData) { setLoading(false); return; }

    const selectionsWithPhotos = await Promise.all(
      selectionsData.map(async (sel: any) => {
        const [{ data: photos }, { data: proofs }] = await Promise.all([
          supabase
            .from('selection_photos')
            .select('photo_id, event_photos(id, photo_code, thumbnail_path, preview_path, filename)')
            .eq('selection_id', sel.id),
          supabase
            .from('payment_proofs')
            .select('id, file_path, original_filename, status, created_at')
            .eq('selection_id', sel.id)
            .order('created_at', { ascending: false }),
        ]);
        const photoDetails: PhotoDetail[] = (photos || []).map((p: any) => p.event_photos).filter(Boolean);
        return {
          ...sel,
          customer_name: sel.customer_name || '',
          event_name: sel.events?.name || 'Evento desconhecido',
          payment_status: sel.payment_status || 'pending',
          payment_method: sel.payment_method || 'whatsapp',
          download_enabled: sel.download_enabled || false,
          download_expires_at: sel.download_expires_at || null,
          public_token: sel.public_token || null,
          photo_codes: photoDetails.map((p) => p.photo_code),
          photos: photoDetails,
          proofs: (proofs || []) as PaymentProof[],
        };
      })
    );
    setSelections(selectionsWithPhotos);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: new payment proofs and selection updates for this tenant
  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase
      .channel(`admin-orders-${tenantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payment_proofs', filter: `tenant_id=eq.${tenantId}` },
        () => {
          toast.success('💰 Novo comprovante de pagamento recebido!', { duration: 6000 });
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try { new Notification('Novo comprovante recebido', { body: 'Um cliente enviou um comprovante PIX.' }); } catch {}
          }
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'selections', filter: `tenant_id=eq.${tenantId}` },
        () => { fetchData(); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'selections', filter: `tenant_id=eq.${tenantId}` },
        () => { fetchData(); }
      )
      .subscribe();

    // Request browser notification permission once
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission().catch(() => {}); } catch {}
    }

    return () => { supabase.removeChannel(ch); };
  }, [tenantId, fetchData]);

  const handleExpand = useCallback((selId: string, photos: PhotoDetail[]) => {
    if (expandedOrder === selId) { setExpandedOrder(null); return; }
    setExpandedOrder(selId);
    const paths = photos.flatMap((p) => [p.thumbnail_path, p.preview_path].filter(Boolean));
    if (paths.length > 0) fetchSignedUrls(paths);
  }, [expandedOrder, fetchSignedUrls]);

  const handlePreview = useCallback((photo: PhotoDetail) => {
    fetchSignedUrls([photo.preview_path].filter(Boolean));
    setPreviewPhoto(photo);
  }, [fetchSignedUrls]);

  const updateStatus = async (selectionId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('selections').update({ status: newStatus }).eq('id', selectionId);
      if (error) {
        console.error('Status update error:', error);
        toast.error(`Erro ao atualizar status: ${error.message}`);
        return;
      }
      setSelections((prev) => prev.map((s) => (s.id === selectionId ? { ...s, status: newStatus } : s)));
      toast.success('Status atualizado!');
    } catch (err) {
      console.error('Unexpected status update error:', err);
      toast.error('Erro inesperado ao atualizar status.');
    }
  };

  const buildApprovalWhatsappUrl = (sel: Selection) => {
    if (!sel.whatsapp || !sel.public_token) return null;
    const clean = sel.whatsapp.replace(/\D/g, '');
    const fullWa = clean.startsWith('55') ? clean : `55${clean}`;
    const orderUrl = `${window.location.origin}/order/${sel.public_token}`;
    const firstName = (sel.customer_name || '').trim().split(/\s+/)[0] || '';
    const greeting = firstName ? `Olá, ${firstName}!` : 'Olá!';
    const msg =
      `${greeting}  Seu pagamento do evento *${sel.event_name}* foi aprovado.\n\n` +
      `Suas fotos já estão liberadas para download:\n${orderUrl}\n\n` +
      `Qualquer dúvida estou à disposição. Obrigado! `;
    return `https://wa.me/${fullWa}?text=${encodeURIComponent(msg)}`;
  };

  const notifyCustomerOnWhatsapp = (sel: Selection) => {
    const url = buildApprovalWhatsappUrl(sel);
    if (!url) { toast.error('Cliente sem WhatsApp ou link público.'); return; }
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) toast.error('Pop-up bloqueado. Permita pop-ups para abrir o WhatsApp.');
  };

  const approvePayment = async (sel: Selection) => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    const { error } = await supabase
      .from('selections')
      .update({
        payment_status: 'approved',
        download_enabled: true,
        payment_approved_at: new Date().toISOString(),
        download_expires_at: expires.toISOString(),
      } as any)
      .eq('id', sel.id);
    if (error) { toast.error('Erro ao aprovar pagamento.'); return; }
    if (sel.proofs[0]) {
      await supabase.from('payment_proofs').update({ status: 'approved' }).eq('id', sel.proofs[0].id);
    }
    const updated: Selection = { ...sel, payment_status: 'approved', download_enabled: true, download_expires_at: expires.toISOString() };
    setSelections((prev) => prev.map((s) => s.id === sel.id ? updated : s));
    toast.success('Pagamento aprovado! Abrindo WhatsApp para avisar o cliente…');
    // Open WhatsApp synchronously-ish to reduce popup blocking risk
    setTimeout(() => notifyCustomerOnWhatsapp(updated), 100);
  };

  const rejectPayment = async (sel: Selection) => {
    const { error } = await supabase
      .from('selections')
      .update({ payment_status: 'rejected', download_enabled: false } as any)
      .eq('id', sel.id);
    if (error) { toast.error('Erro ao rejeitar.'); return; }
    if (sel.proofs[0]) {
      await supabase.from('payment_proofs').update({ status: 'rejected' }).eq('id', sel.proofs[0].id);
    }
    setSelections((prev) => prev.map((s) => s.id === sel.id ? { ...s, payment_status: 'rejected', download_enabled: false } : s));
    toast.success('Comprovante rejeitado.');
  };

  const extendDownload = async (sel: Selection, days: number) => {
    const base = sel.download_expires_at ? new Date(sel.download_expires_at) : new Date();
    if (base < new Date()) base.setTime(Date.now());
    base.setDate(base.getDate() + days);
    const { error } = await supabase
      .from('selections')
      .update({ download_expires_at: base.toISOString(), download_enabled: true } as any)
      .eq('id', sel.id);
    if (error) { toast.error('Erro ao estender prazo.'); return; }
    setSelections((prev) => prev.map((s) => s.id === sel.id ? { ...s, download_expires_at: base.toISOString(), download_enabled: true } : s));
    toast.success(`Prazo estendido em ${days} dias.`);
  };

  const disableDownload = async (sel: Selection) => {
    const { error } = await supabase
      .from('selections')
      .update({ download_enabled: false } as any)
      .eq('id', sel.id);
    if (error) { toast.error('Erro ao desabilitar download.'); return; }
    setSelections((prev) => prev.map((s) => s.id === sel.id ? { ...s, download_enabled: false } : s));
    toast.success('Download desabilitado.');
  };

  const viewProof = async (proof: PaymentProof) => {
    setProofLoadingId(proof.id);
    try {
      const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(proof.file_path, 600);
      if (!data?.signedUrl) {
        toast.error('Não foi possível abrir o comprovante.');
        return;
      }
      const lower = (proof.original_filename || proof.file_path).toLowerCase();
      const fileType: 'image' | 'pdf' = lower.endsWith('.pdf') ? 'pdf' : 'image';
      setProofViewer({ url: data.signedUrl, filename: proof.original_filename, fileType });
    } finally {
      setProofLoadingId(null);
    }
  };

  const copyOrderLink = (token: string | null) => {
    if (!token) { toast.error('Sem link público.'); return; }
    const url = `${window.location.origin}/order/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link do pedido copiado!');
  };

  const copyPhotoCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join('\n'));
    toast.success('Códigos copiados!');
  };

  const copyFilenames = (photos: PhotoDetail[]) => {
    const names = photos
      .map((p) => p.filename?.trim())
      .filter((n): n is string => !!n);
    if (names.length === 0) {
      toast.error('Nenhuma foto possui nome de arquivo registrado.');
      return;
    }
    const formatted = names.map((n) => `"${n}"`).join(' ');
    navigator.clipboard.writeText(formatted);
    toast.success(`${names.length} nome(s) copiado(s) em formato otimizado!`);
  };

  const formatWhatsapp = (wa: string) => {
    if (wa.length === 11) return `(${wa.slice(0, 2)}) ${wa.slice(2, 7)}-${wa.slice(7)}`;
    if (wa.length === 10) return `(${wa.slice(0, 2)}) ${wa.slice(2, 6)}-${wa.slice(6)}`;
    return wa;
  };

  const filtered = selections.filter((s) => {
    if (filterEvent !== 'all' && s.event_id !== filterEvent) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b hairline bg-background/85 backdrop-blur-xl py-3">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="min-w-[44px] min-h-[44px] hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-xl text-foreground leading-none">Pedidos</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-soft mb-2">Operações</p>
          <h2 className="font-display text-3xl text-foreground leading-tight">Pedidos e seleções</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="flex min-h-[44px] rounded-md border border-[hsl(var(--hairline))] bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">Todos os eventos</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex min-h-[44px] rounded-md border border-[hsl(var(--hairline))] bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="editando">Editando</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border hairline rounded-md bg-card/30">
            <div className="w-14 h-14 rounded-full border hairline bg-card flex items-center justify-center mb-5">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-display text-2xl text-foreground mb-2">Nenhum pedido encontrado</h3>
            <p className="text-muted-foreground text-sm">Os pedidos dos clientes aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((sel) => {
              const statusConfig = STATUS_OPTIONS.find((s) => s.value === sel.status);
              const isExpanded = expandedOrder === sel.id;
              return (
                <Card key={sel.id} className="surface-premium hover:border-primary/30 transition-all duration-200">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-foreground text-base">{sel.event_name}</p>
                        {sel.customer_name && (
                          <p className="text-sm text-foreground mt-1 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-primary" />
                            {sel.customer_name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(sel.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className={`relative inline-flex items-center gap-2 rounded-full pl-3 pr-2 py-1.5 transition-colors ${statusConfig?.color || ''}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusConfig?.dot || 'bg-foreground'}`} />
                        <select
                          value={sel.status}
                          onChange={(e) => updateStatus(sel.id, e.target.value)}
                          className="appearance-none bg-transparent border-0 outline-none text-xs font-semibold uppercase tracking-wider cursor-pointer pr-5 focus:ring-0"
                          style={{ color: 'inherit' }}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-card text-foreground font-medium normal-case tracking-normal">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <svg
                          aria-hidden
                          className="pointer-events-none absolute right-2 h-3 w-3 opacity-70"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`https://wa.me/55${sel.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                      >
                        {formatWhatsapp(sel.whatsapp)}
                      </a>
                    </div>

                    {sel.payment_method === 'pix_manual' && (() => {
                      const ps = sel.payment_status;
                      const psMeta: Record<string, { label: string; cls: string }> = {
                        pending: { label: 'Aguardando pagamento', cls: 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/40' },
                        proof_uploaded: { label: 'Comprovante enviado', cls: 'bg-primary/15 text-primary-soft border-primary/40' },
                        approved: { label: 'Pagamento aprovado', cls: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/40' },
                        rejected: { label: 'Comprovante rejeitado', cls: 'bg-destructive/15 text-destructive border-destructive/40' },
                      };
                      const m = psMeta[ps] || psMeta.pending;
                      const proof = sel.proofs[0];
                      return (
                        <div className="rounded-xl border hairline bg-secondary/30 p-3 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Receipt className="h-4 w-4 text-primary-soft" />
                              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pagamento PIX</span>
                              <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${m.cls}`}>{m.label}</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyOrderLink(sel.public_token)}>
                              <LinkIcon className="h-3 w-3 mr-1" /> Link
                            </Button>
                          </div>

                          {proof && (
                            <div className="flex items-center justify-between gap-2 text-xs bg-card rounded-lg px-3 py-2 border hairline">
                              <span className="truncate text-muted-foreground">{proof.original_filename || 'comprovante'}</span>
                              <Button size="sm" variant="outline" className="h-8 min-h-[36px]" onClick={() => viewProof(proof)} disabled={proofLoadingId === proof.id}>
                                <Eye className="h-3 w-3 mr-1" /> {proofLoadingId === proof.id ? 'Abrindo…' : 'Visualizar'}
                              </Button>
                            </div>
                          )}

                          {(ps === 'proof_uploaded' || ps === 'pending' || ps === 'rejected') && (
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" className="min-h-[36px]" onClick={() => approvePayment(sel)} disabled={!proof}>
                                <FileCheck className="h-3.5 w-3.5 mr-1" /> Aprovar pagamento
                              </Button>
                              {ps !== 'rejected' && (
                                <Button size="sm" variant="outline" className="min-h-[36px] hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={() => rejectPayment(sel)} disabled={!proof}>
                                  <FileX className="h-3.5 w-3.5 mr-1" /> Rejeitar
                                </Button>
                              )}
                            </div>
                          )}

                          {ps === 'approved' && (
                            <div className="space-y-2">
                              <p className="text-[11px] text-muted-foreground">
                                Download {sel.download_enabled ? 'ativo' : 'desativado'}
                                {sel.download_expires_at && ` · expira em ${new Date(sel.download_expires_at).toLocaleDateString('pt-BR')}`}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" className="h-8 text-xs bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white" onClick={() => notifyCustomerOnWhatsapp(sel)}>
                                  <MessageCircle className="h-3.5 w-3.5 mr-1" /> Avisar cliente no WhatsApp
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => extendDownload(sel, 7)}>+7 dias</Button>
                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => extendDownload(sel, 30)}>+30 dias</Button>
                                {sel.download_enabled ? (
                                  <Button size="sm" variant="outline" className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive" onClick={() => disableDownload(sel)}>Desativar download</Button>
                                ) : (
                                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => extendDownload(sel, 7)}>Reativar (+7 dias)</Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between flex-wrap gap-2 bg-secondary/50 rounded-xl p-3">
                      <p className="text-sm text-foreground flex items-center gap-1.5 font-medium">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        {sel.total_photos} fotos • <span className="text-primary font-bold">R$ {Number(sel.total_price).toFixed(2).replace('.', ',')}</span>
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" className="min-h-[36px] rounded-lg border-border/50 hover:bg-primary/10" onClick={() => copyPhotoCodes(sel.photo_codes)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Códigos
                        </Button>
                        <Button variant="outline" size="sm" className="min-h-[36px] rounded-lg border-border/50 hover:bg-primary/10" onClick={() => copyFilenames(sel.photos)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Nomes de arquivo
                        </Button>
                        <Button variant="outline" size="sm" className="min-h-[36px] rounded-lg border-border/50 hover:bg-primary/10" onClick={() => handleExpand(sel.id, sel.photos)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> {isExpanded ? 'Ocultar' : 'Ver fotos'}
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {sel.status !== 'editando' && (
                        <Button size="sm" variant="secondary" className="min-h-[36px] rounded-lg" onClick={() => updateStatus(sel.id, 'editando')}>
                          <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Editando
                        </Button>
                      )}
                      {sel.status !== 'entregue' && (
                        <Button size="sm" variant="default" className="min-h-[36px] rounded-lg" onClick={() => updateStatus(sel.id, 'entregue')}>
                          <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Entregue
                        </Button>
                      )}
                      {sel.status !== 'cancelado' && (
                        <Button size="sm" variant="outline" className="min-h-[36px] rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={() => updateStatus(sel.id, 'cancelado')}>
                          <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                        </Button>
                      )}
                    </div>

                    {isExpanded && sel.photos.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-3 border-t border-border/50 animate-fade-in">
                        {sel.photos.map((photo) => {
                          const thumbUrl = getSignedUrl(photo.thumbnail_path);
                          return (
                            <div key={photo.id} className="cursor-pointer group" onClick={() => handlePreview(photo)}>
                              <div className="aspect-square overflow-hidden rounded-lg bg-secondary">
                                {thumbUrl ? (
                                  <img
                                    src={thumbUrl}
                                    alt={photo.photo_code}
                                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                                    loading="lazy"
                                    onError={(e) => {
                                      console.error('Failed to load thumbnail:', photo.thumbnail_path);
                                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-center text-foreground font-mono mt-1">
                                {photo.photo_code}
                                {photo.filename && (
                                  <span className="block text-[10px] text-muted-foreground truncate" title={photo.filename}>
                                    ({photo.filename})
                                  </span>
                                )}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewPhoto(null)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {(() => {
              const previewUrl = getSignedUrl(previewPhoto.preview_path);
              return previewUrl ? (
                <img
                  src={previewUrl}
                  alt={previewPhoto.photo_code}
                  className="w-full max-h-[80vh] object-contain rounded-xl"
                  onError={(e) => {
                    console.error('Failed to load preview:', previewPhoto.preview_path);
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                </div>
              );
            })()}
            <p className="text-center text-foreground font-mono mt-3 bg-secondary rounded-full px-4 py-1 w-fit mx-auto">
              {previewPhoto.photo_code}
              {previewPhoto.filename && (
                <span className="ml-2 text-muted-foreground">({previewPhoto.filename})</span>
              )}
            </p>
          </div>
        </div>
      )}
      {proofViewer && (
        <ProofViewerModal
          url={proofViewer.url}
          filename={proofViewer.filename}
          fileType={proofViewer.fileType}
          onClose={() => setProofViewer(null)}
        />
      )}
    </div>
  );
};

export default AdminOrders;