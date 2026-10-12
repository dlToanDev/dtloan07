'use client';

import { usePathname } from 'next/navigation';

/**
 * Wrapper chỉ hiển thị trust badges (Ship nhanh, Đồ chất lượng, ...)
 * khi user đang ở các trang shop (/shop, /shop/[slug], /checkout, /orders/lookup, ...).
 */
export function FooterTrustBadges({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isShopPage =
    pathname?.startsWith('/shop') ||
    pathname?.startsWith('/checkout') ||
    pathname?.startsWith('/orders');

  if (!isShopPage) {
    return null;
  }

  return <>{children}</>;
}
