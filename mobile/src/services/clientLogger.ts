// Client-side logger for the mobile app: batches entries and ships them to the
// backend's /api/client-logs endpoint (→ Loki). Uses a bare axios call (not the
// `api` instance) so a logging failure never hits the auth interceptor or recurses.
import axios from 'axios';
import { Platform, AppState } from 'react-native';
import * as Application from 'expo-application';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../stores/authStore';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface ClientLogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  stack?: string;
}

const ENDPOINT = `${API_BASE_URL}/client-logs`;
const FLUSH_INTERVAL_MS = 10000;
const MAX_BUFFER = 20;
const APP_VERSION = Application.nativeApplicationVersion ?? 'mobile';
const PLATFORM = Platform.OS; // 'android' | 'ios'

let buffer: ClientLogEntry[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

async function flush() {
  if (buffer.length === 0) return;
  const entries = buffer;
  buffer = [];
  try {
    const token = useAuthStore.getState().token;
    await axios.post(
      ENDPOINT,
      { platform: PLATFORM, appVersion: APP_VERSION, entries },
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined, timeout: 8000 },
    );
  } catch {
    // Never let logging break the app; drop on failure.
  }
}

function ensureTimer() {
  if (timer) return;
  timer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
}

export function logClient(level: LogLevel, message: string, opts?: { context?: string; stack?: string }) {
  if (!message) return;
  buffer.push({
    level,
    message: String(message).slice(0, 4000),
    context: opts?.context,
    stack: opts?.stack?.slice(0, 8000),
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

let installed = false;

/** Install the global JS error handler and flush-on-background. Call once at startup. */
export function installGlobalErrorLogging() {
  if (installed) return;
  installed = true;

  const ErrorUtilsRef = (global as unknown as { ErrorUtils?: {
    getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
    setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
  } }).ErrorUtils;

  if (ErrorUtilsRef) {
    const previous = ErrorUtilsRef.getGlobalHandler();
    ErrorUtilsRef.setGlobalHandler((error, isFatal) => {
      const err = error as Error;
      clientLogger.error(err?.message || 'Unhandled JS error', {
        context: isFatal ? 'fatal' : 'non-fatal',
        stack: err?.stack,
      });
      void flush();
      previous?.(error, isFatal);
    });
  }

  AppState.addEventListener('change', (state) => {
    if (state !== 'active') void flush();
  });
}
