import { SearchDialog } from '@/components/blog/search-dialog';
import { MobileNav } from '@/components/layout/mobile-nav';
import { NavLink } from '@/components/layout/nav-link';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { CartButton } from '@/components/shop/cart-button';
import { siteConfig } from '@/config/site';
import Link from 'next/link';
import { User } from 'lucide-react';

export function Header() {
  return (
    <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-semibold tracking-tight">
          {siteConfig.shortName}
        </Link>

        <nav aria-label="Điều hướng chính" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <SearchDialog />
          <ThemeToggle />
          <CartButton />
          <Link
            href="/account"
            className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-lg transition-colors"
            title="Tài khoản"
            aria-label="Tài khoản cá nhân"
          >
            <User className="size-4" />
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
