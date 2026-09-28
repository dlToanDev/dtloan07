'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { type AnnouncementItem } from '@/server/actions/settings';
import {
  Sparkles,
  Tag,
  Package,
  Rocket,
  Info,
  Gift,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Gamepad2,
  Clock,
  ArrowRight,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { LuckyWheel } from '@/components/games/lucky-wheel';
import { QuizGame } from '@/components/games/quiz-game';
import { markdownToHtml } from '@/lib/editor-converter';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const parsedGameConfigSchema = z.object({
  segments: z
    .array(
      z.object({
        label: z.string(),
        code: z.string().optional(),
        color: z.string().optional(),
        isWin: z.boolean().optional(),
      }),
    )
    .optional(),
  question: z.string().optional(),
  options: z.array(z.string()).optional(),
  correctIndex: z.number().int().optional(),
  rewardCode: z.string().optional(),
  rewardDiscount: z.string().optional(),
});

interface AnnouncementDetailModalProps {
  announcement: AnnouncementItem | null;
  open: boolean;
  onClose: () => void;
}

export function AnnouncementDetailModal({
  announcement,
  open,
  onClose,
}: AnnouncementDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!announcement) return null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIconAndBadge = (type: AnnouncementItem['type']) => {
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
          defaultBadge: 'Ưu đãi Voucher',
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
          defaultBadge: 'Thông báo',
        };
      default:
        return {
          icon: Sparkles,
          color: 'text-primary bg-primary/10 border-primary/20',
          defaultBadge: 'Tin tức',
        };
    }
  };

  const info = getIconAndBadge(announcement.type);
  const IconComponent = info.icon;

  // Phân tích gameConfig nếu có
  let parsedConfig: z.infer<typeof parsedGameConfigSchema> | null = null;
  if (announcement.gameConfig) {
    try {
      parsedConfig = parsedGameConfigSchema.parse(JSON.parse(announcement.gameConfig));
    } catch {
      parsedConfig = null;
    }
  }

  const formattedDate = new Date(announcement.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={announcement.title}
      hideTitle
      className="border-border bg-card max-h-[85vh] max-w-2xl scrollbar-thin overflow-y-auto rounded-2xl p-6 shadow-2xl"
    >
      <div className="space-y-6">
        {/* Header thông báo */}
        <div className="border-border/80 space-y-3 border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {announcement.proOnly && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 px-3 py-1 text-xs font-bold text-amber-600 shadow-xs dark:text-amber-400">
                  <Crown className="size-3.5 text-amber-500" />
                  <span>ĐẶC QUYỀN DÀNH RIÊNG CHO THÀNH VIÊN PRO</span>
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${info.color}`}
              >
                <IconComponent className="size-3.5" />
                <span>{announcement.badge || info.defaultBadge}</span>
              </span>
            </div>
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <Calendar className="size-3.5" />
              <span>{formattedDate}</span>
            </div>
          </div>

          <h2 className="text-foreground text-xl leading-snug font-black tracking-tight sm:text-2xl">
            {announcement.title}
          </h2>

          <p className="text-muted-foreground text-sm leading-relaxed">{announcement.content}</p>
        </div>

        {/* THẺ VOUCHER NỔI BẬT (NẾU CÓ VOUCHER CODE) */}
        {announcement.voucherCode && (
          <div
            className={cn(
              'relative space-y-3 overflow-hidden rounded-2xl border-2 border-dashed p-4 sm:p-5',
              announcement.proOnly
                ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent'
                : 'border-rose-500/40 bg-rose-500/5',
            )}
          >
            <div className="flex items-center justify-between">
              <div
                className={cn(
                  'flex items-center gap-2 text-sm font-bold',
                  announcement.proOnly
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400',
                )}
              >
                {announcement.proOnly ? (
                  <Crown className="size-4 text-amber-500" />
                ) : (
                  <Gift className="size-4" />
                )}
                <span>
                  {announcement.proOnly
                    ? 'MÃ VOUCHER BÍ MẬT DÀNH CHO PRO VIP'
                    : 'MÃ GIẢM GIÁ ĐẶC QUYỀN'}
                </span>
              </div>
              {announcement.voucherDiscount && (
                <Badge
                  variant={announcement.proOnly ? 'default' : 'destructive'}
                  className={cn(
                    'text-xs font-bold',
                    announcement.proOnly && 'bg-amber-500 text-amber-950 hover:bg-amber-600',
                  )}
                >
                  {announcement.voucherDiscount}
                </Badge>
              )}
            </div>

            <div
              className={cn(
                'bg-background flex flex-col items-stretch justify-between gap-3 rounded-xl border p-3 shadow-xs sm:flex-row sm:items-center',
                announcement.proOnly ? 'border-amber-500/30' : 'border-rose-500/20',
              )}
            >
              <div className="space-y-0.5">
                <div className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Mã ưu đãi của bạn
                </div>
                <div
                  className={cn(
                    'font-mono text-xl font-black tracking-wider sm:text-2xl',
                    announcement.proOnly
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {announcement.voucherCode}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCode(announcement.voucherCode!)}
                  className={cn(
                    'h-10 font-semibold',
                    announcement.proOnly
                      ? 'border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400'
                      : 'border-rose-500/30 text-rose-600 hover:bg-rose-500/10',
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 size-4 text-emerald-500" />
                      Đã chép
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 size-4" />
                      Sao chép mã
                    </>
                  )}
                </Button>
                <Link
                  href="/shop"
                  onClick={onClose}
                  className={cn(
                    'inline-flex h-10 items-center justify-center rounded-lg px-4 text-xs font-bold text-white shadow-xs transition-colors',
                    announcement.proOnly
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700',
                  )}
                >
                  Dùng ngay
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* BÀI VIẾT NỘI DUNG CHI TIẾT (NẾU CÓ) */}
        {announcement.detailContent && (
          <div className="border-border/80 bg-muted/20 space-y-3 rounded-xl border p-4 sm:p-5">
            <h3 className="text-foreground flex items-center gap-1.5 text-sm font-bold tracking-wider uppercase">
              <Tag className="text-primary size-4" />
              Chi tiết bài viết & Điều kiện áp dụng
            </h3>
            <div
              className="prose dark:prose-invert text-foreground/90 [&_th]:border-border [&_th]:bg-muted/70 [&_td]:border-border [&_tr:nth-child(even)]:bg-muted/30 max-w-none overflow-x-auto text-sm leading-relaxed [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs sm:[&_table]:text-sm [&_td]:border [&_td]:p-2.5 [&_th]:border [&_th]:p-2.5 [&_th]:text-left [&_th]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(announcement.detailContent) }}
            />
          </div>
        )}

        {/* KHU VỰC MINI GAME (NẾU ĐƯỢC KÍCH HOẠT) */}
        {announcement.gameType === 'LUCKY_WHEEL' && (
          <div className="pt-2">
            <LuckyWheel
              customCode={announcement.voucherCode}
              announcementId={announcement.id}
              segments={parsedConfig?.segments}
            />
          </div>
        )}

        {announcement.gameType === 'QUIZ' && (
          <div className="pt-2">
            <QuizGame
              question={parsedConfig?.question}
              options={parsedConfig?.options}
              correctIndex={parsedConfig?.correctIndex}
              rewardCode={announcement.voucherCode || parsedConfig?.rewardCode || 'QUIZWIN2026'}
              rewardDiscount={
                announcement.voucherDiscount || parsedConfig?.rewardDiscount || 'Giảm 25%'
              }
            />
          </div>
        )}

        {/* Footer thao tác */}
        <div className="border-border flex items-center justify-between border-t pt-4">
          {announcement.linkUrl ? (
            <Link
              href={announcement.linkUrl}
              onClick={onClose}
              className="text-primary inline-flex items-center gap-1.5 text-xs font-semibold hover:underline sm:text-sm"
            >
              <span>{announcement.linkText || 'Khám phá ngay'}</span>
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <div />
          )}

          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
