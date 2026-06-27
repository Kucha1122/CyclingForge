import { LOCALE_MAP } from '../constants/theme';

export function getLocale(language: string): string {
  const lng = language?.split('-')[0] ?? 'pl';
  return LOCALE_MAP[lng] ?? LOCALE_MAP.pl;
}

export function formatDate(
  date: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'object' && 'getTime' in date ? date : new Date(date);
  return d.toLocaleDateString(locale, options);
}

export function formatDateTime(
  date: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'object' && 'getTime' in date ? date : new Date(date);
  return d.toLocaleString(locale, options);
}

export function formatTime(
  date: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'object' && 'getTime' in date ? date : new Date(date);
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', ...options });
}

export function formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(locale, options);
}
