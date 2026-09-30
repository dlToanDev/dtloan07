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

export function HeaderWalletBadge({ balanceVnd, balanceUsd, className }: HeaderWalletBadgeProps) {
  const [currentVnd, setCurrentVnd] = useState(balanceVnd);
  const [currentUsd, setCurrentUsd] = useState(balanceUsd);

  // Mặc định: nếu có USD ưu tiên hiển thị USD, ngược lại hiển thị VND
  const defaultMode: CurrencyMode = currentUsd > 0 && currentVnd === 0 ? 'USD' : 'VND';
  const [mode, setMode] = useState<CurrencyMode>(defaultMode);
  const [mounted, setMounted] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    setCurrentVnd(balanceVnd);
    setCurrentUsd(balanceUsd);
  }, [balanceVnd, balanceUsd]);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ balanceVnd?: number; balanceUsd?: number }>;
      if (customEvent.detail?.balanceVnd !== undefined) {
        setCurrentVnd(customEvent.detail.balanceVnd);
      }
      if (customEvent.detail?.balanceUsd !== undefined) {
        setCurrentUsd(customEvent.detail.balanceUsd);
      }
    };
    window.addEventListener('wallet-balance-updated', handleUpdate);
    return () => window.removeEventListener('wallet-balance-updated', handleUpdate);
  }, []);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('blog_wallet_currency_mode') as CurrencyMode;
    if (saved && ['USD', 'VND', 'DUAL'].includes(saved)) {
      setMode(saved);
    }
  }, []);

  const totalInVnd = currentVnd + Math.round(currentUsd * USD_TO_VND_RATE);
  const totalInUsd = Number((currentVnd / USD_TO_VND_RATE + currentUsd).toFixed(2));

  const cycleMode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 300);

    const nextMode: CurrencyMode = mode === 'USD' ? 'VND' : mode === 'VND' ? 'DUAL' : 'USD';
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
      return `$${currentUsd > 0 && currentVnd === 0 ? currentUsd.toFixed(2) : totalInUsd.toFixed(2)}`;
    }
    if (mode === 'VND') {
      return `${(currentVnd > 0 && currentUsd === 0 ? currentVnd : totalInVnd).toLocaleString('vi-VN')} đ`;
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
        'group inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-xs font-bold text-emerald-600 shadow-xs transition-all select-none hover:border-emerald-500/60 hover:bg-emerald-500/15 dark:text-emerald-400',
        className,
      )}
      title={getTooltip()}
    >
      <Link
        href="/account?tab=wallet"
        className="flex items-center gap-1.5 py-1 pr-1 pl-2.5 transition hover:text-emerald-700 dark:hover:text-emerald-300"
        title="Nhấn để mở khu vực Ví và nạp/rút tiền"
      >
        <Wallet className="size-3.5 shrink-0 text-emerald-600 transition-transform group-hover:scale-110 dark:text-emerald-400" />
        <span className="font-mono font-extrabold tracking-tight whitespace-nowrap">
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
        className="ml-0.5 flex cursor-pointer items-center gap-1 border-l border-emerald-500/25 py-1 pr-2.5 pl-1.5 text-emerald-600/75 transition-colors hover:text-emerald-700 dark:text-emerald-400/80 dark:hover:text-emerald-200"
        title="Xoay tua hiển thị giữa USD và VND"
        aria-label="Xoay tua đơn vị tiền tệ"
      >
        <span className="font-mono text-[10px] font-bold tracking-tight uppercase opacity-80">
          {mounted ? mode : balanceUsd > 0 ? 'USD' : 'VND'}
        </span>
        <RefreshCw
          className={cn('size-3 transition-transform duration-300', isRotating && 'rotate-180')}
        />
      </button>
    </div>
  );
}
