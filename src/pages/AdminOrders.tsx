import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Phone, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

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
}

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', color: 'bg-warning/10 text-warning' },
  { value: 'editando', label: 'Editando', color: 'bg-primary/10 text-primary' },
  { value: 'entregue', label: 'Entregue', color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
];

const AdminOrders = () => {
  const navigate = useNavigate();
  const [selections, setSelections] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch events for filter
      const { data: eventsData } = await supabase.from('events').select('id, name').order('name');
      setEvents(eventsData || []);

      // Fetch selections with event name
      const { data: selectionsData } = await supabase
        .from('selections')
        .select('*, events(name)')
        .order('created_at', { ascending: false });

      if (!selectionsData) {
        setLoading(false);
        return;
      }

      // Fetch photo codes for each selection
      const selectionsWithCodes = await Promise.all(
        selectionsData.map(async (sel: any) => {
          const { data: photos } = await supabase
            .from('selection_photos')
            .select('photo_id, event_photos(photo_code)')
            .eq('selection_id', sel.id);

          return {
            ...sel,
            event_name: sel.events?.name || 'Evento desconhecido',
            photo_codes: (photos || []).map((p: any) => p.event_photos?.photo_code).filter(Boolean),
          };
        })
      );

      setSelections(selectionsWithCodes);
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
      toast.error('Erro ao atualizar status.');
      return;
    }

    setSelections((prev) =>
      prev.map((s) => (s.id === selectionId ? { ...s, status: newStatus } : s))
    );
    toast.success('Status atualizado!');
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
              return (
                <Card key={sel.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{sel.event_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(sel.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
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

                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                        <ImageIcon className="h-3 w-3" />
                        {sel.total_photos} fotos • R$ {Number(sel.total_price).toFixed(2).replace('.', ',')}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {sel.photo_codes.map((code) => (
                          <span key={code} className="bg-muted text-muted-foreground text-xs font-mono px-2 py-0.5 rounded">
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminOrders;
