'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Wallet,
  QrCode,
  Crown,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { PRO_PLANS, type MembershipPlanValue } from '@/lib/membership';
import { USD_TO_VND_RATE } from '@/lib/wallet';
import { getCurrentUserWallet, purchaseProWithWallet } from '@/server/actions/wallet';
import Link from 'next/link';

export function BuyProButton({
  plan,
  label,
  highlight = false,
}: {
  plan: MembershipPlanValue;
  label: string;
  highlight?: boolean;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'WALLET' | 'PAYOS'>('WALLET');
  const [preferredCurrency, setPreferredCurrency] = useState<'VND' | 'USD'>('VND');

  const [wallet, setWallet] = useState<{
    balanceVnd: number;
    balanceUsd: number;
    totalInVnd: number;
    totalInUsd: number;
  } | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const [pendingWallet, setPendingWallet] = useState(false);
  const [pendingPayOS, setPendingPayOS] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const planInfo = PRO_PLANS[plan];
  const priceVnd = planInfo.priceVnd;
  const priceUsd = Number((priceVnd / USD_TO_VND_RATE).toFixed(2));

  // Tải thông tin số dư ví khi mở modal
  useEffect(() => {
    if (!modalOpen) return;
    setLoadingWallet(true);
    setError('');
    setSuccessMessage('');

    getCurrentUserWallet()
      .then((data) => {
        setWallet(data);
        if (data) {
          // Ưu tiên USD nếu tài khoản có USD đủ mà VND không đủ
          if (data.balanceUsd >= priceUsd && data.balanceVnd < priceVnd) {
            setPreferredCurrency('USD');
          } else {
            setPreferredCurrency('VND');
          }
          // Nếu ví không đủ thì tự động chuyển sang tab PayOS
          if (data.totalInVnd < priceVnd) {
            setSelectedMethod('PAYOS');
          } else {
            setSelectedMethod('WALLET');
          }
        }
      })
      .catch((err) => {
        console.error('Lỗi lấy ví người dùng:', err);
      })
      .finally(() => {
        setLoadingWallet(false);
      });
  }, [modalOpen, priceUsd, priceVnd]);

  // Thanh toán bằng số dư Ví
  const handlePayWithWallet = async () => {
    setPendingWallet(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await purchaseProWithWallet(plan, preferredCurrency);
      if (!res.success) {
        setError(res.error || 'Thanh toán bằng ví thất bại.');
        setPendingWallet(false);
        return;
      }

      setSuccessMessage(res.message || 'Nâng cấp PRO thành công!');
      setTimeout(() => {
        setModalOpen(false);
        router.refresh();
      }, 1500);
    } catch {
      setError('Lỗi kết nối khi thanh toán ví. Vui lòng thử lại.');
      setPendingWallet(false);
    }
  };

  // Thanh toán bằng quét mã VietQR PayOS
  const handlePayWithPayOS = async () => {
    setPendingPayOS(true);
    setError('');

    try {
      const res = await fetch('/api/pro/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error || 'Không tạo được thanh toán PayOS. Vui lòng thử lại.');
        setPendingPayOS(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError('Lỗi kết nối tới PayOS. Vui lòng thử lại.');
      setPendingPayOS(false);
    }
  };

  const hasEnoughBalance = (wallet?.totalInVnd ?? 0) >= priceVnd;

  return (
    <>
      <div className="space-y-2">
        <Button
          type="button"
          onClick={() => setModalOpen(true)}
          variant={highlight ? 'primary' : 'outline'}
          className="w-full"
        >
          {label}
        </Button>
      </div>

      <Dialog
        open={modalOpen}
        onClose={() => {
          if (!pendingWallet && !pendingPayOS) {
            setModalOpen(false);
          }
        }}
        title={`Nâng cấp ${planInfo.label}`}
        description={`Thời hạn: ${planInfo.days} ngày · Giá: ${priceVnd.toLocaleString('vi-VN')} đ (~ $${priceUsd} USD)`}
        className="max-w-lg"
      >
        <div className="space-y-5 pt-2">
          {/* Header tóm tắt gói */}
          <div className="border-primary/20 bg-primary/5 flex items-center justify-between rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                <Crown className="size-5" />
              </div>
              <div>
                <h4 className="text-foreground font-bold">{planInfo.label}</h4>
                <p className="text-muted-foreground text-xs">{planInfo.hint}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-primary text-lg font-extrabold">
                {priceVnd.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-muted-foreground text-xs">≈ ${priceUsd} USD</div>
            </div>
          </div>

          {/* Chọn 1 trong 2 phương thức thanh toán */}
          <div className="space-y-3">
            <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Chọn phương thức thanh toán
            </label>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {/* Cách 1: Ví tài khoản */}
              <button
                type="button"
                onClick={() => setSelectedMethod('WALLET')}
                className={`relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                  selectedMethod === 'WALLET'
                    ? 'border-primary bg-primary/5 ring-primary/20 ring-2'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="size-4 text-emerald-500" />
                    <span className="text-sm font-semibold">Ví tài khoản</span>
                  </div>
                  {hasEnoughBalance && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Khả dụng
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-1.5 text-xs">
                  Trừ tiền trực tiếp vào số dư ví. Không cần quét QR.
                </p>
              </button>

              {/* Cách 2: Quét mã QR PayOS */}
              <button
                type="button"
                onClick={() => setSelectedMethod('PAYOS')}
                className={`relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                  selectedMethod === 'PAYOS'
                    ? 'border-primary bg-primary/5 ring-primary/20 ring-2'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="text-primary size-4" />
                    <span className="text-sm font-semibold">Quét mã VietQR</span>
                  </div>
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                    PayOS
                  </span>
                </div>
                <p className="text-muted-foreground mt-1.5 text-xs">
                  Quét mã QR bằng App ngân hàng / MoMo / ZaloPay.
                </p>
              </button>
            </div>
          </div>

          {/* Chi tiết cho phương thức: VÍ TÀI KHOẢN */}
          {selectedMethod === 'WALLET' && (
            <div className="border-border bg-card space-y-3.5 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-xs font-semibold">Số dư ví của bạn:</span>
                {loadingWallet ? (
                  <Loader2 className="text-muted-foreground size-3 animate-spin" />
                ) : (
                  <span className="text-muted-foreground text-xs">Tỷ giá: 1 USD = 25.972 đ</span>
                )}
              </div>

              {wallet ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="border-border/80 bg-muted/40 rounded-lg border p-2.5">
                    <span className="text-muted-foreground block text-[11px]">Số dư VND:</span>
                    <span className="text-foreground font-bold">
                      {wallet.balanceVnd.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="border-border/80 bg-muted/40 rounded-lg border p-2.5">
                    <span className="text-muted-foreground block text-[11px]">Số dư USD:</span>
                    <span className="text-foreground font-bold">
                      ${wallet.balanceUsd.toFixed(2)} USD
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Vui lòng đăng nhập để kiểm tra số dư ví.
                </p>
              )}

              {/* Tùy chọn trừ tiền bằng loại tiền nào nếu ví có cả 2 */}
              {wallet && hasEnoughBalance && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-muted-foreground text-[11px] font-medium">
                    Chọn loại tiền ưu tiên trừ:
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreferredCurrency('VND')}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-center transition ${
                        preferredCurrency === 'VND'
                          ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      Trừ bằng VND ({priceVnd.toLocaleString('vi-VN')} đ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreferredCurrency('USD')}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-center transition ${
                        preferredCurrency === 'USD'
                          ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      Trừ bằng USD (${priceUsd} USD)
                    </button>
                  </div>
                </div>
              )}

              {/* Trạng thái số dư */}
              {wallet && (
                <div>
                  {hasEnoughBalance ? (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>Số dư ví đủ điều kiện. Tiền sẽ được trừ và kích hoạt PRO ngay.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>
                          Số dư ví không đủ (Tổng khả dụng:{' '}
                          {wallet.totalInVnd.toLocaleString('vi-VN')} đ).
                        </span>
                      </div>
                      <Link
                        href="/account?tab=wallet"
                        className="border-primary/40 text-primary hover:bg-primary/5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs font-semibold"
                      >
                        Nạp thêm tiền vào ví tại đây
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="button"
                onClick={handlePayWithWallet}
                disabled={pendingWallet || !wallet || !hasEnoughBalance}
                className="w-full font-bold"
              >
                {pendingWallet ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Đang kích hoạt gói PRO...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Xác nhận trừ ví & Kích hoạt ngay
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Chi tiết cho phương thức: QUÉT MÃ VIETQR PAYOS */}
          {selectedMethod === 'PAYOS' && (
            <div className="border-border bg-card space-y-3.5 rounded-xl border p-4">
              <div className="text-muted-foreground space-y-1 text-xs leading-relaxed">
                <p>• Hệ thống chuyển hướng bạn sang cổng thanh toán VietQR chính thức của PayOS.</p>
                <p>• Quét mã bằng mọi ứng dụng ngân hàng hoặc ví điện tử (MoMo, ViettelMoney).</p>
                <p>
                  • Sau khi thanh toán thành công, hệ thống tự động cộng thời hạn PRO ngay lập tức.
                </p>
              </div>

              <Button
                type="button"
                onClick={handlePayWithPayOS}
                disabled={pendingPayOS}
                className="w-full font-bold"
              >
                {pendingPayOS ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Đang tạo phiên thanh toán PayOS...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 size-4" />
                    Tạo mã QR & Quét thanh toán PayOS
                    <ArrowRight className="ml-1.5 size-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Thông báo lỗi & thành công */}
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
            >
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
