import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { subscribeToToasts, type ToastPayload, type ToastType } from './toastBus';

interface Toast extends ToastPayload {
  id: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, durationMs?: number) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DEFAULT_DURATION_MS = 5000;

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; fg: string; icon: string }> = {
  success: { bg: 'var(--state-success-bg)', border: '#16a34a', fg: 'var(--text-primary)', icon: '✓' },
  error: { bg: 'var(--state-danger-bg)', border: '#dc2626', fg: 'var(--text-primary)', icon: '✕' },
  info: { bg: 'var(--bg-muted)', border: 'var(--accent)', fg: 'var(--text-primary)', icon: 'ℹ' },
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, durationMs = DEFAULT_DURATION_MS) => {
      const id = nextId.current++;
      setToasts((prev) => {
        // Collapse duplicate consecutive messages to avoid spam.
        if (prev.some((t) => t.message === message && t.type === type)) return prev;
        return [...prev, { id, type, message, durationMs }];
      });
      const timer = setTimeout(() => dismiss(id), durationMs);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  // Bridge the framework-agnostic bus (axios interceptor etc.) into React state.
  useEffect(() => {
    const unsubscribe = subscribeToToasts((payload) =>
      showToast(payload.type, payload.message, payload.durationMs)
    );
    return unsubscribe;
  }, [showToast]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const ctx: ToastContextType = {
    showToast,
    success: (m, d) => showToast('success', m, d),
    error: (m, d) => showToast('error', m, d),
    info: (m, d) => showToast('info', m, d),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 'min(380px, calc(100vw - 32px))',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const s = TYPE_STYLES[t.type];
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              onClick={() => dismiss(t.id)}
              style={{
                pointerEvents: 'auto',
                cursor: 'pointer',
                background: s.bg,
                color: s.fg,
                border: `1px solid ${s.border}`,
                borderLeft: `4px solid ${s.border}`,
                borderRadius: 8,
                padding: '10px 14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                fontSize: 14,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <span style={{ color: s.border, fontWeight: 700 }} aria-hidden="true">
                {s.icon}
              </span>
              <span style={{ flex: 1 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (ctx === undefined) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
