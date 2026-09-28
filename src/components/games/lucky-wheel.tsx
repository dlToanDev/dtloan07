'use client';

import { useState } from 'react';
import { Sparkles, Gift, Copy, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export interface WheelSegment {
  label: string; // VD: 10%, 10k, 20%, 50k, Freeship, May mắn...
  code?: string;
  color?: string;
  isWin?: boolean;
}

const DEFAULT_SEGMENTS: WheelSegment[] = [
  { label: '10%', code: 'SALE10', color: '#3b82f6', isWin: true },
  { label: '10k', code: 'DEV10K', color: '#10b981', isWin: true },
  { label: '20%', code: 'SALE20', color: '#8b5cf6', isWin: true },
  { label: '50k', code: 'PRO50K', color: '#f59e0b', isWin: true },
  { label: 'Freeship', code: 'FREESHIP', color: '#06b6d4', isWin: true },
  { label: 'May mắn lần sau', code: '', color: '#64748b', isWin: false },
  { label: '100k', code: 'VIP100K', color: '#ec4899', isWin: true },
  { label: 'Giảm 15%', code: 'SAVE15', color: '#ef4444', isWin: true },
];

export function LuckyWheel({
  customCode,
  announcementId,
  segments,
}: {
  customCode?: string | null;
  announcementId?: string;
  segments?: WheelSegment[];
}) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<WheelSegment | null>(null);
  const [copied, setCopied] = useState(false);

  const activeSegments = segments && segments.length >= 2 ? segments : DEFAULT_SEGMENTS;
  const numSegments = activeSegments.length;
  const degreesPerSegment = 360 / numSegments;

  const handleSpin = () => {
    if (spinning) return;

    setSpinning(true);
    setWonPrize(null);
    setCopied(false);

    // Ưu tiên chọn ô trúng quà (85% cơ hội)
    const winningPool = activeSegments
      .map((s, idx) => (s.isWin !== false ? idx : -1))
      .filter((idx) => idx !== -1);

    let winningIndex: number;
    if (winningPool.length > 0 && Math.random() < 0.85) {
      winningIndex = winningPool[Math.floor(Math.random() * winningPool.length)] ?? 0;
    } else {
      winningIndex = Math.floor(Math.random() * numSegments);
    }

    const safeSegment: WheelSegment = activeSegments[winningIndex] ?? {
      label: '10%',
      color: '#3B82F6',
      isWin: true,
      code: 'LUCKY10',
    };

    // Số vòng quay tối thiểu: 5 vòng (1800 độ) + góc của ô trúng
    const extraRounds = 5 * 360;
    // Góc giữa của ô trúng (đảo ngược chiều kim đồng hồ vì kim ở đỉnh 0 độ)
    const targetDegree =
      extraRounds + (360 - winningIndex * degreesPerSegment - degreesPerSegment / 2);

    const nextRotation = rotation + targetDegree + (Math.random() * 8 - 4);
    setRotation(nextRotation);

    setTimeout(() => {
      setSpinning(false);
      const isWin = safeSegment.isWin !== false;
      const prize: WheelSegment = {
        label: safeSegment.label,
        color: safeSegment.color || '#3b82f6',
        isWin,
        code: safeSegment.code || (isWin ? customCode || 'LUCKYWIN2026' : ''),
      };
      setWonPrize(prize);
    }, 4500);
  };

  const handleCopy = (code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-primary/20 from-primary/5 via-card to-card space-y-6 rounded-2xl border bg-gradient-to-b p-4 text-center sm:p-6">
      <div className="space-y-1">
        <div className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
          <Sparkles className="size-3.5" />
          <span>Mini Game Trúng Thưởng</span>
        </div>
        <h3 className="text-foreground text-lg font-bold sm:text-xl">
          Vòng Quay May Mắn Nhận Voucher
        </h3>
        <p className="text-muted-foreground text-xs">
          Quay ngay để nhận mã giảm giá lên đến 30% áp dụng cho toàn bộ sản phẩm tại Shop!
        </p>
      </div>

      {/* KHUNG VÒNG QUAY */}
      <div className="relative mx-auto flex size-64 items-center justify-center sm:size-72">
        {/* Kim chỉ định vị ở đỉnh */}
        <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
          <div className="h-0 w-0 border-t-[22px] border-r-[12px] border-l-[12px] border-t-rose-500 border-r-transparent border-l-transparent drop-shadow-md" />
        </div>

        {/* Bánh xe quay SVG */}
        <div
          className="cubic-bezier(0.15, 0.9, 0.2, 1) relative size-full overflow-hidden rounded-full border-4 border-amber-400 shadow-xl transition-transform duration-[4500ms]"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg viewBox="0 0 100 100" className="size-full">
            {activeSegments.map((seg, i) => {
              const startAngle = (i * 360) / numSegments;
              const endAngle = ((i + 1) * 360) / numSegments;
              const x1 = 50 + 50 * Math.cos((Math.PI * (startAngle - 90)) / 180);
              const y1 = 50 + 50 * Math.sin((Math.PI * (startAngle - 90)) / 180);
              const x2 = 50 + 50 * Math.cos((Math.PI * (endAngle - 90)) / 180);
              const y2 = 50 + 50 * Math.sin((Math.PI * (endAngle - 90)) / 180);

              const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;
              const midAngle = startAngle + degreesPerSegment / 2 - 90;
              const textX = 50 + 32 * Math.cos((Math.PI * midAngle) / 180);
              const textY = 50 + 32 * Math.sin((Math.PI * midAngle) / 180);

              const isLong = seg.label.length > 5;
              const fontSize = isLong ? 3.2 : numSegments > 8 ? 3.6 : 4.4;

              return (
                <g key={i}>
                  <path
                    d={pathData}
                    fill={seg.color || '#3b82f6'}
                    stroke="#ffffff"
                    strokeWidth="0.5"
                  />
                  <text
                    x={textX}
                    y={textY}
                    fill="#ffffff"
                    fontSize={fontSize}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                  >
                    {seg.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Nút QUAY ở tâm vòng */}
        <button
          type="button"
          onClick={handleSpin}
          disabled={spinning}
          className="absolute z-10 flex size-16 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-amber-500 to-amber-300 text-xs font-black tracking-wider text-amber-950 uppercase shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-80 sm:size-18 sm:text-sm"
        >
          {spinning ? 'ĐANG QUAY' : 'QUAY'}
        </button>
      </div>

      {/* KẾT QUẢ KHI QUAY TRÚNG GIẢI HOẶC CHÚC MAY MẮN */}
      {wonPrize && (
        <div className="animate-in zoom-in-95 duration-200">
          {wonPrize.isWin !== false ? (
            <div className="space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-center gap-1.5 text-base font-bold text-emerald-600 dark:text-emerald-400">
                <Gift className="size-5" />
                <span>Chúc mừng! Bạn đã quay trúng: {wonPrize.label}</span>
              </div>

              {wonPrize.code ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="bg-background rounded-lg border border-dashed border-emerald-500 px-4 py-2 font-mono text-base font-black tracking-wider text-emerald-600 dark:text-emerald-400">
                    {wonPrize.code}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(wonPrize.code)}
                    className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1 size-4 text-emerald-500" />
                        Đã chép
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 size-4" />
                        Sao chép
                      </>
                    )}
                  </Button>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Link
                  href="/shop"
                  className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                >
                  Đến Shop để áp dụng mã ngay <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="border-border/80 bg-muted/30 space-y-2 rounded-xl border p-4 text-center">
              <div className="text-foreground text-sm font-semibold">
                😢 {wonPrize.label || 'Chúc bạn may mắn lần sau!'}
              </div>
              <p className="text-muted-foreground text-xs">
                Đừng nản lòng, bạn có thể thử quay lại ngay để săn ưu đãi tiếp theo!
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWonPrize(null)}
                className="text-xs font-medium"
              >
                Thử quay lại
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
