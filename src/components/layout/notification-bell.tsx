'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { type AnnouncementItem, getPublicActiveAnnouncements } from '@/server/actions/settings';
import {
  Bell,
  CheckCheck,
  Package,
  Tag,
  Rocket,
  Info,
  Sparkles,
  ExternalLink,
  X,
  ArrowRight,
  Gamepad2,
  Gift,
  Crown,
} from 'lucide-react';
import Link from 'next/link';
import { AnnouncementDetailModal } from '@/components/announcements/announcement-detail-modal';

interface NotificationBellProps {
  initialAnnouncements: AnnouncementItem[];
}

const STORAGE_KEY = 'blog_read_notification_ids';
const TOAST_DISMISSED_KEY = 'blog_notif_toast_dismissed_session';

function formatRelativeTime(dateInput: Date | string): string {
  const d = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getIconAndBadge(type: AnnouncementItem['type']) {
  switch (type) {
    case 'NEW_PRODUCT':
      return {
        icon: Package,
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        defaultBadge: 'Sản phẩm mới',
      };
    case 'VOUCHER':
      return {
        icon: Tag,
        color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
        defaultBadge: 'Mã giảm giá',
      };
    case 'FEATURE':
      return {
        icon: Rocket,
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        defaultBadge: 'Tính năng mới',
      };
    case 'MAINTENANCE':
      return {
        icon: Info,
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        defaultBadge: 'Bảo trì / Chú ý',
      };
    default:
      return {
        icon: Sparkles,
        color: 'text-primary bg-primary/10 border-primary/20',
        defaultBadge: 'Thông báo',
      };
  }
}

export function NotificationBell({ initialAnnouncements }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Đồng bộ khi prop thay đổi
  useEffect(() => {
    setAnnouncements(initialAnnouncements);
  }, [initialAnnouncements]);

  // Đồng bộ phía client để cập nhật theo trạng thái phiên đăng nhập / quyền PRO mới nhất
  useEffect(() => {
    getPublicActiveAnnouncements()
      .then((res) => {
        if (res && Array.isArray(res)) setAnnouncements(res);
      })
      .catch(() => {});
  }, []);

  const handleOpenDetail = useCallback(
    (item: AnnouncementItem) => {
      if (!readIds.includes(item.id)) {
        const next = [...readIds, item.id];
        setReadIds(next);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
      }
      setSelectedAnnouncement(item);
      setDetailModalOpen(true);
      setOpen(false);
    },
    [readIds],
  );

  // Đọc danh sách đã đọc từ localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed: string[] = stored ? JSON.parse(stored) : [];
      setReadIds(parsed);

      // Kiểm tra có thông báo chưa đọc nào không
      const unread = announcements.filter((a) => !parsed.includes(a.id));
      if (unread.length > 0) {
        // Kiểm tra xem trong phiên này đã tắt toast chưa
        const toastDismissed = sessionStorage.getItem(TOAST_DISMISSED_KEY);
        if (!toastDismissed) {
          const t = setTimeout(() => {
            setShowToast(true);
          }, 1200);
          return () => clearTimeout(t);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsClientLoaded(true);
    }
  }, [announcements]);

  // Click outside để đóng menu
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [open]);

  // Đếm thông báo chưa đọc
  const unreadAnnouncements = announcements.filter((a) => !readIds.includes(a.id));
  const unreadCount = isClientLoaded ? unreadAnnouncements.length : 0;

  // Đánh dấu 1 thông báo là đã đọc
  const markAsRead = useCallback(
    (id: string) => {
      if (!readIds.includes(id)) {
        const next = [...readIds, id];
        setReadIds(next);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
      }
    },
    [readIds],
  );

  // Đánh dấu tất cả là đã đọc
  const markAllAsRead = () => {
    const allIds = announcements.map((a) => a.id);
    setReadIds(allIds);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
    } catch {
      // Ignore
    }
    setShowToast(false);
  };

  const handleOpenDropdown = () => {
    setOpen((prev) => !prev);
    setShowToast(false);
  };

  const handleDismissToast = () => {
    setShowToast(false);
    try {
      sessionStorage.setItem(TOAST_DISMISSED_KEY, 'true');
    } catch {
      // Ignore
    }
  };

  const handleToastViewNow = () => {
    setShowToast(false);
    if (latestUnread) {
      handleOpenDetail(latestUnread);
    } else {
      setOpen(true);
    }
    try {
      sessionStorage.setItem(TOAST_DISMISSED_KEY, 'true');
    } catch {
      // Ignore
    }
  };

  // Thông báo mới nhất để hiển thị tóm tắt trên toast
  const latestUnread = unreadAnnouncements[0] || initialAnnouncements[0];

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Nút Chuông Thông Báo */}
      <button
        type="button"
        onClick={handleOpenDropdown}
        aria-label="Thông báo hệ thống"
        aria-expanded={open}
        aria-haspopup="true"
        title="Thông báo hệ thống"
        className="hover:bg-muted text-muted-foreground hover:text-foreground relative inline-flex size-9 cursor-pointer items-center justify-center rounded-lg transition-colors"
      >
        <Bell className="size-4" />

        {/* Badge số thông báo chưa đọc */}
        {unreadCount > 0 && (
          <span className="ring-background animate-in zoom-in-50 absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Menu danh sách thông báo */}
      {open && (
        <div
          role="dialog"
          aria-label="Danh sách thông báo"
          className="border-border bg-card animate-in fade-in-50 zoom-in-95 absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border shadow-2xl duration-150 sm:w-96"
        >
          {/* Header Popover */}
          <div className="border-border bg-muted/30 flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-foreground text-sm font-semibold">Thông báo hệ thống</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs transition-colors"
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckCheck className="size-3.5" />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Danh sách thông báo */}
          <div className="divide-border/60 max-h-[65vh] divide-y overflow-y-auto">
            {announcements.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="text-muted-foreground/40 mx-auto mb-2 size-8" />
                <p className="text-muted-foreground text-xs font-medium">
                  Hiện chưa có thông báo mới nào
                </p>
              </div>
            ) : (
              announcements.map((item) => {
                const isUnread = !readIds.includes(item.id);
                const info = getIconAndBadge(item.type);
                const IconComponent = info.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDetail(item)}
                    className={`group flex cursor-pointer items-start gap-3 p-4 text-left transition-colors ${
                      item.proOnly
                        ? isUnread
                          ? 'border-l-2 border-l-amber-500 bg-amber-500/10 hover:bg-amber-500/15'
                          : 'opacity-90 hover:bg-amber-500/5'
                        : isUnread
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-muted/40 opacity-85'
                    }`}
                  >
                    {/* Icon loại */}
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-xl border ${
                        item.proOnly
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : info.color
                      }`}
                    >
                      {item.proOnly ? (
                        <Crown className="size-4" />
                      ) : (
                        <IconComponent className="size-4" />
                      )}
                    </div>

                    {/* Nội dung */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.proOnly && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600 shadow-xs dark:text-amber-400">
                              <Crown className="size-2.5 text-amber-500" />
                              <span>PRO VIP</span>
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${info.color}`}
                          >
                            {item.badge || info.defaultBadge}
                          </span>
                          {item.gameType && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              <Gamepad2 className="size-2.5" />
                              <span>Mini Game</span>
                            </span>
                          )}
                          {item.voucherCode && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                              <Gift className="size-2.5" />
                              <span>Voucher</span>
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground shrink-0 text-[11px]">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <h3
                        className={`text-xs ${
                          isUnread ? 'text-foreground font-bold' : 'text-foreground/90 font-medium'
                        } group-hover:text-primary transition-colors`}
                      >
                        {item.title}
                      </h3>

                      <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                        {item.content}
                      </p>

                      <div className="pt-1">
                        <span className="text-primary inline-flex items-center gap-1 text-[11px] font-semibold group-hover:underline">
                          <span>
                            {item.voucherCode || item.gameType
                              ? 'Xem chi tiết & nhận quà'
                              : item.linkText || 'Xem chi tiết'}
                          </span>
                          <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </div>

                    {/* Chấm tròn chưa đọc */}
                    {isUnread && <span className="mt-1 size-2 shrink-0 rounded-full bg-rose-500" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Chân Popover */}
          <div className="border-border bg-muted/20 border-t p-2 text-center">
            <Link
              href="/shop"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors"
            >
              Xem tất cả sản phẩm & ưu đãi trên Shop →
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOAST NỔI KHI NGƯỜI DÙNG VÀO WEB MÀ CÓ THÔNG BÁO CHƯA ĐỌC                */}
      {/* ========================================================================= */}
      {showToast && unreadCount > 0 && latestUnread && (
        <aside
          role="status"
          aria-live="polite"
          className="border-border/90 bg-card/95 animate-in slide-in-from-bottom-5 fixed right-5 bottom-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl border p-4 shadow-2xl backdrop-blur-md duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary relative shrink-0 rounded-xl p-2.5">
              <Bell className="size-5 animate-bounce" />
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-foreground text-xs font-bold">
                  Bạn có {unreadCount} thông báo mới chưa đọc!
                </h4>
                <button
                  type="button"
                  onClick={handleDismissToast}
                  aria-label="Đóng thông báo nổi"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-0.5 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
                {latestUnread.title}
              </p>

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToastViewNow}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                >
                  <span>Xem ngay</span>
                  <ExternalLink className="size-3" />
                </button>

                <button
                  type="button"
                  onClick={handleDismissToast}
                  className="text-muted-foreground hover:text-foreground px-2 py-1 text-xs transition-colors"
                >
                  Để sau
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Modal chi tiết thông báo, bài viết voucher và mini game */}
      <AnnouncementDetailModal
        announcement={selectedAnnouncement}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />
    </div>
  );
}
