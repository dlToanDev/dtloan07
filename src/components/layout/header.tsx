import { SearchDialog } from '@/components/blog/search-dialog';
import { MobileNav } from '@/components/layout/mobile-nav';
import { NavLink } from '@/components/layout/nav-link';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { LanguageToggle } from '@/components/layout/language-toggle';
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
import { getAffiliatePath } from '@/lib/affiliate-token';
import { getCurrentUserData } from '@/lib/current-user';
import { getServerTranslator } from '@/lib/i18n/server';

interface HeaderProps {
  announcements?: AnnouncementItem[];
}

const NAV_KEYS: Record<string, string> = {
  '/': 'nav.home',
  '/blog': 'nav.blog',
  [siteConfig.shopPath]: 'nav.shop',
  '/courses': 'nav.courses',
  '/affiliate': 'nav.affiliate',
};

export async function Header({ announcements: propAnnouncements }: HeaderProps = {}) {
  const [announcements, currentUser, { t, locale }] = await Promise.all([
    propAnnouncements ?? getPublicActiveAnnouncements(),
    getCurrentUserData(),
    getServerTranslator(),
  ]);

  const affiliatePath = getAffiliatePath();
  const navItems = siteConfig.nav.map((item) => {
    const href = item.href === '/affiliate' ? affiliatePath : item.href;
    const key = NAV_KEYS[item.href];
    return {
      href,
      label: key ? t(key, item.label) : item.label,
    };
  });

  return (
    <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          prefetch={true}
          className="flex items-center gap-2.5 font-semibold tracking-tight"
        >
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

        <nav aria-label={t('nav.main_menu', 'Điều hướng chính')} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.label}>
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
            prefetch={true}
            className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-lg transition-colors"
            title={locale === 'en' ? 'Account' : 'Tài khoản'}
            aria-label={locale === 'en' ? 'Personal account' : 'Tài khoản cá nhân'}
          >
            <User className="size-4" />
          </Link>

          {currentUser && (
            <HeaderWalletBadge
              balanceVnd={currentUser.balanceVnd}
              balanceUsd={currentUser.balanceUsd}
              className="ml-1"
            />
          )}

          <LanguageToggle className="ml-1" />

          <MobileNav navItems={navItems} />
        </div>
      </div>
    </header>
  );
}
