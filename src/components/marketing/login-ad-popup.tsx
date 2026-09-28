'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { LoginAdConfig } from '@/server/actions/settings';
import { X, ExternalLink, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface LoginAdPopupProps {
  initialConfig: LoginAdConfig | null;
}

export function LoginAdPopup({ initialConfig }: LoginAdPopupProps) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [canClose, setCanClose] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!initialConfig || !initialConfig.enabled || !initialConfig.imageUrl) {
      return;
    }

    // Kiểm tra điều kiện đối tượng người dùng
    if (initialConfig.targetAudience === 'authenticated') {
      if (status !== 'authenticated') return;
    }

    // Kiểm tra tần suất hiển thị
    const storageKey = `login_ad_dismissed_${initialConfig.updatedAt || 'default'}`;
    if (initialConfig.frequency === 'once_per_session') {
      if (sessionStorage.getItem(storageKey) === 'true') return;
    } else if (initialConfig.frequency === 'once_per_day') {
      const dismissedTime = localStorage.getItem(storageKey);
      if (dismissedTime) {
        const diffHours = (Date.now() - Number(dismissedTime)) / (1000 * 60 * 60);
        if (diffHours < 24) return;
      }
    } else if (initialConfig.frequency === 'every_login') {
      if (sessionStorage.getItem(storageKey) === 'true') return;
    }

    // Hẹn giờ mở popup sau 600ms khi trang tải mượt mà
    const openTimeout = setTimeout(() => {
      setOpen(true);
      const totalSeconds = initialConfig.countdownSeconds || 5;
      setCountdown(totalSeconds);
      setCanClose(false);

      let current = totalSeconds;
      timerRef.current = setInterval(() => {
        current -= 1;
        setCountdown(current);
        if (current <= 0) {
          setCanClose(true);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 1000);
    }, 600);

    return () => {
      clearTimeout(openTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initialConfig, status]);

  const handleClose = useCallback(() => {
    if (!canClose) return;
    setOpen(false);

    if (initialConfig) {
      const storageKey = `login_ad_dismissed_${initialConfig.updatedAt || 'default'}`;
      if (initialConfig.frequency === 'once_per_day') {
        localStorage.setItem(storageKey, String(Date.now()));
      } else {
        sessionStorage.setItem(storageKey, 'true');
      }
    }
  }, [canClose, initialConfig]);

  // Khóa phím Esc nếu chưa hết đếm ngược
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canClose) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, canClose, handleClose]);

  if (!open || !initialConfig) return null;

  const content = (
    <div className="bg-card border-border/70 relative overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300">
      {/* Nút đếm ngược hoặc Nút tắt X */}
      <div className="absolute top-3 right-3 z-30">
        {!canClose ? (
          <div className="flex animate-pulse items-center gap-1.5 rounded-full border border-white/20 bg-black/75 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-md select-none">
            <span className="inline-block size-2 rounded-full bg-amber-400" />
            <span>Đóng sau {countdown}s</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng quảng cáo"
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/30 bg-black/80 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition-transform hover:scale-105 hover:bg-black active:scale-95"
          >
            <span>Bỏ qua</span>
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Badge nhãn thông báo quảng cáo */}
      <div className="absolute top-3 left-3 z-20">
        <span className="bg-primary/90 text-primary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow backdrop-blur-md">
          <Sparkles className="size-3" />
          Tài trợ & Ưu đãi
        </span>
      </div>

      {/* Ảnh quảng cáo */}
      <div className="group relative">
        {initialConfig.linkUrl ? (
          <Link
            href={initialConfig.linkUrl}
            onClick={handleClose}
            target={initialConfig.linkUrl.startsWith('http') ? '_blank' : '_self'}
            rel={initialConfig.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="block overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={initialConfig.imageUrl}
              alt={initialConfig.title || 'Quảng cáo'}
              className="max-h-[70vh] w-full object-contain transition-transform duration-500 group-hover:scale-[1.02] sm:max-h-[520px] sm:object-cover"
              loading="eager"
            />
          </Link>
        ) : (
          <div className="overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={initialConfig.imageUrl}
              alt={initialConfig.title || 'Quảng cáo'}
              className="max-h-[70vh] w-full object-contain sm:max-h-[520px] sm:object-cover"
              loading="eager"
            />
          </div>
        )}
      </div>

      {/* Chân thông tin quảng cáo (nếu có tiêu đề hoặc link) */}
      {(initialConfig.title || initialConfig.linkUrl) && (
        <div className="bg-background/95 border-border flex flex-col items-center justify-between gap-3 border-t p-4 backdrop-blur-sm sm:flex-row">
          <div className="text-center sm:text-left">
            <h3 className="text-foreground line-clamp-1 text-sm font-semibold">
              {initialConfig.title || 'Khám phá ngay hôm nay'}
            </h3>
            <p className="text-muted-foreground text-xs">
              Nhấn vào banner để xem chi tiết chương trình ưu đãi
            </p>
          </div>
          {initialConfig.linkUrl && (
            <Link
              href={initialConfig.linkUrl}
              onClick={handleClose}
              target={initialConfig.linkUrl.startsWith('http') ? '_blank' : '_self'}
              rel={initialConfig.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
            >
              <span>Xem chi tiết</span>
              <ExternalLink className="size-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm duration-200"
      onClick={(e) => {
        // Chỉ cho phép click nền để tắt khi canClose === true
        if (e.target === e.currentTarget && canClose) {
          handleClose();
        }
      }}
    >
      <div className="animate-in zoom-in-95 relative w-full max-w-xl duration-200">{content}</div>
    </div>
  );
}
