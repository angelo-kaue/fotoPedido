import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Phone, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import EditConfirmationModal from '@/components/admin/EditConfirmationModal';

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

const FIELD_LABELS: Record<string, string> = {
  quantity: 'Quantidade',
  final_price: 'Valor',
  payment_method: 'Pagamento',
  status: 'Status',
};

const formatFieldValue = (field: string, value: any): string => {
  if (field === 'status') return STATUS_OPTIONS.find(s => s.value === value)?.label || value;
  if (field === 'payment_method') return PAYMENT_OPTIONS.find(p => p.value === value)?.label || value;
  if (field === 'final_price') return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
  return String(value);
};

const AdminAtendimentos = () => {
  const navigate = useNavigate();
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Pending edit state
  const [pendingEdit, setPendingEdit] = useState<{
    id: string;
    field: string;
    oldValue: any;
    newValue: any;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Local draft values for inputs (so we don't auto-save)
  const [drafts, setDrafts] = useState<Record<string, Partial<Atendimento>>>({});

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
    setDrafts({});
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

  // Get current display value (draft or actual)
  const getValue = (a: Atendimento, field: keyof Atendimento) => {
    return drafts[a.id]?.[field] ?? a[field];
  };

  // Stage a change (no save yet)
  const stageChange = (id: string, field: string, value: any) => {
    setDrafts(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  // Request confirmation for a staged change
  const requestConfirmation = (a: Atendimento, field: string, newValue: any) => {
    // Validation
    if (field === 'quantity' && (isNaN(newValue) || newValue < 0)) {
      toast.error('Quantidade deve ser >= 0');
      return;
    }
    if (field === 'final_price' && (isNaN(newValue) || newValue < 0)) {
      toast.error('Valor deve ser >= 0');
      return;
    }
    if (field === 'status' && newValue === 'pago' && getValue(a, 'payment_method') === '') {
      toast.error('Defina o método de pagamento antes de marcar como pago');
      return;
    }

    const oldValue = a[field as keyof Atendimento];
    if (String(oldValue) === String(newValue)) return; // No change

    setPendingEdit({ id: a.id, field, oldValue, newValue });
  };

  // Confirm and apply the edit
  const confirmEdit = async () => {
    if (!pendingEdit) return;
    setConfirmLoading(true);

    const { id, field, oldValue, newValue } = pendingEdit;
    const atendimento = atendimentos.find(a => a.id === id);

    const updateData: Record<string, any> = { [field]: newValue };
    const { error } = await supabase
      .from('atendimentos')
      .update(updateData as any)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar');
      setConfirmLoading(false);
      return;
    }

    // Log edit history
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('order_edit_history').insert({
      order_id: id,
      [`previous_${field === 'final_price' ? 'price' : field}`]: field === 'quantity' ? Number(oldValue) : field === 'final_price' ? Number(oldValue) : String(oldValue),
      [`new_${field === 'final_price' ? 'price' : field}`]: field === 'quantity' ? Number(newValue) : field === 'final_price' ? Number(newValue) : String(newValue),
      edited_by: userData?.user?.id || null,
    } as any);

    // Update local state
    setAtendimentos(prev => prev.map(a => a.id === id ? { ...a, [field]: newValue } : a));
    setDrafts(prev => {
      const copy = { ...prev };
      if (copy[id]) {
        delete copy[id][field as keyof Atendimento];
        if (Object.keys(copy[id]).length === 0) delete copy[id];
      }
      return copy;
    });

    // Highlight row
    setHighlightedId(id);
    setTimeout(() => setHighlightedId(null), 1500);

    setPendingEdit(null);
    setConfirmLoading(false);
    toast.success('Atendimento atualizado! Dashboard atualizado automaticamente.');
  };

  const cancelEdit = () => {
    if (pendingEdit) {
      // Revert draft for this field
      setDrafts(prev => {
        const copy = { ...prev };
        if (copy[pendingEdit.id]) {
          delete copy[pendingEdit.id][pendingEdit.field as keyof Atendimento];
          if (Object.keys(copy[pendingEdit.id]).length === 0) delete copy[pendingEdit.id];
        }
        return copy;
      });
    }
    setPendingEdit(null);
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

  const confirmChanges = pendingEdit
    ? [{
        label: FIELD_LABELS[pendingEdit.field] || pendingEdit.field,
        oldValue: formatFieldValue(pendingEdit.field, pendingEdit.oldValue),
        newValue: formatFieldValue(pendingEdit.field, pendingEdit.newValue),
      }]
    : [];

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
              const currentStatus = getValue(a, 'status') as string;
              const statusConfig = STATUS_OPTIONS.find(s => s.value === currentStatus);
              const isHighlighted = highlightedId === a.id;

              return (
                <Card
                  key={a.id}
                  className={`border-border/50 bg-card/80 transition-all duration-700 ${
                    isHighlighted ? 'ring-2 ring-primary/50 bg-primary/5' : ''
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{a.customer_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground">{a.event_name} • {formatDateTime(a.created_at)}</p>
                      </div>
                      <select
                        value={currentStatus}
                        onChange={e => {
                          stageChange(a.id, 'status', e.target.value);
                          requestConfirmation(a, 'status', e.target.value);
                        }}
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
                          value={getValue(a, 'quantity')}
                          min={0}
                          onChange={e => stageChange(a.id, 'quantity', parseInt(e.target.value) || 0)}
                          onBlur={e => {
                            const v = parseInt(e.target.value) || 0;
                            if (v !== a.quantity) requestConfirmation(a, 'quantity', v);
                          }}
                          className="w-14 text-sm text-center bg-background border border-border/50 rounded-lg py-1 text-foreground"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Valor:</span>
                        <input
                          type="number"
                          value={getValue(a, 'final_price')}
                          min={0}
                          step={0.01}
                          onChange={e => stageChange(a.id, 'final_price', parseFloat(e.target.value) || 0)}
                          onBlur={e => {
                            const v = parseFloat(e.target.value) || 0;
                            if (v !== a.final_price) requestConfirmation(a, 'final_price', v);
                          }}
                          className="w-20 text-sm text-center bg-background border border-border/50 rounded-lg py-1 text-foreground"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Pagamento:</span>
                        <select
                          value={getValue(a, 'payment_method') as string}
                          onChange={e => {
                            stageChange(a.id, 'payment_method', e.target.value);
                            requestConfirmation(a, 'payment_method', e.target.value);
                          }}
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

      <EditConfirmationModal
        open={!!pendingEdit}
        onClose={cancelEdit}
        onConfirm={confirmEdit}
        changes={confirmChanges}
        loading={confirmLoading}
      />
    </div>
  );
};

export default AdminAtendimentos;
