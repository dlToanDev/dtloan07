import { cn } from '@/lib/utils';
import type { ElementType, HTMLAttributes } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-card text-card-foreground rounded-card border-border border', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />;
}

/**
 * `as` để giữ đúng thứ tự heading của trang (h1 → h2 → h3).
 * Nhảy cấp heading là lỗi a11y, Lighthouse bắt qua rule `heading-order`.
 */
export function CardTitle({
  as: Component = 'h3',
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { as?: ElementType }) {
  return <Component className={cn('text-lg leading-tight font-semibold', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2 p-5 pt-0', className)} {...props} />;
}
