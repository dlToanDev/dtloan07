import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';

const variants = {
  info: { icon: Info, className: 'border-info/40 bg-info/10 text-info', label: 'Thông tin' },
  success: {
    icon: CheckCircle2,
    className: 'border-success/40 bg-success/10 text-success',
    label: 'Nên làm',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-warning/40 bg-warning/10 text-warning',
    label: 'Lưu ý',
  },
  danger: {
    icon: ShieldAlert,
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
    label: 'Nguy hiểm',
  },
} as const;

export interface CalloutProps {
  type?: keyof typeof variants;
  title?: string;
  children: ReactNode;
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const variant = variants[type];
  const Icon = variant.icon;

  return (
    <aside
      aria-label={title ?? variant.label}
      className={cn('my-6 flex gap-3 rounded-lg border p-4', variant.className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="text-foreground min-w-0 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {title ? <p className="mb-1 font-semibold">{title}</p> : null}
        {children}
      </div>
    </aside>
  );
}
