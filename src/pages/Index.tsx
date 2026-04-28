import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ImageOff, ArrowRight, Camera, ShieldCheck, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import logoFotoPedido from '@/assets/logo-fotopedido.png';
import PremiumEventCard, { PremiumEvent } from '@/components/PremiumEventCard';
import PhotographerCTAModal from '@/components/PhotographerCTAModal';

interface RawEvent {
  id: string;
  name: string;
  slug: string;
  event_date: string | null;
  location: string | null;
  cover_photo_id: string | null;
  tenant_id: string;
}

const Index = () => {
  const [events, setEvents] = useState<PremiumEvent[]>([]);
  const [photographerByTenant, setPhotographerByTenant] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [ctaOpen, setCtaOpen] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: rawEventsData } = await supabase
        .from('events')
        .select('id, name, slug, event_date, location, cover_photo_id, tenant_id' as any)
        .eq('status', 'active')
        .order('event_date', { ascending: false });

      const rawEvents = (rawEventsData || []) as unknown as RawEvent[];
      if (rawEvents.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const tenantIds = Array.from(new Set(rawEvents.map((e) => e.tenant_id).filter(Boolean)));
      const { data: settingsData } = await supabase
        .from('photographer_settings')
        .select('tenant_id, photographer_name')
        .in('tenant_id', tenantIds);

      const tenantNameMap: Record<string, string> = {};
      (settingsData || []).forEach((s: any) => {
        if (s.tenant_id && s.photographer_name) tenantNameMap[s.tenant_id] = s.photographer_name;
      });
      setPhotographerByTenant(tenantNameMap);

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
          tenant_id: ev.tenant_id,
        };
      });

      setEvents(enriched);
      setLoading(false);
    };
    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar — minimal editorial nav */}
      <nav className="relative z-20 border-b hairline">
        <div className="container mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoFotoPedido} alt="FotoPedido" width={32} height={32} className="w-8 h-8 rounded-md" />
            <span className="font-display text-2xl text-foreground leading-none tracking-tight">FotoPedido</span>
          </div>
          <Link
            to="/admin/login"
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Acesso fotógrafo
          </Link>
        </div>
      </nav>

      {/* HERO — editorial premium, hybrid (client-first + B2B mention) */}
      <section className="relative overflow-hidden border-b hairline">
        {/* Background ambient layers — restrained, no neon */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-primary/[0.10] blur-[120px]" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, hsl(0 0% 100% / 0.7) 0 1px, transparent 1px 32px)',
            }}
          />
        </div>

        <div className="relative container mx-auto px-5 sm:px-8 py-16 sm:py-24 lg:py-28">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border hairline bg-card/40 backdrop-blur-sm px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground mb-7">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Galerias profissionais de eventos
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.95] text-foreground">
              Suas fotos do evento.
              <br />
              <span className="italic text-primary-soft">Selecionadas com elegância.</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Encontre o evento, escolha suas favoritas e finalize seu pedido em poucos toques.
              Uma experiência refinada, criada para clientes de fotógrafos profissionais.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#eventos"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold tracking-wide hover:bg-primary/90 transition-all duration-200 ring-premium"
              >
                Ver eventos disponíveis
                <ArrowRight className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => setCtaOpen(true)}
                className="group relative inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md border border-primary/40 bg-card/60 backdrop-blur-sm text-foreground text-sm font-semibold tracking-wide hover:bg-primary/10 hover:border-primary transition-all duration-200 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]"
              >
                Sou fotógrafo
                <ArrowRight className="h-4 w-4 text-primary-soft group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            {/* Trust strip */}
            <div className="mt-12 grid grid-cols-3 gap-6 max-w-xl mx-auto pt-8 border-t hairline">
              {[
                { icon: ShieldCheck, label: 'Imagens protegidas' },
                { icon: Camera, label: 'Qualidade profissional' },
                { icon: Sparkles, label: 'Pedido em segundos' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon className="h-4 w-4 text-primary-soft" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-center leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* B2B secondary strip — discreet */}
        <div className="relative border-t hairline bg-card/30">
          <div className="container mx-auto px-5 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
            <span className="text-xs text-muted-foreground">
              É fotógrafo profissional?
            </span>
            <button
              type="button"
              onClick={() => setCtaOpen(true)}
              className="text-xs font-semibold text-primary-soft hover:text-primary transition-colors inline-flex items-center gap-1 uppercase tracking-[0.18em]"
            >
              Conheça a plataforma
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>

      {/* EVENTS GRID */}
      <main id="eventos" className="container mx-auto px-5 sm:px-8 py-14 sm:py-20 flex-1">
        <div className="flex items-end justify-between mb-8 sm:mb-10">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-soft mb-2">
              Galeria
            </p>
            <h2 className="font-display text-3xl sm:text-4xl text-foreground leading-tight">
              Eventos disponíveis
            </h2>
          </div>
          {!loading && events.length > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:block uppercase tracking-[0.18em] font-medium">
              {events.length} {events.length === 1 ? 'evento' : 'eventos'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i}>
                <Skeleton className="aspect-square rounded-md" />
                <Skeleton className="h-5 w-3/4 mt-3" />
                <Skeleton className="h-3 w-1/2 mt-2" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border hairline rounded-md bg-card/30">
            <div className="w-14 h-14 rounded-full border hairline flex items-center justify-center mb-5">
              <ImageOff className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-display text-2xl text-foreground mb-2">Nenhum evento publicado</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Os eventos aparecerão aqui assim que forem publicados pelos fotógrafos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {events.map((event, index) => (
              <PremiumEventCard
                key={event.id}
                event={event}
                photographerName={photographerByTenant[event.tenant_id || ''] || 'FotoPedido'}
                index={index}
              />
            ))}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t hairline py-8 mt-auto">
        <div className="container mx-auto px-5 sm:px-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={logoFotoPedido} alt="" width={20} height={20} className="w-5 h-5 rounded" />
            <span className="font-display text-base text-foreground">FotoPedido</span>
            <span className="text-muted-foreground/60">© {new Date().getFullYear()}</span>
          </div>
          <Link to="/admin" className="hover:text-primary-soft transition-colors uppercase tracking-[0.18em] font-semibold">
            Área do fotógrafo
          </Link>
        </div>
      </footer>

      <PhotographerCTAModal open={ctaOpen} onOpenChange={setCtaOpen} />
    </div>
  );
};

export default Index;