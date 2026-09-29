'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wallet, RefreshCw } from 'lucide-react';
import { USD_TO_VND_RATE } from '@/lib/wallet';
import { cn } from '@/lib/utils';

interface HeaderWalletBadgeProps {
  balanceVnd: number;
  balanceUsd: number;
  className?: string;
}

type CurrencyMode = 'USD' | 'VND' | 'DUAL';

export function HeaderWalletBadge({
  balanceVnd,
  balanceUsd,
  className,
}: HeaderWalletBadgeProps) {
  // Mặc định: nếu có USD ưu tiên hiển thị USD, ngược lại hiển thị VND
  const defaultMode: CurrencyMode = balanceUsd > 0 && balanceVnd === 0 ? 'USD' : 'VND';
  const [mode, setMode] = useState<CurrencyMode>(defaultMode);
  const [mounted, setMounted] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('blog_wallet_currency_mode') as CurrencyMode;
    if (saved && ['USD', 'VND', 'DUAL'].includes(saved)) {
      setMode(saved);
    }
  }, []);

  const totalInVnd = balanceVnd + Math.round(balanceUsd * USD_TO_VND_RATE);
  const totalInUsd = Number(((balanceVnd / USD_TO_VND_RATE) + balanceUsd).toFixed(2));

  const cycleMode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 300);

    const nextMode: CurrencyMode =
      mode === 'USD' ? 'VND' : mode === 'VND' ? 'DUAL' : 'USD';
    setMode(nextMode);
    try {
      localStorage.setItem('blog_wallet_currency_mode', nextMode);
      window.dispatchEvent(new Event('wallet-currency-mode-change'));
    } catch {
      // ignore
    }
  };

  const renderAmount = () => {
    if (mode === 'USD') {
      return `$${balanceUsd > 0 && balanceVnd === 0 ? balanceUsd.toFixed(2) : totalInUsd.toFixed(2)}`;
    }
    if (mode === 'VND') {
      return `${(balanceVnd > 0 && balanceUsd === 0 ? balanceVnd : totalInVnd).toLocaleString('vi-VN')} đ`;
    }
    return `$${totalInUsd.toFixed(2)} ≈ ${(totalInVnd / 1000).toLocaleString('vi-VN')}k`;
  };

  const getTooltip = () => {
    if (mode === 'USD') {
      return `Đang xem theo USD: ≈ ${totalInVnd.toLocaleString('vi-VN')} đ (Nhấn nút xoay tua để xem VND)`;
    }
    if (mode === 'VND') {
      return `Đang xem theo VND: ≈ $${totalInUsd.toFixed(2)} USD (Nhấn nút xoay tua để xem USD)`;
    }
    return `Đang xem song song: $${totalInUsd.toFixed(2)} USD ≈ ${totalInVnd.toLocaleString('vi-VN')} đ (1 USD = ${USD_TO_VND_RATE.toLocaleString('vi-VN')} đ)`;
  };

  return (
    <div
      className={cn(
        'group inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-xs hover:border-emerald-500/60 hover:bg-emerald-500/15 transition-all select-none',
        className,
      )}
      title={getTooltip()}
    >
      <Link
        href="/account?tab=wallet"
        className="flex items-center gap-1.5 pl-2.5 py-1 pr-1 hover:text-emerald-700 dark:hover:text-emerald-300 transition"
        title="Nhấn để mở khu vực Ví và nạp/rút tiền"
      >
        <Wallet className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="font-mono tracking-tight font-extrabold whitespace-nowrap">
          {mounted
            ? renderAmount()
            : balanceUsd > 0
            ? `$${balanceUsd.toFixed(2)}`
            : `${balanceVnd.toLocaleString('vi-VN')} đ`}
        </span>
      </Link>

      <button
        type="button"
        onClick={cycleMode}
        className="flex items-center gap-1 pr-2.5 pl-1.5 py-1 text-emerald-600/75 hover:text-emerald-700 dark:text-emerald-400/80 dark:hover:text-emerald-200 transition-colors cursor-pointer border-l border-emerald-500/25 ml-0.5"
        title="Xoay tua hiển thị giữa USD và VND"
        aria-label="Xoay tua đơn vị tiền tệ"
      >
        <span className="text-[10px] font-mono font-bold uppercase tracking-tight opacity-80">
          {mounted ? mode : balanceUsd > 0 ? 'USD' : 'VND'}
        </span>
        <RefreshCw
          className={cn(
            'size-3 transition-transform duration-300',
            isRotating && 'rotate-180',
          )}
        />
      </button>
    </div>
  );
}
