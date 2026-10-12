'use client';

import { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import { Button, buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { checkDepositOrderStatus, simulateMockDepositSuccess } from '@/server/actions/wallet';
import type { DepositLinkResult } from '@/lib/wallet';

export type QrDepositData = DepositLinkResult;

interface QrDepositModalProps {
  open: boolean;
  onClose: () => void;
  data: QrDepositData | null;
  onSuccess?: (newBalanceVnd?: number, newBalanceUsd?: number) => void;
}

export function QrDepositModal({ open, onClose, data, onSuccess }: QrDepositModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 phút đếm ngược
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Khởi tạo và reset khi mở modal mới
  useEffect(() => {
    if (!open || !data?.orderCode) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPaid(false);
      setTimeLeft(900);
      return;
    }

    setIsPaid(false);
    setTimeLeft(900);

    // Đếm ngược 15 phút
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (pollingRef.current) clearInterval(pollingRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Polling kiểm tra trạng thái thanh toán mỗi 2.5s
    const checkStatus = async () => {
      if (!data.orderCode) return;
      try {
        const res = await checkDepositOrderStatus(data.orderCode);
        if (res.success && res.isPaid) {
          setIsPaid(true);
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          if (onSuccess) {
            onSuccess(res.newBalanceVnd, res.newBalanceUsd);
          }
        }
      } catch (err) {
        console.error('Lỗi khi polling trạng thái nạp tiền:', err);
      }
    };

    pollingRef.current = setInterval(checkStatus, 2500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, data?.orderCode, onSuccess]);

  if (!open || !data) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadQr = () => {
    if (!data.qrImageUrl) return;
    const link = document.createElement('a');
    link.href = data.qrImageUrl;
    link.download = `VietQR-NapTien-${data.orderCode}.png`;
    link.target = '_blank';
    link.click();
  };

  const handleMockSuccess = async () => {
    if (!data.orderCode || isSimulating) return;
    setIsSimulating(true);
    try {
      const res = await simulateMockDepositSuccess(data.orderCode);
      if (res.success) {
        setIsPaid(true);
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        if (onSuccess) {
          onSuccess();
        }
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isUsd = data.depositCurrency === 'USD';
  const amountFormatted = isUsd
    ? `$${data.depositAmount}`
    : `${(data.amountVnd || 0).toLocaleString('vi-VN')} đ`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-deposit-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Lớp nền mờ */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Thân Modal */}
      <div className="border-border bg-card relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl transition-all">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
              <QrCode className="size-5" />
            </div>
            <div>
              <h2 id="qr-deposit-title" className="text-foreground text-base font-bold sm:text-lg">
                Quét mã VietQR để nạp tiền
              </h2>
              <p className="text-muted-foreground text-xs">
                Mã giao dịch:{' '}
                <span className="text-foreground font-mono font-semibold">{data.orderCode}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nội dung khi đã thanh toán thành công */}
        {isPaid ? (
          <div className="space-y-5 p-8 text-center">
            <div className="bg-success/10 text-success mx-auto flex size-20 animate-bounce items-center justify-center rounded-full">
              <CheckCircle2 className="size-12" />
            </div>

            <div className="space-y-2">
              <Badge className="bg-success text-success-foreground px-3 py-1 font-bold">
                Giao dịch thành công
              </Badge>
              <h3 className="text-foreground text-2xl font-black">+{amountFormatted} đã vào ví!</h3>
              <p className="text-muted-foreground mx-auto max-w-md text-sm">
                Hệ thống đã tự động xác thực khoản nạp VietQR và cập nhật số dư tức thì vào tài
                khoản của bạn.
              </p>
            </div>

            <div className="pt-3">
              <Button onClick={onClose} variant="success" className="px-8 font-bold shadow-md">
                Hoàn tất & Xem số dư ví
              </Button>
            </div>
          </div>
        ) : (
          /* Nội dung khi đang chờ quét mã */
          <div className="space-y-6 p-6">
            <div className="grid items-center gap-6 sm:grid-cols-12">
              {/* Khung mã QR */}
              <div className="flex flex-col items-center justify-center space-y-3 sm:col-span-6">
                <div className="border-success/30 relative rounded-2xl border-2 bg-white p-3 shadow-md">
                  {data.qrImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={data.qrImageUrl}
                      alt="VietQR nạp tiền vào ví"
                      className="size-52 object-contain sm:size-56"
                    />
                  ) : (
                    <div className="text-muted-foreground flex size-52 items-center justify-center text-xs">
                      Đang tải mã VietQR...
                    </div>
                  )}

                  {/* Huy hiệu NAPAS 24/7 */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-success text-success-foreground rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs">
                      VIETQR 24/7 TỰ ĐỘNG
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadQr}
                    className="h-8 text-xs"
                  >
                    <Download className="mr-1.5 size-3.5" />
                    Tải ảnh QR
                  </Button>
                  {data.checkoutUrl && (
                    <a
                      href={data.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonStyles({
                        variant: 'ghost',
                        size: 'sm',
                        className: 'h-8 text-xs',
                      })}
                    >
                      <ExternalLink className="mr-1.5 size-3.5" />
                      Mở PayOS
                    </a>
                  )}
                </div>
              </div>

              {/* Thông tin chuyển khoản chi tiết */}
              <div className="space-y-3 sm:col-span-6">
                <div className="bg-muted/40 border-border/80 space-y-2.5 rounded-xl border p-3.5 text-xs">
                  {/* Ngân hàng */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ngân hàng:</span>
                    <span className="text-foreground font-bold">{data.bankName || 'MB Bank'}</span>
                  </div>

                  {/* Chủ tài khoản */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Chủ tài khoản:</span>
                    <span className="text-foreground font-bold uppercase">
                      {data.accountName || 'TRAN MINH TOAN'}
                    </span>
                  </div>

                  {/* Số tài khoản */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Số tài khoản:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-foreground font-mono text-sm font-bold">
                        {data.accountNumber || '0359876543'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(data.accountNumber || '0359876543', 'accountNumber')
                        }
                        className="text-muted-foreground hover:text-primary rounded p-0.5 transition"
                        title="Sao chép số tài khoản"
                      >
                        {copiedField === 'accountNumber' ? (
                          <Check className="text-success size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Số tiền */}
                  <div className="border-border/60 flex items-center justify-between border-t pt-2">
                    <span className="text-muted-foreground">Số tiền thanh toán:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-success text-sm font-bold">
                        {(data.amountVnd || 0).toLocaleString('vi-VN')} đ
                      </span>
                      {isUsd && (
                        <span className="text-muted-foreground text-[11px] font-medium">
                          (Quy đổi từ ${data.depositAmount})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(String(data.amountVnd || 0), 'amount')}
                        className="text-muted-foreground hover:text-primary rounded p-0.5 transition"
                        title="Sao chép số tiền"
                      >
                        {copiedField === 'amount' ? (
                          <Check className="text-success size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Nội dung chuyển khoản */}
                  <div className="border-border/60 space-y-1 border-t pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Nội dung chuyển khoản (bắt buộc):
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(data.description || '', 'description')}
                        className="text-primary inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                      >
                        {copiedField === 'description' ? (
                          <>
                            <Check className="text-success size-3" /> Đã sao chép
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" /> Sao chép
                          </>
                        )}
                      </button>
                    </div>
                    <div className="border-warning/30 bg-warning/10 text-warning rounded-md border px-2.5 py-1.5 font-mono text-xs font-bold break-all select-all">
                      {data.description}
                    </div>
                  </div>
                </div>

                <div className="border-info/20 bg-info/10 text-info flex items-start gap-2 rounded-lg border p-2.5 text-[11px]">
                  <ShieldCheck className="text-info mt-0.5 size-4 shrink-0" />
                  <span>
                    Mở ứng dụng ngân hàng bất kỳ (MB, Vietcombank, Techcombank, MoMo...) và quét mã
                    QR. Tiền sẽ vào ví tự động ngay sau khi chuyển khoản thành công.
                  </span>
                </div>
              </div>
            </div>

            {/* Thanh trạng thái kiểm tra thời gian thực */}
            <div className="border-border/80 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="relative flex size-2.5">
                  <span className="bg-success/80 absolute inline-flex size-full animate-ping rounded-full opacity-75"></span>
                  <span className="bg-success relative inline-flex size-2.5 rounded-full"></span>
                </span>
                <span>Đang chờ chuyển khoản... Tự động kiểm tra sau mỗi 2s</span>
                <span className="text-muted-foreground/80 font-mono text-[11px]">
                  ({formattedTime})
                </span>
              </div>

              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                {/* Nút giả lập nạp thành công trong môi trường Dev/Mock */}
                {data.isMock && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSimulating}
                    onClick={handleMockSuccess}
                    className="border-warning/50 text-warning hover:bg-warning/10 text-xs font-semibold"
                    title="Dùng cho kiểm thử khi chưa gắn PayOS API Keys thật"
                  >
                    {isSimulating ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1.5 size-3.5" />
                    )}
                    Test nạp thành công (Demo)
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-xs"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
