'use client';

import { usePathname } from 'next/navigation';

export function ConditionalFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Ẩn footer ở toàn bộ các trang quản trị của Admin (/admin, /admin/support, /admin/orders, ...)
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return <>{children}</>;
}
