import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Camera, LogOut, Image, ShoppingCart, Calendar } from 'lucide-react';

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

      if (!eventsData) {
        setLoading(false);
        return;
      }

      // Fetch counts for each event
      const eventsWithCounts = await Promise.all(
        eventsData.map(async (event) => {
          const [{ count: photoCount }, { count: selectionCount }] = await Promise.all([
            supabase.from('event_photos').select('*', { count: 'exact', head: true }).eq('event_id', event.id),
            supabase.from('selections').select('*', { count: 'exact', head: true }).eq('event_id', event.id),
          ]);
          return {
            ...event,
            photo_count: photoCount || 0,
            selection_count: selectionCount || 0,
          };
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Painel Admin</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/pedidos">
              <Button variant="outline" size="sm" className="min-h-[44px]">
                <ShoppingCart className="h-4 w-4 mr-1" /> Pedidos
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
          <h2 className="text-xl font-semibold text-foreground">Eventos</h2>
          <Link to="/admin/evento/novo">
            <Button className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" /> Novo Evento
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 h-24" />
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum evento criado ainda.</p>
              <Link to="/admin/evento/novo">
                <Button className="mt-4 min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" /> Criar Primeiro Evento
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Link key={event.id} to={`/admin/evento/${event.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer mb-4">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{event.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {event.event_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(event.event_date).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Image className="h-3 w-3" /> {event.photo_count} fotos
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3" /> {event.selection_count} pedidos
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        event.status === 'active'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {event.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
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
