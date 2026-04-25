import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ImageOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import logoFotoPedido from '@/assets/logo-fotopedido.png';
import PremiumEventCard, { PremiumEvent } from '@/components/PremiumEventCard';

interface RawEvent {
  id: string;
  name: string;
  slug: string;
  event_date: string | null;
  location: string | null;
  cover_photo_id: string | null;
}

const Index = () => {
  const [events, setEvents] = useState<PremiumEvent[]>([]);
  const [photographerName, setPhotographerName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [eventsRes, settingsRes] = await Promise.all([
        supabase
          .from('events')
          // cast: 'location' / 'cover_photo_id' are new fields not yet in generated types
          .select('id, name, slug, event_date, location, cover_photo_id' as any)
          .eq('status', 'active')
          .order('event_date', { ascending: false }),
        supabase
          .from('photographer_settings')
          .select('photographer_name')
          .limit(1)
          .single(),
      ]);

      if (settingsRes.data?.photographer_name) {
        setPhotographerName(settingsRes.data.photographer_name);
      }

      const rawEvents = (eventsRes.data || []) as unknown as RawEvent[];
      if (rawEvents.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // For each event, resolve cover photo path:
      // 1. cover_photo_id explicitly set, OR
      // 2. fallback to first uploaded photo by sort_order/captured_at
      const eventIds = rawEvents.map((e) => e.id);
      const explicitCoverIds = rawEvents
        .map((e) => e.cover_photo_id)
        .filter((id): id is string => !!id);

      const [explicitCoversRes, fallbackCoversRes] = await Promise.all([
        explicitCoverIds.length > 0
          ? supabase
              .from('event_photos')
              .select('id, event_id, thumbnail_path, preview_path')
              .in('id', explicitCoverIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('event_photos')
          .select('id, event_id, thumbnail_path, preview_path, sort_order, captured_at')
          .in('event_id', eventIds)
          .order('sort_order', { ascending: true })
          .order('captured_at', { ascending: true }),
      ]);

      const explicitMap = new Map<string, string>();
      (explicitCoversRes.data || []).forEach((p: any) => {
        // prefer the larger preview for cover quality
        explicitMap.set(p.event_id, p.preview_path || p.thumbnail_path);
      });

      const fallbackMap = new Map<string, string>();
      (fallbackCoversRes.data || []).forEach((p: any) => {
        if (!fallbackMap.has(p.event_id)) {
          fallbackMap.set(p.event_id, p.preview_path || p.thumbnail_path);
        }
      });

      const coverPaths: string[] = [];
      const eventCoverPath = new Map<string, string>();
      rawEvents.forEach((ev) => {
        const path = explicitMap.get(ev.id) || fallbackMap.get(ev.id);
        if (path) {
          coverPaths.push(path);
          eventCoverPath.set(ev.id, path);
        }
      });

      // Batch sign all cover URLs in one call (5 min TTL is plenty for listing)
      let signedMap: Record<string, string> = {};
      if (coverPaths.length > 0) {
        try {
          const { data } = await supabase.functions.invoke('get-signed-urls', {
            body: { paths: coverPaths, expiresIn: 600 },
          });
          if (data?.urls) signedMap = data.urls;
        } catch (err) {
          console.error('Failed to sign cover urls', err);
        }
      }

      const enriched: PremiumEvent[] = rawEvents.map((ev) => {
        const path = eventCoverPath.get(ev.id);
        return {
          id: ev.id,
          name: ev.name,
          slug: ev.slug,
          event_date: ev.event_date,
          location: ev.location,
          cover_url: path ? signedMap[path] || null : null,
        };
      });

      setEvents(enriched);
      setLoading(false);
    };
    fetchAll();
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

      <main className="container mx-auto px-4 py-10 flex-1 relative">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {events.map((event, index) => (
              <PremiumEventCard
                key={event.id}
                event={event}
                photographerName={photographerName}
                index={index}
              />
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