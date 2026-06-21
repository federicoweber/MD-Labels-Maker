import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A small confirmation modal (no native dialog). */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-background p-6"
        style={{ boxShadow: 'inset 0 0 0 1px #000' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-bold tracking-wide uppercase">{title}</h2>
        {message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
