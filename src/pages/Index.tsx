import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Calendar, ImageOff, Camera } from 'lucide-react';
import { formatDateBR } from '@/lib/date-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import logoFotoPedido from '@/assets/logo-fotopedido.png';

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
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.07] rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/[0.04] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
      </div>

      <header className="relative border-b border-border/50 bg-card/30 backdrop-blur-xl py-14">
        <div className="container mx-auto px-4 flex flex-col items-center text-center gap-6">
          <div className="relative animate-fade-in">
            {/* Multi-layer glow behind logo */}
            <div className="absolute inset-0 bg-primary/30 blur-[60px] rounded-full scale-[2.5]" />
            <div className="absolute inset-0 bg-primary/15 blur-[30px] rounded-full scale-[1.8]" />
            <div className="relative w-28 h-28 rounded-3xl bg-card/80 border border-border/50 shadow-2xl shadow-primary/25 flex items-center justify-center backdrop-blur-sm">
              <img src={logoFotoPedido} alt="FotoPedido" width={80} height={80} className="w-20 h-20 object-contain drop-shadow-lg" />
            </div>
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">FotoPedido</h1>
            <p className="text-muted-foreground mt-2 text-base">Selecione um evento para escolher suas fotos</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event, index) => (
              <Link key={event.id} to={`/evento/${event.slug}`}>
                <Card className="hover:shadow-2xl hover:shadow-primary/20 hover:scale-[1.03] hover:border-primary/50 transition-all duration-300 cursor-pointer group border-border/50 bg-card/80 overflow-hidden relative animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  {/* Hover glow overlay */}
                  <div className="absolute -inset-px bg-gradient-to-br from-primary/20 via-transparent to-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardContent className="p-5 flex items-center justify-between gap-4 relative">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/15 group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                        <Camera className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors duration-200">{event.name}</h2>
                        {event.event_date && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary/60" />
                            {formatDateBR(event.event_date, { long: true })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 group-hover:shadow-md group-hover:shadow-primary/10 transition-all duration-300">
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border/50 py-4 mt-auto bg-card/30">
        <div className="container mx-auto px-4 flex justify-between items-center text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} FotoPedido</span>
          <Link to="/admin" className="hover:text-primary transition-colors">
            Área Admin
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Index;
