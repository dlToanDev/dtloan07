'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Ẩn tiêu đề khỏi giao diện nhưng vẫn giữ cho screen reader. */
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Dùng <dialog> native: trình duyệt lo sẵn focus trap, khoá scroll nền,
 * đóng bằng Esc và ngữ nghĩa aria-modal — không cần thư viện ngoài.
 */
export function Dialog({
  open,
  onClose,
  title,
  hideTitle = false,
  description,
  children,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onClose={onClose}
      onClick={(event) => {
        // Click ra vùng nền (chính element dialog) thì đóng.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'bg-card text-card-foreground rounded-card border-border m-auto w-[calc(100vw-2rem)] max-w-lg border p-0',
        'backdrop:bg-black/50',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 p-5 pb-0">
        <div className="flex flex-col gap-1">
          <h2 id="dialog-title" className={cn('text-lg font-semibold', hideTitle && 'sr-only')}>
            {title}
          </h2>
          {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="hover:bg-muted rounded-md p-1 transition-colors"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
