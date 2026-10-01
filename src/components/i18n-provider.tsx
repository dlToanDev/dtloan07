'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  isValidLocale,
  getTranslation,
  type Locale,
} from '@/lib/i18n';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, fallback?: string) => string;
  isPending: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getClientInitialLocale(initialLocale?: Locale): Locale {
  if (typeof window === 'undefined') return initialLocale || DEFAULT_LOCALE;

  // 1. Try reading cookie
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`));
  if (match && isValidLocale(match[1])) {
    return match[1];
  }

  // 2. Try localStorage
  try {
    const stored = localStorage.getItem('locale');
    if (stored && isValidLocale(stored)) {
      return stored;
    }
  } catch {
    // Ignore localStorage errors
  }

  return initialLocale || DEFAULT_LOCALE;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const detected = getClientInitialLocale(initialLocale);
    if (detected !== locale) {
      setLocaleState(detected);
      document.documentElement.lang = detected;
    }
  }, [initialLocale]);

  const applyLocale = useCallback(
    (newLocale: Locale) => {
      if (!isValidLocale(newLocale)) return;

      setLocaleState(newLocale);
      document.documentElement.lang = newLocale;

      // 1. Save in cookie (1 year TTL)
      document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

      // 2. Save in localStorage
      try {
        localStorage.setItem('locale', newLocale);
      } catch {
        // Ignore localStorage error
      }

      // 3. Refresh server components
      startTransition(() => {
        router.refresh();
      });
    },
    [router],
  );

  const toggleLocale = useCallback(() => {
    const nextLocale: Locale = locale === 'vi' ? 'en' : 'vi';
    applyLocale(nextLocale);
  }, [locale, applyLocale]);

  const t = useCallback(
    (key: string, fallback?: string) => {
      return getTranslation(locale, key, fallback);
    },
    [locale],
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale: applyLocale,
        toggleLocale,
        t,
        isPending,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      toggleLocale: () => {},
      t: (key: string, fallback?: string) => getTranslation(DEFAULT_LOCALE, key, fallback),
      isPending: false,
    };
  }
  return ctx;
}

export const useLanguage = useI18n;
export const useTranslation = useI18n;
