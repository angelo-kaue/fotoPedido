import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Phone, Search, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Atendimento {
  id: string;
  order_id: string | null;
  customer_name: string;
  whatsapp: string;
  event_id: string;
  event_name: string;
  quantity: number;
  final_price: number;
  payment_method: string;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo', color: 'bg-primary/15 text-primary' },
  { value: 'em_atendimento', label: 'Em atendimento', color: 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]' },
  { value: 'pago', label: 'Pago', color: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' },
  { value: 'entregue', label: 'Entregue', color: 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]' },
];

const PAYMENT_OPTIONS = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'outro', label: 'Outro' },
];

const PAGE_SIZE = 50;

const AdminAtendimentos = () => {
  const navigate = useNavigate();
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchAtendimentos = useCallback(async (pageNum: number, searchTerm: string, append = false) => {
    setLoading(true);
    let query = supabase
      .from('atendimentos')
      .select('*, events(name)')
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (searchTerm.trim()) {
      query = query.or(`customer_name.ilike.%${searchTerm}%,whatsapp.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const mapped = (data || []).map((a: any) => ({
      ...a,
      event_name: a.events?.name || 'Evento',
    }));

    setHasMore(mapped.length === PAGE_SIZE);
    setAtendimentos(prev => append ? [...prev, ...mapped] : mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAtendimentos(0, search);
  }, []);

  const handleSearch = () => {
    setPage(0);
    fetchAtendimentos(0, search);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchAtendimentos(next, search, true);
  };

  const updateField = async (id: string, field: string, value: any) => {
    const { error } = await supabase
      .from('atendimentos')
      .update({ [field]: value })
      .eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar');
      return;
    }
    setAtendimentos(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    toast.success('Atualizado!');
  };

  const formatWhatsapp = (wa: string) => {
    if (wa.length === 11) return `(${wa.slice(0, 2)}) ${wa.slice(2, 7)}-${wa.slice(7)}`;
    if (wa.length === 10) return `(${wa.slice(0, 2)}) ${wa.slice(2, 6)}-${wa.slice(6)}`;
    return wa;
  };

  const formatDateTime = (dt: string) =>
    new Date(dt).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/60 backdrop-blur-xl py-3">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="min-w-[44px] min-h-[44px] hover:bg-primary/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Atendimentos</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou WhatsApp..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="pl-9 min-h-[44px] rounded-xl border-border/50 bg-secondary/50"
            />
          </div>
          <Button onClick={handleSearch} className="min-h-[44px] rounded-xl">Buscar</Button>
        </div>

        {/* List */}
        {loading && atendimentos.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : atendimentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum atendimento</h3>
            <p className="text-muted-foreground text-sm">Os atendimentos serão criados automaticamente quando novos pedidos forem feitos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {atendimentos.map((a) => {
              const statusConfig = STATUS_OPTIONS.find(s => s.value === a.status);
              const isEditing = editingId === a.id;

              return (
                <Card key={a.id} className="border-border/50 bg-card/80">
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{a.customer_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground">{a.event_name} • {formatDateTime(a.created_at)}</p>
                      </div>
                      <select
                        value={a.status}
                        onChange={e => updateField(a.id, 'status', e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer ${statusConfig?.color || ''}`}
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* WhatsApp */}
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/55${a.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--success))] hover:underline font-medium"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {formatWhatsapp(a.whatsapp)}
                      </a>
                    </div>

                    {/* Inline edit row */}
                    <div className="flex flex-wrap items-center gap-2 bg-secondary/50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Qtd:</span>
                        <input
                          type="number"
                          value={a.quantity}
                          min={0}
                          onChange={e => updateField(a.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-14 text-sm text-center bg-background border border-border/50 rounded-lg py-1 text-foreground"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Valor:</span>
                        <input
                          type="number"
                          value={a.final_price}
                          min={0}
                          step={0.01}
                          onChange={e => updateField(a.id, 'final_price', parseFloat(e.target.value) || 0)}
                          className="w-20 text-sm text-center bg-background border border-border/50 rounded-lg py-1 text-foreground"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Pagamento:</span>
                        <select
                          value={a.payment_method}
                          onChange={e => updateField(a.id, 'payment_method', e.target.value)}
                          className="text-sm bg-background border border-border/50 rounded-lg py-1 px-2 text-foreground cursor-pointer"
                        >
                          {PAYMENT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {hasMore && (
              <Button
                variant="outline"
                className="w-full min-h-[44px] rounded-xl border-border/50"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? 'Carregando...' : 'Carregar mais'}
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminAtendimentos;
