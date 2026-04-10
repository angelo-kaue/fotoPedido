import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Camera, ArrowRight, Calendar, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/80 backdrop-blur-xl py-6">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Galeria de Eventos</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        <p className="text-muted-foreground mb-8 text-lg">
          Selecione um evento para ver e escolher suas fotos favoritas.
        </p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <ImageOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum evento disponível</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Não há eventos publicados no momento. Volte em breve!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Link key={event.id} to={`/evento/${event.slug}`}>
                <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer group border-0 shadow-md">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Camera className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-card-foreground">{event.name}</h2>
                        {event.event_date && (
                          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(event.event_date).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
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
