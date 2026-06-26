import { useEffect, useRef, type FC } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** Confirm button label. Defaults to common:delete. */
  confirmLabel?: string;
  /** Cancel button label. Defaults to common:cancel. */
  cancelLabel?: string;
  /** Visual emphasis of the confirm button. */
  variant?: 'danger' | 'primary';
  /** Disables both buttons (e.g. while the action is in flight). */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Accessible confirmation modal for destructive or irreversible actions. */
export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation('common');
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-state-danger-bg text-state-danger-text hover:bg-state-danger-hover'
      : 'bg-accent text-accent-foreground hover:opacity-90';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-primary/40"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-border-default"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="mt-2 text-sm text-secondary">{message}</p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
          >
            {cancelLabel ?? t('cancel')}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 ${confirmClass}`}
          >
            {confirmLabel ?? t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
};
