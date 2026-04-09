import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import BulkPhotoUploader from '@/components/BulkPhotoUploader';
import AdminPhotoManager from '@/components/admin/AdminPhotoManager';

const AdminEventForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'novo';

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [pricePerPhoto, setPricePerPhoto] = useState('15.00');
  const [status, setStatus] = useState('active');
  const [saving, setSaving] = useState(false);
  const [existingPhotoCount, setExistingPhotoCount] = useState(0);

  useEffect(() => {
    if (!isNew && id) {
      const fetchEvent = async () => {
        const { data } = await supabase.from('events').select('*').eq('id', id).single();
        if (data) {
          setName(data.name);
          setSlug(data.slug);
          setEventDate(data.event_date || '');
          setPricePerPhoto(String(data.price_per_photo));
          setStatus(data.status);
        }

        const { count } = await supabase
          .from('event_photos')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', id);
        setExistingPhotoCount(count || 0);
      };
      fetchEvent();
    }
  }, [id, isNew]);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (isNew) setSlug(generateSlug(value));
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error('Preencha o nome e o slug.');
      return;
    }
    const price = parseFloat(pricePerPhoto);
    if (isNaN(price) || price < 0) {
      toast.error('Preço inválido.');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const { data, error } = await supabase
          .from('events')
          .insert({
            name: name.trim(),
            slug: slug.trim(),
            event_date: eventDate || null,
            price_per_photo: price,
            status,
          })
          .select('id')
          .single();
        if (error) throw error;
        toast.success('Evento criado com sucesso!');
        navigate(`/admin/evento/${data.id}`);
      } else {
        const { error } = await supabase
          .from('events')
          .update({
            name: name.trim(),
            slug: slug.trim(),
            event_date: eventDate || null,
            price_per_photo: price,
            status,
          })
          .eq('id', id!);
        if (error) throw error;
        toast.success('Evento atualizado!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar evento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card py-4">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">
            {isNew ? 'Novo Evento' : 'Editar Evento'}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do Evento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nome</label>
              <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ex: Formatura Turma 2025" className="min-h-[44px]" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Slug (URL)</label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="formatura-turma-2025" className="min-h-[44px]" />
              <p className="text-xs text-muted-foreground mt-1">/evento/{slug || '...'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Data do Evento</label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="min-h-[44px]" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Preço por Foto (R$)</label>
              <Input type="number" step="0.01" min="0" value={pricePerPhoto} onChange={(e) => setPricePerPhoto(e.target.value)} className="min-h-[44px]" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full min-h-[44px]">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Evento'}
            </Button>
          </CardContent>
        </Card>

        {!isNew && id && (
          <>
            <BulkPhotoUploader
              eventId={id}
              existingPhotoCount={existingPhotoCount}
              onUploadComplete={(count) => setExistingPhotoCount(prev => prev + count)}
            />
            <AdminPhotoManager
              eventId={id}
              onPhotoDeleted={() => setExistingPhotoCount(prev => Math.max(0, prev - 1))}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default AdminEventForm;
