import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isValidLocale } from './config';
import type { Locale } from './types';
import { getTranslation } from './index';

export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const candidate =
      cookieStore.get(LOCALE_COOKIE_NAME)?.value || cookieStore.get('locale')?.value;
    if (candidate && isValidLocale(candidate)) {
      return candidate;
    }
  } catch {
    // cookies() can throw in environments where headers aren't available
  }
  return DEFAULT_LOCALE;
}

export async function getServerTranslator() {
  const locale = await getServerLocale();
  return {
    locale,
    t: (key: string, fallback?: string) => getTranslation(locale, key, fallback),
  };
}
