// Framework-agnostic toast bus. Lets non-React modules (e.g. the axios
// interceptor in services/api.ts) push toasts without a React context.
export type ToastType = 'success' | 'error' | 'info';

export interface ToastPayload {
  type: ToastType;
  /** Pre-translated message text. */
  message: string;
  /** Optional auto-dismiss override in ms. */
  durationMs?: number;
}

type Listener = (toast: ToastPayload) => void;

const listeners = new Set<Listener>();

export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitToast(toast: ToastPayload): void {
  for (const listener of listeners) listener(toast);
}
