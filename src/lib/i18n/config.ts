import type { Locale, LocaleOption } from './types';

export const LOCALES: Locale[] = ['vi', 'en'];
export const DEFAULT_LOCALE: Locale = 'vi';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', shortLabel: 'VI' },
  { code: 'en', label: 'English', flag: '🇬🇧', shortLabel: 'EN' },
];

export function isValidLocale(val: unknown): val is Locale {
  return typeof val === 'string' && (val === 'vi' || val === 'en');
}
