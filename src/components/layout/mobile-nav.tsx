'use client';

import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MobileNavProps {
  navItems?: readonly { label: string; href: string }[] | { label: string; href: string }[];
}

export function MobileNav({ navItems }: MobileNavProps = {}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = navItems || siteConfig.nav;

  // Điều hướng xong thì đóng menu, nếu không menu treo lại ở trang mới.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Đóng menu' : 'Mở menu'}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="hover:bg-muted inline-flex size-9 items-center justify-center rounded-lg transition-colors"
      >
        {open ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <Menu className="size-5" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-border bg-background absolute inset-x-0 top-16 border-b shadow-sm"
        >
          <ul className="container-page flex flex-col py-2">
            {items.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'hover:bg-muted block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
