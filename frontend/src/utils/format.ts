import i18n from '../i18n';
import { getLocale as getLocaleShared, formatDate as fmtDate, formatDateTime as fmtDateTime, formatTime as fmtTime, formatNumber as fmtNumber } from '@cyclingforge/shared';

export function getLocale(): string {
  return getLocaleShared(i18n.language);
}

export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  return fmtDate(date, getLocale(), options);
}

export function formatDateTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  return fmtDateTime(date, getLocale(), options);
}

export function formatTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  return fmtTime(date, getLocale(), options);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return fmtNumber(value, getLocale(), options);
}
