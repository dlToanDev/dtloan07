import { translations } from './translations';
import { DEFAULT_LOCALE } from './config';
import type { Locale } from './types';

export * from './types';
export * from './config';
export * from './translations';

export function getTranslation(
  locale: Locale = DEFAULT_LOCALE,
  key: string,
  fallback?: string,
): string {
  const dict = translations[locale] ?? translations[DEFAULT_LOCALE];
  const value = dict?.[key];
  if (typeof value === 'string') {
    return value;
  }
  // Try fallback locale if key not found
  if (locale !== DEFAULT_LOCALE) {
    const fallbackDict = translations[DEFAULT_LOCALE];
    const fallbackVal = fallbackDict?.[key];
    if (typeof fallbackVal === 'string') {
      return fallbackVal;
    }
  }
  return fallback ?? key;
}
