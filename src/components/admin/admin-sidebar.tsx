'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  GraduationCap,
  ShoppingBag,
  Package,
  Truck,
  Tags,
  Ticket,
  KeyRound,
  Mail,
  Cloud,
  ExternalLink,
  ShieldCheck,
  Menu,
  X,
  User,
  Users,
  ChevronRight,
  Settings,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: string;
  iconColor: string;
  iconBg: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Hệ thống & Doanh thu',
    items: [
      {
        title: 'Tổng quan',
        href: '/admin',
        icon: LayoutDashboard,
        exact: true,
        iconColor: 'text-rose-500',
        iconBg: 'bg-rose-500/10',
      },
      {
        title: 'Đơn hàng',
        href: '/admin/orders',
        icon: Package,
        iconColor: 'text-purple-500',
        iconBg: 'bg-purple-500/10',
      },
      {
        title: 'Bản quyền',
        href: '/admin/licenses',
        icon: KeyRound,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
      },
      {
        title: 'Subscribers',
        href: '/admin/subscribers',
        icon: Mail,
        iconColor: 'text-pink-500',
        iconBg: 'bg-pink-500/10',
      },
      {
        title: 'Hosting & Cloud Deals',
        href: '/admin/affiliates',
        icon: Cloud,
        iconColor: 'text-cyan-500',
        iconBg: 'bg-cyan-500/10',
      },
      {
        title: 'Cài đặt',
        href: '/admin/settings',
        icon: Settings,
        iconColor: 'text-emerald-500',
        iconBg: 'bg-emerald-500/10',
      },
    ],
  },
  {
    title: 'Quản lý nội dung',
    items: [
      {
        title: 'Bài viết',
        href: '/admin/posts',
        icon: FileText,
        badge: 'MDX',
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-500/10',
      },
      {
        title: 'Bài cộng đồng',
        href: '/admin/community',
        icon: Users,
        iconColor: 'text-sky-500',
        iconBg: 'bg-sky-500/10',
      },
      {
        title: 'Khóa học',
        href: '/admin/courses',
        icon: GraduationCap,
        iconColor: 'text-indigo-500',
        iconBg: 'bg-indigo-500/10',
      },
      {
        title: 'Affiliate TikTok & Shopee',
        href: '/admin/affiliate-shopping',
        icon: ShoppingBag,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
      },
      {
        title: 'Shop',
        href: '/admin/shop',
        icon: ShoppingBag,
        exact: true,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
      },
      {
        title: 'Danh mục shop',
        href: '/admin/shop/categories',
        icon: Tags,
        iconColor: 'text-orange-500',
        iconBg: 'bg-orange-500/10',
      },
      {
        title: 'Phí ship',
        href: '/admin/shop/shipping',
        icon: Truck,
        iconColor: 'text-teal-500',
        iconBg: 'bg-teal-500/10',
      },
      {
        title: 'Voucher',
        href: '/admin/vouchers',
        icon: Ticket,
        iconColor: 'text-rose-500',
        iconBg: 'bg-rose-500/10',
      },
    ],
  },
];

// Danh sách phẳng để tìm mục đang active hiển thị trên mobile
const allItems = navGroups.flatMap((g) => g.items);

export function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Đóng menu mobile khi chuyển route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isItemActive = (item: NavItem) => {
    if (item.exact || item.href === '/admin') {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const fallbackItem: NavItem = {
    title: 'Tổng quan',
    href: '/admin',
    icon: LayoutDashboard,
    exact: true,
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-500/10',
  };

  const currentItem = allItems.find(isItemActive) ?? fallbackItem;

  return (
    <>
      {/* ============================================================
          MOBILE NAVIGATION BAR (< lg)
          ============================================================ */}
      <div className="mb-4 w-full space-y-2 lg:hidden">
        {/* Mobile Header Box */}
        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-3 shadow-xs">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                currentItem.iconBg,
                currentItem.iconColor,
              )}
            >
              <currentItem.icon className="size-4" />
            </div>
            <div className="min-w-0">
              <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Admin Portal
              </span>
              <p className="text-foreground truncate text-sm font-bold">{currentItem.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Đóng menu quản trị' : 'Mở menu quản trị'}
            className="border-border bg-muted/60 text-foreground hover:bg-muted flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            {mobileOpen ? (
              <>
                <X className="size-4" />
                <span>Đóng</span>
              </>
            ) : (
              <>
                <Menu className="size-4" />
                <span>Menu Quản trị</span>
              </>
            )}
          </button>
        </div>

        {/* Mobile Quick Horizontal Scroll Strip */}
        <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {allItems.map((item) => {
            const active = isItemActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all',
                  active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                    : 'bg-card text-muted-foreground hover:text-foreground border-border hover:bg-muted/70 border',
                )}
              >
                <item.icon className="size-3.5" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileOpen && (
          <div className="border-border bg-card animate-in fade-in slide-in-from-top-2 space-y-4 rounded-2xl border p-4 shadow-lg duration-200">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <p className="text-muted-foreground px-2 text-[11px] font-bold tracking-wider uppercase">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = isItemActive(item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all',
                          active
                            ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              'flex size-7 shrink-0 items-center justify-center rounded-lg',
                              active
                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                : `${item.iconBg} ${item.iconColor}`,
                            )}
                          >
                            <item.icon className="size-4" />
                          </div>
                          <span>{item.title}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                              active
                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Mobile Footer Area */}
            <div className="border-border flex items-center justify-between border-t pt-3 text-xs">
              <span className="text-muted-foreground max-w-[200px] truncate">
                Admin: <strong className="text-foreground">{userEmail}</strong>
              </span>
              <Link
                href="/"
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
              >
                <span>Xem trang chủ</span>
                <ExternalLink className="size-3" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          DESKTOP SIDEBAR NAVBAR (>= lg)
          ============================================================ */}
      <aside className="fixed top-16 bottom-0 left-0 z-30 hidden w-64 lg:block xl:w-72">
        <div className="border-border bg-card flex h-full flex-col justify-between overflow-y-auto border-r p-4 shadow-xs">
          {/* Header Sidebar */}
          <div className="space-y-4">
            <div className="border-border flex items-center gap-3 border-b px-1 pb-4">
              <div className="bg-primary/10 text-primary border-primary/20 flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-2xs">
                <ShieldCheck className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-foreground text-sm font-bold tracking-tight">
                    Admin Portal
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Live
                  </span>
                </div>
                <p className="text-muted-foreground truncate text-xs">Trung tâm Quản trị</p>
              </div>
            </div>

            {/* Navigation Groups */}
            <nav className="space-y-5" aria-label="Điều hướng Admin">
              {navGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <h3 className="text-muted-foreground/80 px-3 text-[11px] font-bold tracking-wider uppercase">
                    {group.title}
                  </h3>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isItemActive(item);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
                              active
                                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div
                                className={cn(
                                  'flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                                  active
                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                    : `${item.iconBg} ${item.iconColor} transition-transform group-hover:scale-105`,
                                )}
                              >
                                <item.icon className="size-4" />
                              </div>
                              <span className="truncate">{item.title}</span>
                            </div>

                            {item.badge ? (
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                                  active
                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                    : 'bg-muted text-muted-foreground',
                                )}
                              >
                                {item.badge}
                              </span>
                            ) : active ? (
                              <ChevronRight className="text-primary-foreground/70 size-4 shrink-0" />
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          {/* Footer Sidebar */}
          <div className="border-border mt-6 space-y-3 border-t px-1 pt-4">
            {/* User Info Card */}
            <div className="bg-muted/40 border-border/50 flex items-center justify-between gap-2 rounded-xl border p-2.5">
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Tài khoản quản trị
                </p>
                <p className="text-foreground truncate text-xs font-semibold" title={userEmail}>
                  {userEmail || 'admin@hvpgroup.vn'}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 uppercase dark:text-rose-400">
                ADMIN
              </span>
            </div>

            {/* Quick Action Links */}
            <div className="flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                rel="noreferrer"
                className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-2xs transition-colors"
              >
                <span>Xem trang chủ</span>
                <ExternalLink className="size-3" />
              </Link>
              <Link
                href="/account"
                className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center rounded-lg border p-1.5 text-xs font-medium shadow-2xs transition-colors"
                title="Tài khoản cá nhân"
                aria-label="Tài khoản cá nhân"
              >
                <User className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
