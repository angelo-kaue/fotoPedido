import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, LogOut, Image, ShoppingCart, Calendar, Settings, ChevronRight, FolderOpen, Trash2, Camera, Eye, TrendingUp } from 'lucide-react';
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
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
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
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/60 backdrop-blur-xl py-3">
        <div className="container mx-auto px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoFotoPedido} alt="FotoPedido" width={36} height={36} className="w-9 h-9 rounded-lg shadow-sm flex-shrink-0" />
            <h1 className="text-lg font-bold text-foreground truncate hidden sm:block">FotoPedido</h1>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Link to="/admin/pedidos">
              <Button variant="outline" size="sm" className="min-h-[40px] rounded-xl border-border/50 hover:bg-primary/10 hover:border-primary/30 px-2.5 sm:px-3">
                <ShoppingCart className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Pedidos</span>
              </Button>
            </Link>
            <Link to="/admin/configuracoes">
              <Button variant="outline" size="sm" className="min-h-[40px] rounded-xl border-border/50 hover:bg-primary/10 hover:border-primary/30 px-2.5 sm:px-3">
                <Settings className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Config</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="min-h-[40px] hover:bg-destructive/10 hover:text-destructive px-2.5">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Eventos</h2>
          <Link to="/admin/evento/novo">
            <Button className="min-h-[44px] rounded-xl shadow-lg glow-primary bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-400">
              <Plus className="h-4 w-4 mr-2" /> Novo Evento
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum evento criado</h3>
            <p className="text-muted-foreground text-sm mb-4">Crie seu primeiro evento para começar.</p>
            <Link to="/admin/evento/novo">
              <Button className="min-h-[44px] rounded-xl bg-gradient-to-r from-primary to-blue-500">
                <Plus className="h-4 w-4 mr-2" /> Criar Primeiro Evento
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link key={event.id} to={`/admin/evento/${event.id}`}>
                <Card className="hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.01] hover:border-primary/30 transition-all duration-300 cursor-pointer mb-3 border-border/50 bg-card/80 group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/15 group-hover:border-primary/40 group-hover:shadow-md group-hover:shadow-primary/15 transition-all duration-300">
                        <Camera className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground truncate">{event.name}</h3>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
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
                          {event.visit_count > 0 && (
                            <span className="flex items-center gap-1 text-primary font-semibold">
                              <TrendingUp className="h-3 w-3" />
                              {((event.selection_count / event.visit_count) * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDeleteEvent(e, event)}
                        disabled={deleting === event.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          event.status === 'active'
                            ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]'
                            : 'bg-muted text-muted-foreground'
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
