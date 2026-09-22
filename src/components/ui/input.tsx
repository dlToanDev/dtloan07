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
        'border-input bg-background text-foreground placeholder:text-muted-foreground flex h-10 w-full rounded-lg border px-3 py-2 text-sm leading-normal',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
