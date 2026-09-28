'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { type AnnouncementItem } from '@/server/actions/settings';
import { X, Sparkles, Tag, Package, Rocket, Info, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnnouncementBarProps {
  announcement: AnnouncementItem | null;
}

export function AnnouncementBar({ announcement }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!announcement) return;
    const dismissedKey = `announcement_bar_dismissed_${announcement.id}_${new Date(announcement.updatedAt).getTime()}`;
    const isDismissed = localStorage.getItem(dismissedKey);
    if (!isDismissed) {
      setDismissed(false);
    }
  }, [announcement]);

  if (!announcement || dismissed || !announcement.isActive || !announcement.showBanner) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    const dismissedKey = `announcement_bar_dismissed_${announcement.id}_${new Date(announcement.updatedAt).getTime()}`;
    localStorage.setItem(dismissedKey, 'true');
  };

  const getBadgeStyle = (type: AnnouncementItem['type']) => {
    switch (type) {
      case 'NEW_PRODUCT':
        return {
          icon: Package,
          bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          defaultBadge: 'Sản phẩm mới',
        };
      case 'VOUCHER':
        return {
          icon: Tag,
          bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
          defaultBadge: 'Ưu đãi Voucher',
        };
      case 'FEATURE':
        return {
          icon: Rocket,
          bg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
          defaultBadge: 'Tính năng mới',
        };
      case 'MAINTENANCE':
        return {
          icon: Info,
          bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          defaultBadge: 'Thông báo hệ thống',
        };
      default:
        return {
          icon: Sparkles,
          bg: 'bg-primary/15 text-primary border-primary/30',
          defaultBadge: 'Thông báo',
        };
    }
  };

  const style = getBadgeStyle(announcement.type);
  const IconComponent = style.icon;
  const badgeLabel = announcement.badge || style.defaultBadge;

  return (
    <div className="bg-muted/60 dark:bg-muted/40 border-border/80 relative isolate z-40 flex items-center gap-x-3 overflow-hidden border-b px-4 py-2 text-xs sm:px-6 sm:text-sm">
      <div className="mx-auto flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center sm:text-left">
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
            style.bg,
          )}
        >
          <IconComponent className="size-3" />
          <span>{badgeLabel}</span>
        </span>

        <span className="text-foreground font-medium">{announcement.title}:</span>
        <span className="text-muted-foreground line-clamp-1 max-w-xl">{announcement.content}</span>

        {announcement.linkUrl && (
          <Link
            href={announcement.linkUrl}
            className="text-primary hover:text-primary/80 ml-1 inline-flex shrink-0 items-center gap-1 font-semibold transition-colors hover:underline"
          >
            <span>{announcement.linkText || 'Khám phá ngay'}</span>
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Đóng thông báo"
        className="text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 rounded-md p-1 transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
