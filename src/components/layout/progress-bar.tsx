'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

function ProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const start = () => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setVisible(true);
    setProgress(15);

    // Trickle simulation: tăng dần theo thời gian nhưng dừng ở ~85%
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
        const diff = Math.max(1, (85 - prev) * 0.15);
        return Math.min(85, prev + diff);
      });
    }, 200);
  };

  const done = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setProgress(100);

    finishTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  };

  // Khi pathname hoặc searchParams thay đổi -> hoàn tất tiến trình
  useEffect(() => {
    done();
  }, [pathname, searchParams]);

  // Lắng nghe click vào link và popstate
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return; // Chỉ chuột trái
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; // Mở tab mới

      const anchor = (event.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:'))
        return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      if (anchor.getAttribute('data-no-progress') === 'true') return;

      try {
        const targetUrl = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Khác origin -> bỏ qua
        if (targetUrl.origin !== currentUrl.origin) return;

        // Nếu trùng URL hoàn toàn (cùng path, query, chỉ khác hash hoặc không đổi gì) -> bỏ qua
        if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search) {
          return;
        }

        start();
      } catch {
        // Bỏ qua lỗi parse URL
      }
    };

    const handlePopState = () => {
      start();
    };

    const handleCustomStart = () => start();
    const handleCustomDone = () => done();

    document.addEventListener('click', handleAnchorClick, true);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('app:start-loading', handleCustomStart);
    window.addEventListener('app:done-loading', handleCustomDone);

    return () => {
      document.removeEventListener('click', handleAnchorClick, true);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('app:start-loading', handleCustomStart);
      window.removeEventListener('app:done-loading', handleCustomDone);
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <>
      {/* Thanh progress bar ở đỉnh màn hình */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] bg-transparent"
      >
        <div
          className="bg-primary h-full shadow-[0_0_12px_var(--color-primary),0_0_6px_var(--color-primary)] transition-all ease-out"
          style={{
            width: `${progress}%`,
            transitionDuration: progress === 100 ? '150ms' : '200ms',
            opacity: visible ? 1 : 0,
          }}
        />
      </div>

      {/* Badge spinner mờ nhẹ ở góc trên bên phải khi đang tải */}
      {visible && progress < 100 && (
        <div
          aria-hidden="true"
          className="border-border/80 bg-background/90 text-muted-foreground animate-in fade-in pointer-events-none fixed top-4 right-4 z-[9999] flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-md backdrop-blur-md duration-200"
        >
          <Loader2 className="text-primary size-3.5 animate-spin" />
          <span>Đang tải...</span>
        </div>
      )}
    </>
  );
}

export function ProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarInner />
    </Suspense>
  );
}
