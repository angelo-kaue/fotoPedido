import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, LogOut, Image, ShoppingCart, Calendar, Settings, ChevronRight, FolderOpen, Trash2, Camera, Eye, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { formatDateBR } from '@/lib/date-utils';
import { toast } from 'sonner';
import logoFotoPedido from '@/assets/logo-fotopedido.png';

interface EventWithCount {
  id: string;
  name: string;
  slug: string;
  event_date: string | null;
  status: string;
  price_per_photo: number;
  photo_count: number;
  selection_count: number;
  visit_count: number;
}

const AdminDashboard = () => {
  const { signOut, tenantId } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    fetchEvents();
  }, [tenantId]);

  const fetchEvents = async () => {
    if (!tenantId) return;
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (!eventsData) { setLoading(false); return; }

    const eventsWithCounts = await Promise.all(
      eventsData.map(async (event) => {
        const [{ count: photoCount }, { count: selectionCount }, { count: visitCount }] = await Promise.all([
          supabase.from('event_photos').select('*', { count: 'exact', head: true }).eq('event_id', event.id),
          supabase.from('selections').select('*', { count: 'exact', head: true }).eq('event_id', event.id),
          supabase.from('event_visits' as any).select('*', { count: 'exact', head: true }).eq('event_id', event.id),
        ]);
        return { ...event, photo_count: photoCount || 0, selection_count: selectionCount || 0, visit_count: visitCount || 0 };
      })
    );
    setEvents(eventsWithCounts);
    setLoading(false);
  };

  const handleDeleteEvent = async (e: React.MouseEvent, event: EventWithCount) => {
    e.preventDefault();
    e.stopPropagation();

    if (event.selection_count > 0) {
      toast.error('Este evento possui pedidos e não pode ser excluído. Você pode apenas desativá-lo.');
      return;
    }

    if (!confirm(`Excluir o evento "${event.name}"? Todas as fotos serão removidas.`)) return;

    setDeleting(event.id);
    try {
      // Delete photos first
      const { data: photos } = await supabase.from('event_photos').select('storage_path, thumbnail_path, preview_path').eq('event_id', event.id);
      if (photos && photos.length > 0) {
        const paths = photos.flatMap(p => [p.storage_path, p.thumbnail_path, p.preview_path].filter(Boolean));
        if (paths.length > 0) {
          await supabase.storage.from('event-photos').remove(paths);
        }
        await supabase.from('event_photos').delete().eq('event_id', event.id);
      }
      const { error } = await supabase.from('events').delete().eq('id', event.id);
      if (error) throw error;
      setEvents(prev => prev.filter(ev => ev.id !== event.id));
      toast.success('Evento excluído com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir evento.');
    } finally {
      setDeleting(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b hairline bg-background/85 backdrop-blur-xl py-3">
        <div className="container mx-auto px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={logoFotoPedido} alt="FotoPedido" width={32} height={32} className="w-8 h-8 rounded-md flex-shrink-0" />
            <span className="font-display text-xl text-foreground truncate leading-none">FotoPedido</span>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Link to="/admin/dashboard">
              <Button variant="ghost" size="sm" className="min-h-[40px] rounded-md hover:bg-secondary px-2.5 sm:px-3 text-muted-foreground hover:text-foreground">
                <BarChart3 className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline text-xs uppercase tracking-wide font-semibold">Dashboard</span>
              </Button>
            </Link>
            <Link to="/admin/atendimentos">
              <Button variant="ghost" size="sm" className="min-h-[40px] rounded-md hover:bg-secondary px-2.5 sm:px-3 text-muted-foreground hover:text-foreground">
                <Users className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline text-xs uppercase tracking-wide font-semibold">Atendimentos</span>
              </Button>
            </Link>
            <Link to="/admin/pedidos">
              <Button variant="ghost" size="sm" className="min-h-[40px] rounded-md hover:bg-secondary px-2.5 sm:px-3 text-muted-foreground hover:text-foreground">
                <ShoppingCart className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline text-xs uppercase tracking-wide font-semibold">Pedidos</span>
              </Button>
            </Link>
            <Link to="/admin/configuracoes">
              <Button variant="ghost" size="sm" className="min-h-[40px] rounded-md hover:bg-secondary px-2.5 sm:px-3 text-muted-foreground hover:text-foreground">
                <Settings className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline text-xs uppercase tracking-wide font-semibold">Config</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="min-h-[40px] hover:bg-destructive/10 hover:text-destructive px-2.5 rounded-md">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-soft mb-2">Gestão</p>
            <h2 className="font-display text-3xl sm:text-4xl text-foreground leading-tight">Seus eventos</h2>
          </div>
          <Link to="/admin/evento/novo">
            <Button className="min-h-[44px] rounded-md bg-primary text-primary-foreground hover:bg-primary/90 ring-premium uppercase tracking-wide text-xs font-semibold px-4">
              <Plus className="h-4 w-4 mr-2" /> Novo evento
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-md" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border hairline rounded-md bg-card/30">
            <div className="w-14 h-14 rounded-full border hairline bg-card flex items-center justify-center mb-5">
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-display text-2xl text-foreground mb-2">Nenhum evento criado</h3>
            <p className="text-muted-foreground text-sm mb-5">Crie seu primeiro evento para começar.</p>
            <Link to="/admin/evento/novo">
              <Button className="min-h-[44px] rounded-md bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wide text-xs font-semibold">
                <Plus className="h-4 w-4 mr-2" /> Criar primeiro evento
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {events.map((event) => (
              <Link key={event.id} to={`/admin/evento/${event.id}`}>
                <Card className="surface-premium hover:border-primary/40 transition-all duration-300 cursor-pointer mb-2.5 group">
                  <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20 group-hover:border-primary/40 transition-all duration-300">
                        <Camera className="h-5 w-5 text-primary-soft" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-xl text-foreground truncate leading-tight">{event.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap uppercase tracking-[0.12em] font-medium">
                          {event.event_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateBR(event.event_date)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Image className="h-3 w-3" /> {event.photo_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {event.visit_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="h-3 w-3" /> {event.selection_count}
                          </span>
                          {event.visit_count > 0 && (() => {
                            const rate = (event.selection_count / event.visit_count) * 100;
                            const display = rate % 1 === 0 ? rate.toFixed(0) : rate.toFixed(1);
                            const color = rate >= 10 ? 'text-[hsl(var(--success))]' : rate >= 5 ? 'text-[hsl(var(--warning))]' : 'text-destructive';
                            return (
                              <span className={`flex items-center gap-1 font-semibold ${color}`}>
                                <TrendingUp className="h-3 w-3" />
                                {display}%
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive rounded-md"
                        onClick={(e) => handleDeleteEvent(e, event)}
                        disabled={deleting === event.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-sm font-semibold uppercase tracking-[0.16em] ${
                          event.status === 'active'
                            ? 'bg-[hsl(var(--success))]/12 text-[hsl(var(--success))] border border-[hsl(var(--success))]/25'
                            : 'bg-secondary text-muted-foreground border hairline'
                        }`}
                      >
                        {event.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;