import { cn } from '@/lib/utils';
import type { InputHTMLAttributes, Ref } from 'react';

// React 19: ref là prop thường của function component, chỉ cần khai báo kiểu.
export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  ref?: Ref<HTMLInputElement>;
};

export function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'border-input bg-background placeholder:text-muted-foreground h-10 w-full rounded-lg border px-3 text-sm',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
