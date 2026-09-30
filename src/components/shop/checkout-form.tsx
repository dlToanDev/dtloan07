'use client';

import { useCart } from '@/hooks/use-cart';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/layout/container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonStyles } from '@/components/ui/button';
import {
  QrCode,
  ShieldCheck,
  ArrowRight,
  Loader2,
  ShoppingBag,
  Truck,
  Banknote,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { PROVINCES } from '@/config/provinces';
import { getCurrentUserWallet } from '@/server/actions/wallet';

interface ValidatedCartItem {
  productId: string;
  variantId: string;
  variantName: string;
  hasMultipleVariants: boolean;
  type: 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT';
  name: string;
  slug: string;
  unitPriceVnd: number;
  qty: number;
  itemTotalVnd: number;
}

interface ValidatedCartData {
  items: ValidatedCartItem[];
  subtotalVnd: number;
  discountVnd: number;
  totalVnd: number;
  couponApplied: {
    code: string;
    type: string;
    value: number;
    discountVnd: number;
  } | null;
  errors?: string[];
}

interface ShippingQuote {
  /** Phí khách trả, đã trừ phần voucher free ship. */
  feeVnd: number;
  shippingDiscountVnd?: number;
  proFreeShip?: boolean;
  zoneName: string | null;
  freeShip: boolean;
}

const fieldLabel = 'text-foreground text-sm font-medium';
const selectClass = 'border-border bg-background w-full rounded-lg border px-3 py-2.5 text-sm';

export function CheckoutForm({
  initialEmail = '',
  initialName = '',
}: {
  initialEmail?: string;
  initialName?: string;
}) {
  const { items, couponCode, clearCart } = useCart();
  const [cartData, setCartData] = useState<ValidatedCartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'PAYOS' | 'COD'>('WALLET');
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [quoting, setQuoting] = useState(false);

  const [wallet, setWallet] = useState<{
    balanceVnd: number;
    balanceUsd: number;
    totalInVnd: number;
    totalInUsd: number;
  } | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);

  // Lấy thông tin ví của người dùng
  useEffect(() => {
    getCurrentUserWallet()
      .then((data) => {
        setWallet(data);
        if (data && data.totalInVnd > 0) {
          setPaymentMethod('WALLET');
        } else {
          setPaymentMethod('PAYOS');
        }
      })
      .catch((err) => console.error('Lỗi lấy thông tin ví:', err))
      .finally(() => setLoadingWallet(false));
  }, []);

  useEffect(() => {
    if (initialEmail && !email) setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (initialName && !name) setName(initialName);
  }, [initialName]);

  const hasPhysical = useMemo(
    () => (cartData?.items ?? []).some((item) => item.type === 'PHYSICAL'),
    [cartData],
  );
  const allPhysical = useMemo(
    () =>
      (cartData?.items ?? []).length > 0 &&
      (cartData?.items ?? []).every((item) => item.type === 'PHYSICAL'),
    [cartData],
  );

  // Lấy giá trị thực tế của giỏ hàng từ server
  useEffect(() => {
    if (items.length === 0) {
      setLoading(false);
      return;
    }

    fetch('/api/cart/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, couponCode }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setCartData(res.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [items, couponCode]);

  // COD chỉ dùng được khi mọi món đều là hàng vật lý
  useEffect(() => {
    if (!allPhysical && paymentMethod === 'COD') setPaymentMethod('PAYOS');
  }, [allPhysical, paymentMethod]);

  // Chọn tỉnh xong thì hỏi server phí ship
  useEffect(() => {
    if (!hasPhysical || !province) {
      setShippingQuote(null);
      return;
    }
    let subscribed = true;
    setQuoting(true);
    fetch('/api/shipping/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, province, couponCode }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (subscribed && res.success) setShippingQuote(res.data);
      })
      .catch((err) => console.error('Lỗi tính phí ship:', err))
      .finally(() => subscribed && setQuoting(false));
    return () => {
      subscribed = false;
    };
  }, [hasPhysical, province, items, couponCode]);

  const shippingFeeVnd = hasPhysical ? (shippingQuote?.feeVnd ?? 0) : 0;
  const grandTotalVnd = (cartData?.totalVnd ?? 0) + shippingFeeVnd;

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          phone,
          items,
          couponCode,
          paymentMethod,
          ...(hasPhysical && { shipping: { province, address, note } }),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
        setSubmitting(false);
        return;
      }

      // Xoá giỏ hàng sau khi tạo đơn thành công
      clearCart();

      // Chuyển hướng tới cổng thanh toán VietQR PayOS (hoặc trang cảm ơn với COD)
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError('Lỗi kết nối tới máy chủ thanh toán. Vui lòng thử lại.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Container className="flex min-h-[60vh] items-center justify-center py-16">
        <div className="text-muted-foreground flex flex-col items-center gap-3">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-sm">Đang tải thông tin đơn hàng...</p>
        </div>
      </Container>
    );
  }

  if (items.length === 0 || !cartData || cartData.items.length === 0) {
    return (
      <Container className="flex min-h-[60vh] items-center justify-center py-16">
        <Card className="w-full max-w-md p-6 text-center">
          <CardHeader className="flex flex-col items-center">
            <ShoppingBag className="text-muted-foreground/50 mb-2 h-12 w-12" />
            <CardTitle className="text-xl">Giỏ hàng của bạn đang trống</CardTitle>
            <CardDescription>
              Vui lòng chọn ít nhất một sản phẩm để tiến hành thanh toán.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pt-4">
            <Link href={siteConfig.shopPath} className={buttonStyles()}>
              Khám phá sản phẩm
            </Link>
          </CardFooter>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Thanh toán đơn hàng</h1>
          <p className="text-muted-foreground mt-1">
            {hasPhysical
              ? 'Nhập thông tin nhận hàng, chọn hình thức thanh toán và hoàn tất đơn.'
              : 'Nhập email nhận hàng và quét mã VietQR tự động để nhận mã bản quyền ngay lập tức.'}
          </p>
        </div>

        <form onSubmit={handleCheckout} className="grid gap-8 lg:grid-cols-12">
          {/* Cột trái: Thông tin khách hàng */}
          <div className="space-y-6 lg:col-span-7">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Thông tin người nhận</CardTitle>
                <CardDescription>
                  {hasPhysical
                    ? 'Chúng tôi dùng số điện thoại này để liên hệ trước khi giao hàng.'
                    : 'Mã bản quyền License và liên kết tải file sẽ được gửi tới email này.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className={fieldLabel}>
                    Địa chỉ Email <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ban@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="name" className={fieldLabel}>
                      Họ và tên <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className={fieldLabel}>
                      Số điện thoại <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="0912345678"
                      pattern="(0|\+84)[0-9]{9}"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {hasPhysical && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <Truck className="text-primary h-5 w-5" />
                    Địa chỉ nhận hàng
                  </CardTitle>
                  <CardDescription>
                    Phí vận chuyển được tính theo tỉnh/thành bạn chọn.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="province" className={fieldLabel}>
                      Tỉnh / Thành phố <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="province"
                      className={selectClass}
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      required
                      disabled={submitting}
                    >
                      <option value="">— Chọn tỉnh/thành —</option>
                      {PROVINCES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    {shippingQuote?.zoneName && (
                      <p className="text-muted-foreground text-xs">
                        Khu vực: {shippingQuote.zoneName}
                        {shippingQuote.freeShip ? ' — đủ điều kiện miễn phí ship' : ''}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="address" className={fieldLabel}>
                      Địa chỉ chi tiết <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      id="address"
                      type="text"
                      placeholder="Số nhà, đường, phường/xã"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="note" className={fieldLabel}>
                      Ghi chú (tuỳ chọn)
                    </label>
                    <Input
                      id="note"
                      type="text"
                      placeholder="Giao giờ hành chính, gọi trước khi tới…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Phương thức thanh toán */}
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <QrCode className="text-primary h-5 w-5" />
                  Phương thức thanh toán
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 1. Thanh toán bằng Ví tài khoản */}
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                    paymentMethod === 'WALLET' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="WALLET"
                    checked={paymentMethod === 'WALLET'}
                    onChange={() => setPaymentMethod('WALLET')}
                    className="accent-primary mt-1 size-4"
                    disabled={submitting}
                  />
                  <div className="flex-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground flex items-center gap-2 font-semibold">
                        <Wallet className="h-4 w-4 text-emerald-500" />
                        Thanh toán bằng số dư Ví tài khoản
                      </span>
                      {wallet && wallet.totalInVnd >= grandTotalVnd && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Khả dụng
                        </span>
                      )}
                    </div>

                    <div className="text-muted-foreground mt-1.5 space-y-1 text-xs">
                      {loadingWallet ? (
                        <div className="text-muted-foreground flex items-center gap-1.5">
                          <Loader2 className="size-3 animate-spin" />
                          <span>Đang kiểm tra số dư ví...</span>
                        </div>
                      ) : wallet ? (
                        <div>
                          <div>
                            Số dư ví:{' '}
                            <strong className="text-foreground">
                              ${wallet.balanceUsd.toFixed(2)} USD
                            </strong>{' '}
                            (≈ {(wallet.balanceUsd * 25972).toLocaleString('vi-VN')} đ)
                            {wallet.balanceVnd > 0 && (
                              <span>
                                {' '}
                                +{' '}
                                <strong className="text-foreground">
                                  {wallet.balanceVnd.toLocaleString('vi-VN')} đ
                                </strong>
                              </span>
                            )}
                            <span className="text-muted-foreground mt-0.5 block text-[11px]">
                              Tổng khả dụng:{' '}
                              <strong className="text-primary">
                                {wallet.totalInVnd.toLocaleString('vi-VN')} đ
                              </strong>
                            </span>
                          </div>

                          {wallet.totalInVnd >= grandTotalVnd ? (
                            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-3.5 shrink-0" />
                              <span>
                                Đủ số dư. Tiền sẽ được trừ trực tiếp và đơn hàng hoàn tất ngay lập
                                tức (không cần quét QR).
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1.5 space-y-1">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                <AlertCircle className="size-3.5 shrink-0" />
                                <span>
                                  Số dư ví không đủ ({wallet.totalInVnd.toLocaleString('vi-VN')} đ
                                  &lt; {grandTotalVnd.toLocaleString('vi-VN')} đ).
                                </span>
                              </div>
                              <Link
                                href="/account?tab=wallet"
                                target="_blank"
                                className="text-primary inline-flex items-center gap-1 text-[11px] underline underline-offset-2 hover:opacity-80"
                              >
                                Nạp thêm tiền vào ví tại đây
                                <ArrowRight className="size-3" />
                              </Link>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p>Vui lòng đăng nhập để thanh toán bằng số dư ví tài khoản.</p>
                      )}
                    </div>
                  </div>
                </label>

                {/* 2. Quét mã VietQR PayOS */}
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                    paymentMethod === 'PAYOS' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="PAYOS"
                    checked={paymentMethod === 'PAYOS'}
                    onChange={() => setPaymentMethod('PAYOS')}
                    className="accent-primary mt-1 size-4"
                    disabled={submitting}
                  />
                  <span className="text-sm">
                    <span className="text-foreground flex items-center gap-2 font-semibold">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Chuyển khoản / QR (PayOS)
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                      Quét VietQR bằng app ngân hàng bất kỳ, hệ thống xác nhận tự động 24/7.
                    </span>
                  </span>
                </label>

                {/* 3. COD */}
                {allPhysical && (
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                      paymentMethod === 'COD' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="accent-primary mt-1 size-4"
                      disabled={submitting}
                    />
                    <span className="text-sm">
                      <span className="text-foreground flex items-center gap-2 font-semibold">
                        <Banknote className="h-4 w-4 text-emerald-500" />
                        Thanh toán khi nhận hàng (COD)
                      </span>
                      <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                        Trả tiền mặt cho đơn vị vận chuyển. Chỉ áp dụng cho đơn toàn hàng vật lý.
                      </span>
                    </span>
                  </label>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cột phải: Tóm tắt đơn hàng */}
          <div className="space-y-6 lg:col-span-5">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Đơn hàng của bạn</CardTitle>
                <CardDescription>{cartData.items.length} mặt hàng đang thanh toán</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="divide-border divide-y">
                  {cartData.items.map((item) => (
                    <div
                      key={`${item.productId}:${item.variantId}`}
                      className="flex justify-between py-3 text-sm first:pt-0 last:pb-0"
                    >
                      <div>
                        <div className="text-foreground font-medium">{item.name}</div>
                        {item.hasMultipleVariants && (
                          <div className="text-muted-foreground text-xs">{item.variantName}</div>
                        )}
                        <div className="text-muted-foreground text-xs">
                          {item.unitPriceVnd.toLocaleString('vi-VN')} đ &times; {item.qty}
                        </div>
                      </div>
                      <div className="text-foreground font-semibold">
                        {item.itemTotalVnd.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-border space-y-2 border-t pt-4 text-sm">
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>Tạm tính:</span>
                    <span>{cartData.subtotalVnd.toLocaleString('vi-VN')} đ</span>
                  </div>

                  {cartData.discountVnd > 0 && (
                    <div className="flex justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span>Mã giảm giá ({cartData.couponApplied?.code}):</span>
                      <span>-{cartData.discountVnd.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}

                  {hasPhysical && !quoting && (shippingQuote?.shippingDiscountVnd ?? 0) > 0 && (
                    <div className="flex justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span>
                        {shippingQuote?.proFreeShip
                          ? 'Free ship tài khoản Pro:'
                          : `Voucher free ship (${cartData.couponApplied?.code}):`}
                      </span>
                      <span>-{shippingQuote!.shippingDiscountVnd!.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}

                  {hasPhysical && (
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>Phí vận chuyển:</span>
                      <span>
                        {quoting ? (
                          <Loader2 className="inline h-3 w-3 animate-spin" />
                        ) : !province ? (
                          'Chọn tỉnh để tính'
                        ) : shippingFeeVnd === 0 ? (
                          'Miễn phí'
                        ) : (
                          `${shippingFeeVnd.toLocaleString('vi-VN')} đ`
                        )}
                      </span>
                    </div>
                  )}

                  <div className="text-foreground border-border flex justify-between border-t pt-2 text-lg font-extrabold">
                    <span>Tổng thanh toán:</span>
                    <span className="text-primary">{grandTotalVnd.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                {cartData.errors && cartData.errors.length > 0 && (
                  <div
                    role="alert"
                    className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400"
                  >
                    {cartData.errors.join(' ')}
                  </div>
                )}

                {error && (
                  <div className="rounded-lg bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                    {error}
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full font-bold shadow-md"
                  disabled={
                    submitting ||
                    (cartData.errors?.length ?? 0) > 0 ||
                    (paymentMethod === 'WALLET' && (!wallet || wallet.totalInVnd < grandTotalVnd))
                  }
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý đơn hàng...
                    </>
                  ) : paymentMethod === 'WALLET' ? (
                    <>
                      <Wallet className="mr-2 h-4 w-4" />
                      Thanh toán bằng Ví ({grandTotalVnd.toLocaleString('vi-VN')} đ)
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : paymentMethod === 'COD' ? (
                    <>
                      <Banknote className="mr-2 h-4 w-4" />
                      Đặt hàng (COD)
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <QrCode className="mr-2 h-4 w-4" />
                      Thanh toán với VietQR
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </div>
    </Container>
  );
}
