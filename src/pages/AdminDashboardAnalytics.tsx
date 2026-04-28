import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, DollarSign, ShoppingCart, Camera, TrendingUp, Trophy, Calendar } from 'lucide-react';

interface EventMetrics {
  id: string;
  name: string;
  event_date: string | null;
  visits: number;
  orders: number;
  revenue: number;
  photos_sold: number;
  conversion: number;
}

interface DailyMetric {
  date: string;
  revenue: number;
  orders: number;
}

const AdminDashboardAnalytics = () => {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPhotosSold, setTotalPhotosSold] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);
  const [eventMetrics, setEventMetrics] = useState<EventMetrics[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    fetchAnalytics();
  }, [tenantId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch all atendimentos with paid/delivered status
      const { data: atendimentos } = await supabase
        .from('atendimentos')
        .select('event_id, quantity, final_price, status, created_at');

      const paidAtendimentos = (atendimentos || []).filter(
        a => a.status === 'pago' || a.status === 'entregue'
      );

      const allAtendimentos = atendimentos || [];

      // Total metrics
      const revenue = paidAtendimentos.reduce((sum, a) => sum + Number(a.final_price), 0);
      const photosSold = paidAtendimentos.reduce((sum, a) => sum + a.quantity, 0);
      setTotalRevenue(revenue);
      setTotalOrders(allAtendimentos.length);
      setTotalPhotosSold(photosSold);

      // Visits
      const { count: visitCount } = await supabase
        .from('event_visits')
        .select('*', { count: 'exact', head: true });
      setTotalVisits(visitCount || 0);

      // Events
      const { data: events } = await supabase.from('events').select('id, name, event_date').eq('tenant_id', tenantId!);

      const metrics: EventMetrics[] = await Promise.all(
        (events || []).map(async (event) => {
          const { count: visits } = await supabase
            .from('event_visits')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          const eventAtendimentos = allAtendimentos.filter(a => a.event_id === event.id);
          const eventPaid = eventAtendimentos.filter(a => a.status === 'pago' || a.status === 'entregue');

          const eventRevenue = eventPaid.reduce((sum, a) => sum + Number(a.final_price), 0);
          const eventPhotos = eventPaid.reduce((sum, a) => sum + a.quantity, 0);
          const v = visits || 0;

          return {
            id: event.id,
            name: event.name,
            event_date: event.event_date,
            visits: v,
            orders: eventAtendimentos.length,
            revenue: eventRevenue,
            photos_sold: eventPhotos,
            conversion: v > 0 ? (eventAtendimentos.length / v) * 100 : 0,
          };
        })
      );

      setEventMetrics(metrics.sort((a, b) => b.revenue - a.revenue));

      // Daily metrics (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyMap = new Map<string, DailyMetric>();
      paidAtendimentos.forEach(a => {
        const day = new Date(a.created_at).toISOString().split('T')[0];
        if (new Date(day) >= thirtyDaysAgo) {
          const existing = dailyMap.get(day) || { date: day, revenue: 0, orders: 0 };
          existing.revenue += Number(a.final_price);
          existing.orders += 1;
          dailyMap.set(day, existing);
        }
      });

      const daily = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));
      setDailyMetrics(daily);
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const conversionRate = totalVisits > 0 ? ((totalOrders / totalVisits) * 100) : 0;
  const convDisplay = conversionRate % 1 === 0 ? conversionRate.toFixed(0) : conversionRate.toFixed(1);

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  const formatDateBR = (d: string) => {
    const parts = d.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border/50 bg-card/60 backdrop-blur-xl py-3">
          <div className="container mx-auto px-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="min-w-[44px] min-h-[44px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b hairline bg-background/85 backdrop-blur-xl py-3">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="min-w-[44px] min-h-[44px] hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-xl text-foreground leading-none">Dashboard</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-10 space-y-10">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-soft mb-2">Visão geral</p>
          <h2 className="font-display text-3xl sm:text-4xl text-foreground leading-tight">Performance do estúdio</h2>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Receita total', value: formatCurrency(totalRevenue), icon: DollarSign, accent: 'success', sub: 'Pagos / entregues' },
            { label: 'Total pedidos', value: String(totalOrders), icon: ShoppingCart, accent: 'primary' },
            { label: 'Fotos vendidas', value: String(totalPhotosSold), icon: Camera, accent: 'warning' },
            { label: 'Conversão', value: `${convDisplay}%`, icon: TrendingUp, accent: 'primary', sub: `${totalVisits} visitas` },
          ].map((stat, i) => {
            const accentMap: Record<string, string> = {
              success: 'bg-[hsl(var(--success))]/12 text-[hsl(var(--success))] border-[hsl(var(--success))]/25',
              warning: 'bg-[hsl(var(--warning))]/12 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/25',
              primary: 'bg-primary/10 text-primary-soft border-primary/25',
            };
            return (
              <Card key={i} className="surface-premium">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">{stat.label}</span>
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center border ${accentMap[stat.accent]}`}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="font-display text-3xl text-foreground leading-none">{stat.value}</p>
                  {stat.sub && <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-[0.14em]">{stat.sub}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Top Events */}
        <section>
          <div className="flex items-end justify-between mb-5">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-[hsl(var(--warning))]" />
              <h2 className="font-display text-2xl text-foreground leading-none">Ranking de eventos</h2>
            </div>
          </div>
          <div className="space-y-2">
            {eventMetrics.slice(0, 10).map((event, idx) => (
              <Card key={event.id} className="surface-premium">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center font-display text-lg leading-none ${
                    idx === 0 ? 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border border-[hsl(var(--warning))]/30' :
                    idx === 1 ? 'bg-secondary text-foreground border hairline' :
                    idx === 2 ? 'bg-primary/10 text-primary-soft border border-primary/20' :
                    'bg-muted text-muted-foreground border hairline'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg text-foreground truncate leading-tight">{event.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-1 uppercase tracking-[0.12em] font-medium">
                      <span>{event.visits} visitas</span>
                      <span>{event.orders} pedidos</span>
                      <span>{event.photos_sold} fotos</span>
                      <span className={event.conversion >= 10 ? 'text-[hsl(var(--success))]' : event.conversion >= 5 ? 'text-[hsl(var(--warning))]' : ''}>
                        {event.conversion.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <p className="font-display text-lg text-[hsl(var(--success))] whitespace-nowrap leading-none">
                    {formatCurrency(event.revenue)}
                  </p>
                </CardContent>
              </Card>
            ))}
            {eventMetrics.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum evento encontrado.</p>
            )}
          </div>
        </section>

        {/* Daily Metrics */}
        {dailyMetrics.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <Calendar className="h-5 w-5 text-primary-soft" />
              <h2 className="font-display text-2xl text-foreground leading-none">Métricas diárias</h2>
            </div>
            <div className="space-y-1.5">
              {dailyMetrics.map(d => (
                <div key={d.date} className="flex items-center justify-between py-3 px-4 rounded-md surface-premium">
                  <span className="text-sm text-foreground font-medium">{formatDateBR(d.date)}</span>
                  <div className="flex items-center gap-5 text-sm">
                    <span className="text-muted-foreground text-[11px] uppercase tracking-[0.14em] font-semibold">{d.orders} pedido{d.orders !== 1 ? 's' : ''}</span>
                    <span className="font-display text-base text-[hsl(var(--success))]">{formatCurrency(d.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminDashboardAnalytics;