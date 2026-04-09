import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Trash2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PhotoRow {
  id: string;
  photo_code: string;
  thumbnail_path: string;
  storage_path: string;
  preview_path: string;
  captured_at: string | null;
}

interface AdminPhotoManagerProps {
  eventId: string;
  onPhotoDeleted: () => void;
}

const AdminPhotoManager = ({ eventId, onPhotoDeleted }: AdminPhotoManagerProps) => {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<PhotoRow | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('event_photos')
      .select('id, photo_code, thumbnail_path, storage_path, preview_path, captured_at')
      .eq('event_id', eventId)
      .order('sort_order');
    setPhotos(data || []);
    setLoading(false);

    // Fetch signed URLs for thumbnails
    if (data && data.length > 0) {
      const paths = data.map((p) => p.thumbnail_path);
      const batchSize = 100;
      const urlMap: Record<string, string> = {};
      for (let i = 0; i < paths.length; i += batchSize) {
        const batch = paths.slice(i, i + batchSize);
        try {
          const { data: urlData } = await supabase.functions.invoke('get-signed-urls', {
            body: { paths: batch, expiresIn: 300 },
          });
          if (urlData?.urls) {
            Object.assign(urlMap, urlData.urls);
          }
        } catch {}
      }
      setSignedUrls(urlMap);
    }
  }, [eventId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const filteredPhotos = photos.filter((p) => {
    if (!search.trim()) return true;
    const q = search.replace('#', '').toLowerCase();
    return p.photo_code.toLowerCase().includes(q);
  });

  const handleDeleteClick = async (photo: PhotoRow) => {
    // Check if photo is in any selection
    const { count } = await supabase
      .from('selection_photos')
      .select('*', { count: 'exact', head: true })
      .eq('photo_id', photo.id);

    if (count && count > 0) {
      setDeleteWarning(`Esta foto já faz parte de ${count} pedido(s) de cliente. A exclusão é irreversível.`);
    } else {
      setDeleteWarning(null);
    }
    setDeleteTarget(photo);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      // Delete from storage (all 3 versions)
      const pathsToDelete = [
        deleteTarget.storage_path,
        deleteTarget.thumbnail_path,
        deleteTarget.preview_path,
      ].filter(Boolean);

      await supabase.storage.from('event-photos').remove(pathsToDelete);

      // Delete from database
      const { error } = await supabase
        .from('event_photos')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      // Update local state
      setPhotos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success('Foto excluída com sucesso');
      onPhotoDeleted();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir foto');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
      setDeleteWarning(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Gerenciar Fotos ({photos.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código (#A001)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 min-h-[44px]"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredPhotos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {photos.length === 0 ? 'Nenhuma foto neste evento.' : 'Nenhuma foto encontrada.'}
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                {signedUrls[photo.thumbnail_path] ? (
                  <img
                    src={signedUrls[photo.thumbnail_path]}
                    alt={photo.photo_code}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-1 left-1 bg-foreground/70 text-background text-[10px] font-mono px-1.5 py-0.5 rounded">
                  {photo.photo_code}
                </div>
                <button
                  onClick={() => handleDeleteClick(photo)}
                  className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Excluir foto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir foto {deleteTarget?.photo_code}?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A foto será removida permanentemente do sistema.
              </AlertDialogDescription>
              {deleteWarning && (
                <div className="flex items-start gap-2 mt-2 p-3 bg-destructive/10 rounded-md text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{deleteWarning}</span>
                </div>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default AdminPhotoManager;
