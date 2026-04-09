import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Phone, Image as ImageIcon, Copy, ClipboardCheck, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoDetail {
  id: string;
  photo_code: string;
  thumbnail_path: string;
  preview_path: string;
}

interface Selection {
  id: string;
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
  { value: 'pendente', label: 'Pendente', color: 'bg-warning/10 text-warning' },
  { value: 'editando', label: 'Editando', color: 'bg-primary/10 text-primary' },
  { value: 'entregue', label: 'Entregue', color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
];

const getPublicUrl = (path: string) => {
  if (!path) return '';
  return supabase.storage.from('event-photos').getPublicUrl(path).data.publicUrl;
};

const AdminOrders = () => {
  const navigate = useNavigate();
  const [selections, setSelections] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoDetail | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: eventsData } = await supabase.from('events').select('id, name').order('name');
      setEvents(eventsData || []);

      const { data: selectionsData, error: selError } = await supabase
        .from('selections')
        .select('*, events(name)')
        .order('created_at', { ascending: false });

      if (selError) {
        console.error('Error fetching selections:', selError);
        setLoading(false);
        return;
      }

      if (!selectionsData) {
        setLoading(false);
        return;
      }

      const selectionsWithPhotos = await Promise.all(
        selectionsData.map(async (sel: any) => {
          const { data: photos, error: photosErr } = await supabase
            .from('selection_photos')
            .select('photo_id, event_photos(id, photo_code, thumbnail_path, preview_path)')
            .eq('selection_id', sel.id);

          if (photosErr) console.error('Error fetching selection photos:', photosErr);

          const photoDetails: PhotoDetail[] = (photos || [])
            .map((p: any) => p.event_photos)
            .filter(Boolean);

          return {
            ...sel,
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

  const updateStatus = async (selectionId: string, newStatus: string) => {
    const { error } = await supabase
      .from('selections')
      .update({ status: newStatus })
      .eq('id', selectionId);

    if (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status.');
      return;
    }

    setSelections((prev) =>
      prev.map((s) => (s.id === selectionId ? { ...s, status: newStatus } : s))
    );
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
      <header className="border-b bg-card py-4">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Pedidos / Seleções</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="flex min-h-[44px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Todos os eventos</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex min-h-[44px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="editando">Editando</option>
            <option value="entregue">Entregue</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 h-32" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            Nenhum pedido encontrado.
          </p>
        ) : (
          <div className="space-y-4">
            {filtered.map((sel) => {
              const statusConfig = STATUS_OPTIONS.find((s) => s.value === sel.status);
              const isExpanded = expandedOrder === sel.id;
              return (
                <Card key={sel.id}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{sel.event_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(sel.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <select
                        value={sel.status}
                        onChange={(e) => updateStatus(sel.id, e.target.value)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border-0 ${statusConfig?.color || ''}`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* WhatsApp */}
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`https://wa.me/55${sel.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {formatWhatsapp(sel.whatsapp)}
                      </a>
                    </div>

                    {/* Summary + Actions */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        {sel.total_photos} fotos • R$ {Number(sel.total_price).toFixed(2).replace('.', ',')}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-[36px]"
                          onClick={() => copyPhotoCodes(sel.photo_codes)}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copiar códigos
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-[36px]"
                          onClick={() => setExpandedOrder(isExpanded ? null : sel.id)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> {isExpanded ? 'Ocultar' : 'Ver fotos'}
                        </Button>
                      </div>
                    </div>

                    {/* Quick status buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {sel.status !== 'editando' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="min-h-[36px]"
                          onClick={() => updateStatus(sel.id, 'editando')}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Marcar como editando
                        </Button>
                      )}
                      {sel.status !== 'entregue' && (
                        <Button
                          size="sm"
                          variant="default"
                          className="min-h-[36px]"
                          onClick={() => updateStatus(sel.id, 'entregue')}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Marcar como entregue
                        </Button>
                      )}
                    </div>

                    {/* Photo thumbnails grid */}
                    {isExpanded && sel.photos.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2 border-t">
                        {sel.photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="cursor-pointer group"
                            onClick={() => setPreviewPhoto(photo)}
                          >
                            <div className="aspect-square overflow-hidden rounded-md bg-muted">
                              <img
                                src={getPublicUrl(photo.thumbnail_path)}
                                alt={photo.photo_code}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                loading="lazy"
                              />
                            </div>
                            <p className="text-xs text-center text-muted-foreground font-mono mt-1">
                              {photo.photo_code}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-10 right-0 text-background hover:text-background/80 text-sm"
            >
              Fechar ✕
            </button>
            <img
              src={getPublicUrl(previewPhoto.preview_path)}
              alt={previewPhoto.photo_code}
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
            <p className="text-center text-background font-mono mt-2">
              {previewPhoto.photo_code}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
