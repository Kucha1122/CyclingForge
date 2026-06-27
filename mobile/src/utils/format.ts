import i18n from '../i18n';
import {
  getLocale as getLocaleShared,
  formatDate as fmtDate,
  formatNumber as fmtNumber,
} from '@cyclingforge/shared';

export function getLocale(): string {
  return getLocaleShared(i18n.language);
}

export function formatDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  return fmtDate(date, getLocale(), options);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return fmtNumber(value, getLocale(), options);
}

export function formatTime(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'object' && 'getTime' in date ? date : new Date(date);
  return d.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', ...options });
}

/** Seconds -> "1h 37m" / "45m" / "30s". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
