import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSignedUrls } from '@/hooks/useSignedUrls';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Phone, Image as ImageIcon, Copy, ClipboardCheck, Eye, X, ShoppingBag, User } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoDetail {
  id: string;
  photo_code: string;
  thumbnail_path: string;
  preview_path: string;
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
  photo_codes: string[];
  photos: PhotoDetail[];
}

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', color: 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]' },
  { value: 'editando', label: 'Editando', color: 'bg-primary/15 text-primary' },
  { value: 'entregue', label: 'Entregue', color: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-destructive/15 text-destructive' },
];

const AdminOrders = () => {
  const navigate = useNavigate();
  const [selections, setSelections] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoDetail | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const { getSignedUrl, fetchSignedUrls } = useSignedUrls();

  useEffect(() => {
    const fetchData = async () => {
      const { data: eventsData } = await supabase.from('events').select('id, name').order('name');
      setEvents(eventsData || []);

      const { data: selectionsData, error: selError } = await supabase
        .from('selections')
        .select('*, events(name)')
        .order('created_at', { ascending: false });

      if (selError || !selectionsData) { setLoading(false); return; }

      const selectionsWithPhotos = await Promise.all(
        selectionsData.map(async (sel: any) => {
          const { data: photos } = await supabase
            .from('selection_photos')
            .select('photo_id, event_photos(id, photo_code, thumbnail_path, preview_path)')
            .eq('selection_id', sel.id);
          const photoDetails: PhotoDetail[] = (photos || []).map((p: any) => p.event_photos).filter(Boolean);
          return {
            ...sel,
            customer_name: sel.customer_name || '',
            event_name: sel.events?.name || 'Evento desconhecido',
            photo_codes: photoDetails.map((p) => p.photo_code),
            photos: photoDetails,
          };
        })
      );
      setSelections(selectionsWithPhotos);
      setLoading(false);
    };
    fetchData();
  }, []);

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
    const { error } = await supabase.from('selections').update({ status: newStatus }).eq('id', selectionId);
    if (error) { toast.error('Erro ao atualizar status.'); return; }
    setSelections((prev) => prev.map((s) => (s.id === selectionId ? { ...s, status: newStatus } : s)));
    toast.success('Status atualizado!');
  };

  const copyPhotoCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join('\n'));
    toast.success('Códigos copiados!');
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
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/60 backdrop-blur-xl py-3">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="min-w-[44px] min-h-[44px] hover:bg-primary/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Pedidos / Seleções</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="flex min-h-[44px] rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
          >
            <option value="all">Todos os eventos</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex min-h-[44px] rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
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
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum pedido encontrado</h3>
            <p className="text-muted-foreground text-sm">Os pedidos dos clientes aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((sel) => {
              const statusConfig = STATUS_OPTIONS.find((s) => s.value === sel.status);
              const isExpanded = expandedOrder === sel.id;
              return (
                <Card key={sel.id} className="border-border/50 bg-card/80 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
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
                      <select
                        value={sel.status}
                        onChange={(e) => updateStatus(sel.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer ${statusConfig?.color || ''}`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
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

                    <div className="flex items-center justify-between flex-wrap gap-2 bg-secondary/50 rounded-xl p-3">
                      <p className="text-sm text-foreground flex items-center gap-1.5 font-medium">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        {sel.total_photos} fotos • <span className="text-primary font-bold">R$ {Number(sel.total_price).toFixed(2).replace('.', ',')}</span>
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="min-h-[36px] rounded-lg border-border/50 hover:bg-primary/10" onClick={() => copyPhotoCodes(sel.photo_codes)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
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
                              <p className="text-xs text-center text-muted-foreground font-mono mt-1">{photo.photo_code}</p>
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
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
