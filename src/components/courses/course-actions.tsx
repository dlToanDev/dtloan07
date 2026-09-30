'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  PlayCircle,
  Wallet,
  QrCode,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { completeLesson, enrollFreeCourse } from '@/server/actions/learn';
import {
  getCurrentUserWallet,
  purchaseCourseWithWallet,
  createCoursePayOSPaymentLink,
} from '@/server/actions/wallet';
import { USD_TO_VND_RATE } from '@/lib/wallet';
import Link from 'next/link';

/** "Bắt đầu học" cho khóa miễn phí: ghi danh rồi vào bài đầu tiên. */
export function EnrollButton({
  courseId,
  firstLessonHref,
}: {
  courseId: string;
  firstLessonHref?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await enrollFreeCourse(courseId);
            if (!result.ok) return setError(result.error);
            if (firstLessonHref) router.push(firstLessonHref);
            else router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
        Bắt đầu học miễn phí
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** Đăng ký / Mua khóa học trả phí: Hỗ trợ 2 phương thức (Ví tài khoản hoặc Quét mã PayOS) */
export function EnrollPaidCourseButton({
  courseId,
  courseTitle,
  priceVnd,
  courseSlug,
  firstLessonHref,
}: {
  courseId: string;
  courseTitle: string;
  priceVnd: number;
  courseSlug: string;
  firstLessonHref?: string;
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

  const priceUsd = Number((priceVnd / USD_TO_VND_RATE).toFixed(2));

  // Tải thông tin ví khi mở modal
  useEffect(() => {
    if (!modalOpen) return;
    setLoadingWallet(true);
    setError('');
    setSuccessMessage('');

    getCurrentUserWallet()
      .then((data) => {
        setWallet(data);
        if (data) {
          if (data.balanceUsd >= priceUsd && data.balanceVnd < priceVnd) {
            setPreferredCurrency('USD');
          } else {
            setPreferredCurrency('VND');
          }
          if (data.totalInVnd < priceVnd) {
            setSelectedMethod('PAYOS');
          } else {
            setSelectedMethod('WALLET');
          }
        }
      })
      .catch((err) => console.error('Lỗi lấy ví người dùng:', err))
      .finally(() => setLoadingWallet(false));
  }, [modalOpen, priceUsd, priceVnd]);

  // Thanh toán bằng số dư Ví
  const handlePayWithWallet = async () => {
    setPendingWallet(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await purchaseCourseWithWallet(courseId, preferredCurrency);
      if (!res.success) {
        setError(res.error || 'Thanh toán khóa học bằng ví thất bại.');
        setPendingWallet(false);
        return;
      }

      setSuccessMessage(res.message || 'Đăng ký khóa học thành công!');
      setTimeout(() => {
        setModalOpen(false);
        if (firstLessonHref) {
          router.push(firstLessonHref);
        } else {
          router.refresh();
        }
      }, 1500);
    } catch {
      setError('Lỗi kết nối khi thanh toán ví. Vui lòng thử lại.');
      setPendingWallet(false);
    }
  };

  // Thanh toán bằng quét mã PayOS
  const handlePayWithPayOS = async () => {
    setPendingPayOS(true);
    setError('');

    try {
      const res = await createCoursePayOSPaymentLink(courseId);
      if (!res.success || !res.checkoutUrl) {
        setError(res.error || 'Không tạo được liên kết thanh toán PayOS. Vui lòng thử lại.');
        setPendingPayOS(false);
        return;
      }
      window.location.href = res.checkoutUrl;
    } catch {
      setError('Lỗi kết nối tới PayOS. Vui lòng thử lại.');
      setPendingPayOS(false);
    }
  };

  const hasEnoughBalance = (wallet?.totalInVnd ?? 0) >= priceVnd;

  return (
    <>
      <div className="space-y-2">
        <Button size="lg" className="w-full font-bold shadow-md" onClick={() => setModalOpen(true)}>
          <GraduationCap className="mr-1.5 size-4" />
          Đăng ký khóa học ({priceVnd.toLocaleString('vi-VN')} đ)
        </Button>
      </div>

      <Dialog
        open={modalOpen}
        onClose={() => {
          if (!pendingWallet && !pendingPayOS) {
            setModalOpen(false);
          }
        }}
        title="Đăng ký khóa học"
        description={courseTitle}
        className="max-w-lg"
      >
        <div className="space-y-5 pt-2">
          {/* Header giá khóa học */}
          <div className="border-primary/20 bg-primary/5 flex items-center justify-between rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <h4 className="text-foreground line-clamp-1 font-bold">{courseTitle}</h4>
                <p className="text-muted-foreground text-xs">Kích hoạt học tập trọn đời</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-primary text-lg font-extrabold">
                {priceVnd.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-muted-foreground text-xs">≈ ${priceUsd} USD</div>
            </div>
          </div>

          {/* Chọn phương thức thanh toán */}
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
                  Trừ tiền ví tài khoản & vào học ngay lập tức.
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
                    <span className="text-sm font-semibold">Quét VietQR</span>
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

              {/* Tùy chọn trừ tiền bằng loại tiền */}
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
                      <span>
                        Số dư ví đủ điều kiện. Tiền sẽ được trừ và kích hoạt khóa học ngay.
                      </span>
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
                    Đang kích hoạt khóa học...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Xác nhận trừ ví & Bắt đầu học
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
                  • Sau khi chuyển khoản thành công, hệ thống tự động ghi danh và mở khóa bài học
                  ngay.
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
                    Đang tạo mã VietQR PayOS...
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

/** Bài không có bài tập: học viên tự đánh dấu hoàn thành để mở bài sau. */
export function CompleteLessonButton({
  lessonId,
  nextHref,
}: {
  lessonId: string;
  nextHref?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await completeLesson(lessonId);
            if (!result.ok) return setError(result.error);
            if (nextHref) router.push(nextHref);
            router.refresh();
          })
        }
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="size-4" />
        )}
        Hoàn thành bài học{nextHref ? ' & học bài tiếp' : ''}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
