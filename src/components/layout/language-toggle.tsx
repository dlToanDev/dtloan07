'use client';

import { Globe } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { useEffect, useState } from 'react';
import { LOCALE_OPTIONS } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface LanguageToggleProps {
  className?: string;
  variant?: 'button' | 'segmented';
}

const DEFAULT_OPTION = LOCALE_OPTIONS[0] ?? {
  code: 'vi',
  label: 'Tiếng Việt',
  flag: '🇻🇳',
  shortLabel: 'VI',
};

export function LanguageToggle({ className, variant = 'button' }: LanguageToggleProps) {
  const { locale, setLocale, toggleLocale } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={cn('h-9 w-14', className)} aria-hidden="true" />;
  }

  const isVi = locale === 'vi';
  const currentOption = LOCALE_OPTIONS.find((opt) => opt.code === locale) ?? DEFAULT_OPTION;

  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          'border-border bg-muted/50 inline-flex items-center rounded-lg border p-0.5',
          className,
        )}
        role="group"
        aria-label={isVi ? 'Chọn ngôn ngữ' : 'Select language'}
      >
        {LOCALE_OPTIONS.map((opt) => {
          const active = locale === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLocale(opt.code)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                active
                  ? 'bg-background text-foreground font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{opt.flag}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLocale}
      title={
        isVi
          ? 'Đang là Tiếng Việt. Bấm để chuyển sang English'
          : 'Current is English. Click to switch to Tiếng Việt'
      }
      aria-label={isVi ? 'Chuyển sang Tiếng Anh' : 'Switch to Vietnamese'}
      className={cn(
        'hover:bg-muted text-muted-foreground hover:text-foreground hover:border-border inline-flex h-9 items-center gap-1.5 rounded-lg border border-transparent px-2 text-xs font-semibold transition-colors',
        className,
      )}
    >
      <Globe className="text-primary size-4 shrink-0" aria-hidden="true" />
      <span className="text-foreground font-mono text-xs font-bold tracking-wider uppercase">
        {currentOption.shortLabel}
      </span>
      <span className="text-xs" aria-hidden="true">
        {currentOption.flag}
      </span>
    </button>
  );
}
