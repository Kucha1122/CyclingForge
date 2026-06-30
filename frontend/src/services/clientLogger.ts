// Client-side logger: batches log entries and ships them to the backend's
// /api/client-logs endpoint, which forwards them to Loki. Uses plain fetch (not the
// `api` axios instance) so a logging failure can never trigger the auth interceptor
// or recurse. Entries are flushed on an interval, when the buffer is full, and on
// page unload (via sendBeacon / keepalive).
import { tokenStorage } from './tokenStorage';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface ClientLogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  url?: string;
  stack?: string;
}

const ENDPOINT = '/api/client-logs';
const FLUSH_INTERVAL_MS = 10000;
const MAX_BUFFER = 20;
const APP_VERSION = (import.meta.env?.VITE_APP_VERSION as string | undefined) ?? 'web';

let buffer: ClientLogEntry[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

function payload(entries: ClientLogEntry[]) {
  return JSON.stringify({ platform: 'web', appVersion: APP_VERSION, entries });
}

async function flush(useBeacon = false) {
  if (buffer.length === 0) return;
  const entries = buffer;
  buffer = [];

  const body = payload(entries);
  try {
    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      return;
    }
    const token = tokenStorage.getToken();
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      keepalive: useBeacon,
    });
  } catch {
    // Never let logging break the app; drop on failure.
  }
}

function ensureTimer() {
  if (timer || typeof window === 'undefined') return;
  timer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
}

export function logClient(level: LogLevel, message: string, opts?: { context?: string; stack?: string }) {
  if (!message) return;
  buffer.push({
    level,
    message: String(message).slice(0, 4000),
    context: opts?.context,
    stack: opts?.stack?.slice(0, 8000),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  });
  ensureTimer();
  if (buffer.length >= MAX_BUFFER) void flush();
}

export const clientLogger = {
  debug: (m: string, ctx?: string) => logClient('debug', m, { context: ctx }),
  info: (m: string, ctx?: string) => logClient('info', m, { context: ctx }),
  warn: (m: string, ctx?: string) => logClient('warn', m, { context: ctx }),
  error: (m: string, opts?: { context?: string; stack?: string }) => logClient('error', m, opts),
};

/** Install global error hooks. Call once at app startup. */
export function installGlobalErrorLogging() {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    clientLogger.error(event.message || 'window.onerror', {
      context: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    clientLogger.error(
      reason?.message ? `Unhandled rejection: ${reason.message}` : 'Unhandled promise rejection',
      { stack: reason?.stack },
    );
  });

  window.addEventListener('pagehide', () => void flush(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush(true);
  });
}
