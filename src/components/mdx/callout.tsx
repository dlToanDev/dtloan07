import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';

const variants = {
  info: { icon: Info, className: 'border-brand-500/40 bg-brand-500/10', label: 'Thông tin' },
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-500/40 bg-emerald-500/10',
    label: 'Nên làm',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-500/40 bg-amber-500/10',
    label: 'Lưu ý',
  },
  danger: {
    icon: ShieldAlert,
    className: 'border-red-500/40 bg-red-500/10',
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
      <div className="min-w-0 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {title ? <p className="mb-1 font-semibold">{title}</p> : null}
        {children}
      </div>
    </aside>
  );
}
