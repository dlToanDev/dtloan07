'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProductCover } from '@/components/shop/product-cover';
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/dialog';

export function ProductGallery({
  name,
  slug,
  type,
  coverUrl,
  gallery,
  version,
}: {
  name: string;
  slug: string;
  type: 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT';
  coverUrl: string;
  gallery: string[];
  version?: string;
}) {
  const images = [...new Set([coverUrl, ...gallery].filter(Boolean))];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Sync if images change
  useEffect(() => {
    setCurrentIndex(0);
  }, [coverUrl, gallery]);

  const activeUrl = images[currentIndex] ?? coverUrl;

  const goToNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goToPrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'Escape' && lightboxOpen) setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, lightboxOpen]);

  return (
    <div className="space-y-4">
      {/* Khung ảnh chính to rõ ràng */}
      <div className="group border-border/80 bg-muted/40 hover:border-primary/40 relative overflow-hidden rounded-2xl border shadow-sm transition-all">
        {activeUrl ? (
          <div
            className="bg-background/50 relative flex aspect-square w-full cursor-zoom-in items-center justify-center overflow-hidden sm:aspect-[4/3]"
            onClick={() => setLightboxOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeUrl}
              alt={`${name} - Ảnh ${currentIndex + 1}`}
              className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105 sm:p-4"
              loading="eager"
            />

            {/* Nút phóng to Lightbox */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              className="bg-background/80 text-foreground hover:bg-background absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium opacity-90 shadow-xs backdrop-blur-md transition group-hover:opacity-100"
              aria-label="Phóng to ảnh"
            >
              <Maximize2 className="text-primary h-3.5 w-3.5" />
              <span className="hidden sm:inline">Phóng to</span>
            </button>

            {/* Chỉ báo số lượng ảnh */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {currentIndex + 1} / {images.length} ảnh
              </div>
            )}
          </div>
        ) : (
          <ProductCover
            name={name}
            slug={slug}
            coverUrl={coverUrl}
            type={type}
            version={version}
            className="rounded-2xl"
          />
        )}

        {/* Nút chuyển ảnh Trước / Sau */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="bg-background/80 text-foreground hover:bg-background absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md backdrop-blur-md transition-all hover:scale-110 focus:outline-none active:scale-95"
              aria-label="Ảnh trước đó"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="bg-background/80 text-foreground hover:bg-background absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md backdrop-blur-md transition-all hover:scale-110 focus:outline-none active:scale-95"
              aria-label="Ảnh tiếp theo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Danh sách ảnh thu nhỏ (Thumbnails) */}
      {images.length > 1 && (
        <div className="flex scrollbar-thin gap-2.5 overflow-x-auto pt-1 pb-2">
          {images.map((url, idx) => {
            const isSelected = idx === currentIndex;
            return (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  'group relative shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200',
                  isSelected
                    ? 'border-primary ring-primary/20 scale-102 shadow-sm ring-2'
                    : 'border-border/60 hover:border-primary/50 opacity-70 hover:opacity-100',
                )}
                aria-label={`Xem ảnh số ${idx + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Thumbnail ${idx + 1}`}
                  className="h-16 w-16 object-cover transition-transform group-hover:scale-105 sm:h-20 sm:w-20"
                />
                {isSelected && (
                  <span className="bg-primary/10 pointer-events-none absolute inset-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal xem ảnh full độ phân giải */}
      <Dialog
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title="Xem ảnh chi tiết"
        hideTitle
        className="max-w-4xl rounded-2xl border-neutral-800 bg-black/95 p-2 text-white backdrop:bg-black/80 sm:p-4"
      >
        <div className="relative flex min-h-[50vh] items-center justify-center sm:min-h-[70vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeUrl}
            alt={name}
            className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
          />

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrev}
                className="absolute top-1/2 left-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="absolute top-1/2 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95"
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
                {currentIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
