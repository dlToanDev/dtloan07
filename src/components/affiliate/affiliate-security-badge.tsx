'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Clock, Lock, RefreshCw } from 'lucide-react';

interface AffiliateSecurityBadgeProps {
  token: string;
  remainingSeconds: number;
  rotationMinutes: number;
}

export function AffiliateSecurityBadge({
  token,
  remainingSeconds: initialSeconds,
  rotationMinutes,
}: AffiliateSecurityBadgeProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      // Khi đếm ngược hết hạn, kiểm tra và lấy token mới
      setIsRotating(true);
      fetch('/api/affiliate-token')
        .then((res) => res.json())
        .then((data) => {
          if (data?.path && data.token !== token) {
            router.replace(data.path);
          } else {
            setIsRotating(false);
          }
        })
        .catch(() => setIsRotating(false));
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, token, router]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="text-foreground border-success/30 bg-success/5 relative overflow-hidden rounded-xl border p-4 text-xs shadow-xs sm:text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-success/10 text-success flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Lock className="size-4" />
          </div>
          <div>
            <div className="text-success flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="size-4" />
              <span>Liên kết bảo mật định danh động</span>
              <span className="bg-success/10 text-success rounded-full px-2 py-0.5 font-mono text-[10px]">
                {token.slice(0, 8)}...
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px] sm:text-xs">
              URL được ngẫu nhiên hóa và tự động thay đổi mỗi {rotationMinutes} phút để chống quét
              tự động và bảo mật trang.
            </p>
          </div>
        </div>

        <div className="bg-background/80 border-border flex shrink-0 items-center gap-2 self-start rounded-lg border px-3 py-1.5 shadow-xs sm:self-center">
          {isRotating ? (
            <div className="text-warning flex items-center gap-1.5 text-xs font-medium">
              <RefreshCw className="size-3.5 animate-spin" />
              <span>Đang đổi chuỗi...</span>
            </div>
          ) : (
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Clock className="text-success size-3.5" />
              <span>Đổi chuỗi sau:</span>
              <span className="text-foreground font-mono font-bold">{formattedTime}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
