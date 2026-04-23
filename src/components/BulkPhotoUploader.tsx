import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createThumbnail, createPreview, generatePhotoCode } from '@/lib/image-compression';
import { extractCapturedAt } from '@/lib/exif-utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, RotateCcw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UploadItem {
  file: File;
  status: 'queued' | 'compressing' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  retries: number;
}

interface BulkPhotoUploaderProps {
  eventId: string;
  existingPhotoCount: number;
  onUploadComplete: (count: number) => void;
}

const MAX_CONCURRENT = 6;
const MAX_RETRIES = 3;

const BulkPhotoUploader = ({ eventId, existingPhotoCount, onUploadComplete }: BulkPhotoUploaderProps) => {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const abortRef = useRef(false);
  const activeCount = useRef(0);
  const startIndexRef = useRef(existingPhotoCount);
  const processedRef = useRef(0);

  const updateItem = (index: number, updates: Partial<UploadItem>) => {
    setQueue(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const newItems: UploadItem[] = imageFiles.map(file => ({
      file,
      status: 'queued',
      progress: 0,
      retries: 0,
    }));

    setQueue(prev => [...prev, ...newItems]);
    toast.info(`${imageFiles.length} fotos adicionadas à fila.`);
  }, []);

  const uploadSinglePhoto = async (item: UploadItem, globalIndex: number): Promise<boolean> => {
    const photoIndex = startIndexRef.current + globalIndex;
    const photoCode = generatePhotoCode(photoIndex);
    const timestamp = Date.now();
    const baseName = `${timestamp}_${globalIndex}`;

    try {
      updateItem(globalIndex, { status: 'compressing', progress: 5 });

      // Extract EXIF in parallel with compression
      const [thumbnail, preview, capturedAt] = await Promise.all([
        createThumbnail(item.file),
        createPreview(item.file),
        extractCapturedAt(item.file),
      ]);

      updateItem(globalIndex, { status: 'uploading', progress: 30 });

      const [origRes, thumbRes, prevRes] = await Promise.all([
        supabase.storage.from('event-photos').upload(`${eventId}/originals/${baseName}.jpg`, item.file, { contentType: 'image/jpeg' }),
        supabase.storage.from('event-photos').upload(`${eventId}/thumbnails/${baseName}.jpg`, thumbnail, { contentType: 'image/jpeg' }),
        supabase.storage.from('event-photos').upload(`${eventId}/previews/${baseName}.jpg`, preview, { contentType: 'image/jpeg' }),
      ]);

      if (origRes.error || thumbRes.error || prevRes.error) {
        const msg = origRes.error?.message || thumbRes.error?.message || prevRes.error?.message || 'Upload falhou';
        throw new Error(msg);
      }

      updateItem(globalIndex, { progress: 80 });

      const { error: dbError } = await supabase.from('event_photos').insert({
        event_id: eventId,
        storage_path: origRes.data.path,
        thumbnail_path: thumbRes.data.path,
        preview_path: prevRes.data.path,
        photo_code: photoCode,
        sort_order: photoIndex,
        captured_at: capturedAt || new Date().toISOString(),
                filename: item.file.name,
      });

      if (dbError) throw new Error(dbError.message);

      updateItem(globalIndex, { status: 'done', progress: 100 });
      return true;
    } catch (err: any) {
      console.error(`Upload error for file ${globalIndex}:`, err);
      updateItem(globalIndex, { status: 'error', error: err.message, progress: 0 });
      return false;
    }
  };

  const processQueue = useCallback(async (items: UploadItem[]) => {
    setIsUploading(true);
    abortRef.current = false;
    activeCount.current = 0;
    processedRef.current = 0;
    startIndexRef.current = existingPhotoCount;

    const results = new Array(items.length).fill(false);

    const processItem = async (index: number) => {
      if (abortRef.current) return;
      const item = items[index];
      if (!item || item.status === 'done') return;

      activeCount.current++;
      let success = await uploadSinglePhoto(item, index);

      let retries = 0;
      while (!success && retries < MAX_RETRIES && !abortRef.current) {
        retries++;
        updateItem(index, { retries, status: 'queued', error: undefined });
        await new Promise(r => setTimeout(r, 1000 * retries));
        success = await uploadSinglePhoto(item, index);
      }

      results[index] = success;
      activeCount.current--;
      processedRef.current++;
    };

    let nextIndex = 0;
    const runNext = async (): Promise<void> => {
      while (nextIndex < items.length && !abortRef.current) {
        const currentIndex = nextIndex++;
        await processItem(currentIndex);
      }
    };

    const workers = Array.from({ length: Math.min(MAX_CONCURRENT, items.length) }, () => runNext());
    await Promise.all(workers);

    const successCount = results.filter(Boolean).length;
    const failCount = results.filter(r => !r).length;

    setIsUploading(false);

    if (successCount > 0) {
      onUploadComplete(successCount);
      toast.success(`${successCount} fotos enviadas com sucesso!`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} fotos falharam após ${MAX_RETRIES} tentativas.`);
    }
  }, [eventId, existingPhotoCount, onUploadComplete]);

  const startUpload = () => {
    const pending = queue.filter(i => i.status !== 'done');
    if (pending.length === 0) return;
    processQueue(queue);
  };

  const retryFailed = () => {
    setQueue(prev => prev.map(item =>
      item.status === 'error' ? { ...item, status: 'queued', error: undefined, retries: 0, progress: 0 } : item
    ));
    const retryItems = queue.map(item =>
      item.status === 'error' ? { ...item, status: 'queued' as const, error: undefined, retries: 0, progress: 0 } : item
    );
    processQueue(retryItems);
  };

  const cancelUpload = () => {
    abortRef.current = true;
    setIsUploading(false);
  };

  const clearQueue = () => {
    if (isUploading) return;
    setQueue([]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const doneCount = queue.filter(i => i.status === 'done').length;
  const errorCount = queue.filter(i => i.status === 'error').length;
  const totalCount = queue.length;
  const overallProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const activeItems = queue.filter(i => i.status === 'compressing' || i.status === 'uploading');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Fotos ({existingPhotoCount + doneCount})</span>
          {queue.length > 0 && !isUploading && (
            <Button variant="ghost" size="sm" onClick={clearQueue}>
              <X className="h-4 w-4 mr-1" /> Limpar fila
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div onDrop={handleDrop} onDragOver={handleDragOver} className="relative">
          <label
            htmlFor="bulk-photo-upload"
            className="flex flex-col items-center justify-center gap-2 min-h-[100px] border-2 border-dashed border-input rounded-lg cursor-pointer hover:border-primary transition-colors p-6"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-muted-foreground text-center text-sm">
              Arraste fotos aqui ou clique para selecionar
            </span>
            <span className="text-xs text-muted-foreground">
              Suporta milhares de fotos • Upload paralelo • EXIF automático
            </span>
          </label>
          <input
            id="bulk-photo-upload"
            type="file"
            accept="image/*"
            multiple
            // @ts-ignore
            webkitdirectory=""
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
            disabled={isUploading}
          />
        </div>

        <div className="flex gap-2">
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
              disabled={isUploading}
            />
            <Button variant="outline" className="w-full min-h-[44px]" asChild>
              <span><Upload className="h-4 w-4 mr-2" /> Selecionar Fotos</span>
            </Button>
          </label>
        </div>

        {totalCount > 0 && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {isUploading ? 'Enviando...' : doneCount === totalCount ? 'Concluído!' : 'Pronto para enviar'}
                </span>
                <span className="font-medium text-foreground">
                  {doneCount}/{totalCount} ({overallProgress}%)
                </span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>

            <div className="flex flex-wrap gap-3 text-xs">
              {doneCount > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> {doneCount} enviadas
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-3 w-3" /> {errorCount} com erro
                </span>
              )}
              {activeItems.length > 0 && (
                <span className="flex items-center gap-1 text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" /> {activeItems.length} em andamento
                </span>
              )}
            </div>

            {activeItems.length > 0 && (
              <div className="space-y-1 max-h-[120px] overflow-y-auto">
                {activeItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                    <span className="truncate flex-1">{item.file.name}</span>
                    <span className="shrink-0">
                      {item.status === 'compressing' ? 'Comprimindo...' : `${item.progress}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {errorCount > 0 && !isUploading && (
              <div className="space-y-1 max-h-[100px] overflow-y-auto bg-destructive/5 rounded-md p-2">
                {queue.filter(i => i.status === 'error').slice(0, 10).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.file.name}</span>
                  </div>
                ))}
                {errorCount > 10 && (
                  <span className="text-xs text-destructive">...e mais {errorCount - 10}</span>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {!isUploading && doneCount < totalCount && (
                <Button onClick={startUpload} className="flex-1 min-h-[44px]">
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar {totalCount - doneCount} fotos
                </Button>
              )}
              {isUploading && (
                <Button variant="destructive" onClick={cancelUpload} className="flex-1 min-h-[44px]">
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
              )}
              {errorCount > 0 && !isUploading && (
                <Button variant="outline" onClick={retryFailed} className="min-h-[44px]">
                  <RotateCcw className="h-4 w-4 mr-2" /> Retentar {errorCount}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkPhotoUploader;
