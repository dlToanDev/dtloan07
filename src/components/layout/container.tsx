import { cn } from '@/lib/utils';
import type { ElementType, HTMLAttributes } from 'react';

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
}

export function Container({ as: Component = 'div', className, ...props }: ContainerProps) {
  return <Component className={cn('container-page', className)} {...props} />;
}
