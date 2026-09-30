'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles } from 'lucide-react';
import type { HeroBannerConfig, HeroBannerItem } from '@/config/hero-banner';
import { cn } from '@/lib/utils';

interface HeroBannerCarouselProps {
  config: HeroBannerConfig;
  className?: string;
}

export function HeroBannerCarousel({ config, className }: HeroBannerCarouselProps) {
  const activeBanners = (config?.banners || []).filter((b) => b.active);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const bannerCount = activeBanners.length;
  const intervalMs = Math.max(2, config?.intervalSeconds || 5) * 1000;
  const autoPlay = config?.enabled !== false && config?.autoPlay !== false && bannerCount > 1;

  // Chuyển slide tiếp theo
  const goToNext = useCallback(() => {
    if (bannerCount <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % bannerCount);
  }, [bannerCount]);

  // Chuyển slide trước đó
  const goToPrev = useCallback(() => {
    if (bannerCount <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + bannerCount) % bannerCount);
  }, [bannerCount]);

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay || isPaused) return;

    const timer = setInterval(() => {
      goToNext();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoPlay, isPaused, intervalMs, goToNext]);

  // Xử lý vuốt trên điện thoại (Swipe Touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const firstTouch = e.changedTouches[0];
    if (!firstTouch) return;
    const touchEndX = firstTouch.clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    touchStartXRef.current = null;
  };

  if (!config?.enabled || bannerCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'border-border/80 bg-card group relative w-full overflow-hidden rounded-2xl border shadow-xl sm:rounded-3xl',
        className,
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="Banner quảng cáo đối tác"
    >
      {/* Vùng hiển thị Slides */}
      <div className="relative aspect-[21/9] min-h-[220px] w-full sm:aspect-[24/9] sm:min-h-[260px] md:aspect-[28/9] md:min-h-[300px]">
        {activeBanners.map((banner, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={banner.id || index}
              className={cn(
                'absolute inset-0 transition-all duration-700 ease-out',
                isActive
                  ? 'pointer-events-auto z-10 scale-100 opacity-100'
                  : 'pointer-events-none z-0 scale-95 opacity-0',
              )}
              aria-hidden={!isActive}
            >
              <a
                href={banner.linkUrl}
                target={banner.targetBlank !== false ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="group/slide relative block h-full w-full cursor-pointer overflow-hidden"
                title={`${banner.title} (Mở liên kết đối tác)`}
              >
                {/* Ảnh banner */}
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  priority={index === 0}
                  className="object-cover object-center transition-transform duration-700 group-hover/slide:scale-[1.02]"
                />

                {/* Lớp phủ gradient tinh tế để text và badge luôn tương phản rõ */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent sm:bg-gradient-to-r sm:from-black/70 sm:via-black/30 sm:to-transparent" />

                {/* Huy hiệu nhà tài trợ góc trên */}
                <div className="absolute top-3.5 left-4 flex items-center gap-2 sm:top-5 sm:left-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] font-semibold text-white/90 shadow-sm backdrop-blur-md">
                    <Sparkles className="size-3 text-amber-400" />
                    <span>{banner.badge || 'Đối tác tài trợ'}</span>
                  </span>
                </div>

                {/* Huy hiệu link ra ngoài góc trên bên phải */}
                <div className="absolute top-3.5 right-4 sm:top-5 sm:right-6">
                  <span className="group-hover/slide:bg-primary group-hover/slide:text-primary-foreground hidden items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur-md transition-colors sm:inline-flex">
                    <span>Truy cập web</span>
                    <ExternalLink className="size-3" />
                  </span>
                </div>

                {/* Thông tin chữ trên banner (Mobile & Desktop) */}
                <div className="absolute right-4 bottom-4 left-4 max-w-2xl text-white sm:right-16 sm:bottom-6 sm:left-6">
                  {banner.title && (
                    <h3 className="group-hover/slide:text-primary-foreground line-clamp-1 text-base font-extrabold tracking-tight drop-shadow-md transition-colors sm:text-2xl md:text-3xl">
                      {banner.title}
                    </h3>
                  )}
                  {banner.subtitle && (
                    <p className="mt-1 line-clamp-2 text-xs font-medium text-white/80 drop-shadow-sm sm:text-sm">
                      {banner.subtitle}
                    </p>
                  )}

                  {banner.ctaText && (
                    <div className="bg-primary text-primary-foreground mt-2.5 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-md transition-all hover:opacity-95">
                      <span>{banner.ctaText}</span>
                      <ExternalLink className="size-3" />
                    </div>
                  )}
                </div>
              </a>
            </div>
          );
        })}
      </div>

      {/* Nút Prev / Next (Chỉ hiện khi có từ 2 banner trở lên) */}
      {bannerCount > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToPrev();
            }}
            className="absolute top-1/2 left-2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/90 opacity-0 backdrop-blur-md transition-all group-hover:opacity-100 hover:scale-110 hover:bg-black/70 hover:text-white sm:left-3.5 sm:size-10"
            aria-label="Banner trước"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToNext();
            }}
            className="absolute top-1/2 right-2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/90 opacity-0 backdrop-blur-md transition-all group-hover:opacity-100 hover:scale-110 hover:bg-black/70 hover:text-white sm:right-3.5 sm:size-10"
            aria-label="Banner tiếp theo"
          >
            <ChevronRight className="size-5" />
          </button>

          {/* Dấu chấm phân trang (Dots Pagination) */}
          <div className="absolute right-4 bottom-3 z-20 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 backdrop-blur-md sm:right-6 sm:bottom-4">
            {activeBanners.map((_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentIndex(dotIndex);
                }}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  dotIndex === currentIndex
                    ? 'w-6 bg-white'
                    : 'w-1.5 bg-white/40 hover:bg-white/70',
                )}
                aria-label={`Chuyển đến banner ${dotIndex + 1}`}
              />
            ))}
            <span className="ml-1 font-mono text-[10px] text-white/70">
              {currentIndex + 1}/{bannerCount}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
