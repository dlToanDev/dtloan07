import { SearchDialog } from '@/components/blog/search-dialog';
import { MobileNav } from '@/components/layout/mobile-nav';
import { NavLink } from '@/components/layout/nav-link';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { CartButton } from '@/components/shop/cart-button';
import { NotificationBell } from '@/components/layout/notification-bell';
import { getPublicActiveAnnouncements, type AnnouncementItem } from '@/server/actions/settings';
import { siteConfig } from '@/config/site';
import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { HeaderWalletBadge } from '@/components/layout/header-wallet-badge';

interface HeaderProps {
  announcements?: AnnouncementItem[];
}

export async function Header({ announcements: propAnnouncements }: HeaderProps = {}) {
  const [announcements, session] = await Promise.all([
    propAnnouncements ?? getPublicActiveAnnouncements(),
    auth(),
  ]);

  let userWallet: { balanceVnd: number; balanceUsd: number } | null = null;
  if (session?.user?.id) {
    userWallet = await db.user.findUnique({
      where: { id: session.user.id },
      select: { balanceVnd: true, balanceUsd: true },
    });
  }

  return (
    <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <Image
            src={siteConfig.logo}
            alt={siteConfig.name}
            width={72}
            height={40}
            className="h-8 w-auto rounded object-contain"
            priority
          />
          <span className="hidden sm:inline-block">{siteConfig.shortName}</span>
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

        <div className="flex items-center gap-1.5 sm:gap-2">
          <SearchDialog />
          <ThemeToggle />
          <CartButton />
          <NotificationBell initialAnnouncements={announcements} />

          <Link
            href="/account"
            className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-lg transition-colors"
            title="Tài khoản"
            aria-label="Tài khoản cá nhân"
          >
            <User className="size-4" />
          </Link>

          {userWallet && (
            <HeaderWalletBadge
              balanceVnd={userWallet.balanceVnd}
              balanceUsd={userWallet.balanceUsd}
              className="ml-1"
            />
          )}

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
