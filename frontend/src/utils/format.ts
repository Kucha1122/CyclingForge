import i18n from '../i18n';

const localeMap: Record<string, string> = {
  pl: 'pl-PL',
  en: 'en-US',
};

export function getLocale(): string {
  const lng = i18n.language?.split('-')[0] ?? 'pl';
  return localeMap[lng] ?? localeMap.pl;
}

export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'object' && 'getTime' in date ? date : new Date(date);
  return d.toLocaleDateString(getLocale(), options);
}

export function formatDateTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'object' && 'getTime' in date ? date : new Date(date);
  return d.toLocaleString(getLocale(), options);
}

export function formatTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'object' && 'getTime' in date ? date : new Date(date);
  return d.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', ...options });
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(getLocale(), options);
}
