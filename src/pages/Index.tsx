import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Camera, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Event {
  id: string;
  name: string;
  slug: string;
  event_date: string | null;
}

const Index = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, name, slug, event_date')
        .eq('status', 'active')
        .order('event_date', { ascending: false });
      setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card py-6">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Camera className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Galeria de Eventos</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground mb-8 text-lg">
          Selecione um evento para ver e escolher suas fotos favoritas.
        </p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 h-32" />
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-center text-muted-foreground py-16 text-lg">
            Nenhum evento disponível no momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Link key={event.id} to={`/evento/${event.slug}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-card-foreground">{event.name}</h2>
                      {event.event_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(event.event_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t py-4 mt-auto">
        <div className="container mx-auto px-4 flex justify-between items-center text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Galeria de Eventos</span>
          <Link to="/admin" className="hover:text-primary transition-colors">
            Área Admin
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Index;
