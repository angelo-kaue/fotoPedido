import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, Eye, ShoppingCart } from 'lucide-react';

type RangeKey = '7' | '14' | '30';

interface DayPoint {
  date: string; // ISO yyyy-mm-dd
  label: string; // dd/mm
  visits: number;
  orders: number;
}

interface Props {
  tenantId: string | null | undefined;
}

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '7', label: '7 dias' },
  { key: '14', label: '14 dias' },
  { key: '30', label: '30 dias' },
];

const PerformanceChart = ({ tenantId }: Props) => {
  const [range, setRange] = useState<RangeKey>('14');
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<DayPoint[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const days = parseInt(range, 10);

      // Build UTC-based start: midnight UTC of (today - (days-1))
      const now = new Date();
      const startUtc = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (days - 1),
        0, 0, 0, 0
      ));
      const startIso = startUtc.toISOString();

      const [visitsRes, ordersRes] = await Promise.all([
        supabase
          .from('event_visits')
          .select('created_at')
          .eq('tenant_id', tenantId)
          .gte('created_at', startIso),
        supabase
          .from('selections')
          .select('created_at')
          .eq('tenant_id', tenantId)
          .gte('created_at', startIso),
      ]);

      if (cancelled) return;

      console.log('[PerformanceChart] tenant', tenantId, 'range', days, 'startIso', startIso);
      console.log('[PerformanceChart] visits fetched:', visitsRes.data?.length, 'orders fetched:', ordersRes.data?.length);
      if (visitsRes.error) console.error('[PerformanceChart] visits error:', visitsRes.error);
      if (ordersRes.error) console.error('[PerformanceChart] orders error:', ordersRes.error);

      // Build day buckets keyed by UTC date (yyyy-mm-dd)
      const map = new Map<string, DayPoint>();
      for (let i = 0; i < days; i++) {
        const d = new Date(startUtc);
        d.setUTCDate(startUtc.getUTCDate() + i);
        const iso = d.toISOString().split('T')[0];
        const label = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        map.set(iso, { date: iso, label, visits: 0, orders: 0 });
      }

      (visitsRes.data || []).forEach((v: any) => {
        const iso = new Date(v.created_at).toISOString().split('T')[0];
        const p = map.get(iso);
        if (p) p.visits += 1;
      });
      (ordersRes.data || []).forEach((o: any) => {
        const iso = new Date(o.created_at).toISOString().split('T')[0];
        const p = map.get(iso);
        if (p) p.orders += 1;
      });

      setPoints(Array.from(map.values()));
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [tenantId, range]);

  const totals = useMemo(() => {
    const visits = points.reduce((s, p) => s + p.visits, 0);
    const orders = points.reduce((s, p) => s + p.orders, 0);
    const conv = visits > 0 ? (orders / visits) * 100 : 0;
    return { visits, orders, conv };
  }, [points]);

  const hasData = totals.visits > 0 || totals.orders > 0;
  const convDisplay = totals.conv % 1 === 0 ? totals.conv.toFixed(0) : totals.conv.toFixed(1);

  return (
    <Card className="surface-premium overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-soft mb-1.5">
              Performance
            </p>
            <h3 className="font-display text-2xl sm:text-[26px] text-foreground leading-tight">
              Visitas e pedidos
            </h3>
          </div>

          {/* Range filter */}
          <div className="inline-flex items-center gap-1 p-1 rounded-md border hairline bg-secondary/40 self-start sm:self-end">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] rounded transition-all duration-200 ${
                  range === r.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
              <Eye className="h-3 w-3" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Visitas</span>
            </div>
            <p className="font-display text-2xl sm:text-3xl text-foreground leading-none">{totals.visits}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-primary-soft mb-1.5">
              <ShoppingCart className="h-3 w-3" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Pedidos</span>
            </div>
            <p className="font-display text-2xl sm:text-3xl text-foreground leading-none">{totals.orders}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[hsl(var(--success))] mb-1.5">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Conversão</span>
            </div>
            <p className="font-display text-2xl sm:text-3xl text-foreground leading-none">{convDisplay}%</p>
          </div>
        </div>

        {/* Chart */}
        {loading ? (
          <Skeleton className="h-[260px] rounded-md" />
        ) : !hasData ? (
          <div className="h-[260px] flex flex-col items-center justify-center text-center border hairline rounded-md bg-card/30">
            <div className="w-12 h-12 rounded-full border hairline bg-card flex items-center justify-center mb-4">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-display text-lg text-foreground mb-1">Nenhum dado ainda</p>
            <p className="text-xs text-muted-foreground max-w-[260px]">
              Os dados aparecerão conforme visitantes acessarem seus eventos.
            </p>
          </div>
        ) : (
          <div className="h-[260px] sm:h-[300px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={32}
                />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.25, strokeWidth: 1 }}
                  contentStyle={{
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                    padding: '10px 12px',
                    boxShadow: '0 8px 24px hsl(var(--background) / 0.6)',
                  }}
                  labelStyle={{
                    color: 'hsl(var(--muted-foreground))',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    marginBottom: 4,
                    fontWeight: 600,
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'visits' ? 'Visitas' : 'Pedidos',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="visits"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  fill="url(#visitsFill)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  animationDuration={500}
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.25}
                  fill="url(#ordersFill)"
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        {hasData && !loading && (
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t hairline">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/70" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Visitas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pedidos</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
};

export default PerformanceChart;