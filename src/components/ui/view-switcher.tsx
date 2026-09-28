'use client';

import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list';

interface ViewSwitcherProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  className?: string;
  size?: 'sm' | 'default';
}

export function ViewSwitcher({ view, onChange, className, size = 'default' }: ViewSwitcherProps) {
  const isSmall = size === 'sm';

  return (
    <div
      className={cn(
        'border-border bg-muted/60 inline-flex items-center rounded-lg border p-1',
        className,
      )}
      role="group"
      aria-label="Kiểu hiển thị"
    >
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-pressed={view === 'list'}
        title="Hiển thị dạng danh sách"
        className={cn(
          'inline-flex cursor-pointer items-center gap-1.5 rounded-md font-medium transition-all',
          isSmall ? 'h-7 px-2 text-[11px]' : 'h-8 px-2.5 text-xs',
          view === 'list'
            ? 'bg-background text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <List aria-hidden="true" className={isSmall ? 'size-3.5' : 'size-4'} />
        <span className="hidden sm:inline">Danh sách</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-pressed={view === 'grid'}
        title="Hiển thị dạng lưới"
        className={cn(
          'inline-flex cursor-pointer items-center gap-1.5 rounded-md font-medium transition-all',
          isSmall ? 'h-7 px-2 text-[11px]' : 'h-8 px-2.5 text-xs',
          view === 'grid'
            ? 'bg-background text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <LayoutGrid aria-hidden="true" className={isSmall ? 'size-3.5' : 'size-4'} />
        <span className="hidden sm:inline">Lưới</span>
      </button>
    </div>
  );
}
