import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface FieldChange {
  label: string;
  oldValue: string;
  newValue: string;
}

interface EditConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  changes: FieldChange[];
  loading?: boolean;
}

const EditConfirmationModal = ({ open, onClose, onConfirm, changes, loading }: EditConfirmationModalProps) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))]" />
            Confirmar Alterações
          </DialogTitle>
          <DialogDescription>
            Você está prestes a atualizar este atendimento. Isso afetará as métricas do dashboard e dados financeiros.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 my-2">
          {changes.map((change, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-2.5 text-sm">
              <span className="text-muted-foreground font-medium">{change.label}</span>
              <div className="flex items-center gap-2">
                <span className="line-through text-muted-foreground/60">{change.oldValue}</span>
                <span className="text-foreground">→</span>
                <span className="font-semibold text-foreground">{change.newValue}</span>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="rounded-xl">
            {loading ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditConfirmationModal;
