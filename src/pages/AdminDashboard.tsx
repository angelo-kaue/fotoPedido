import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Camera, LogOut, Image, ShoppingCart, Calendar, Settings, ChevronRight, FolderOpen } from 'lucide-react';

interface EventWithCount {
  id: string;
  name: string;
  slug: string;
  event_date: string | null;
  status: string;
  price_per_photo: number;
  photo_count: number;
  selection_count: number;
}

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      if (!eventsData) { setLoading(false); return; }

      const eventsWithCounts = await Promise.all(
        eventsData.map(async (event) => {
          const [{ count: photoCount }, { count: selectionCount }] = await Promise.all([
            supabase.from('event_photos').select('*', { count: 'exact', head: true }).eq('event_id', event.id),
            supabase.from('selections').select('*', { count: 'exact', head: true }).eq('event_id', event.id),
          ]);
          return { ...event, photo_count: photoCount || 0, selection_count: selectionCount || 0 };
        })
      );
      setEvents(eventsWithCounts);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-xl py-3">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
              <Camera className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Painel Admin</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/pedidos">
              <Button variant="outline" size="sm" className="min-h-[44px] rounded-xl">
                <ShoppingCart className="h-4 w-4 mr-1" /> Pedidos
              </Button>
            </Link>
            <Link to="/admin/configuracoes">
              <Button variant="outline" size="sm" className="min-h-[44px] rounded-xl">
                <Settings className="h-4 w-4 mr-1" /> Config
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="min-h-[44px]">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Eventos</h2>
          <Link to="/admin/evento/novo">
            <Button className="min-h-[44px] rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/80">
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
              <Button className="min-h-[44px] rounded-xl">
                <Plus className="h-4 w-4 mr-2" /> Criar Primeiro Evento
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link key={event.id} to={`/admin/evento/${event.id}`}>
                <Card className="hover:shadow-xl hover:scale-[1.01] transition-all duration-200 cursor-pointer mb-3 border-0 shadow-md">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                        <Camera className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground truncate">{event.name}</h3>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          {event.event_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(event.event_date).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Image className="h-3 w-3" /> {event.photo_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="h-3 w-3" /> {event.selection_count}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          event.status === 'active'
                            ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]'
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
