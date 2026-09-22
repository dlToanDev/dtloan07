'use client';

import { useCart } from '@/hooks/use-cart';
import { useEffect, useState } from 'react';
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
import { QrCode, ShieldCheck, ArrowRight, Loader2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

interface ValidatedCartItem {
  productId: string;
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
}

export default function CheckoutPage() {
  const { items, couponCode, clearCart } = useCart();
  const [cartData, setCartData] = useState<ValidatedCartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

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
          items,
          couponCode,
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

      // Chuyển hướng tới cổng thanh toán VietQR PayOS
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
              Vui lòng chọn ít nhất một sản phẩm số để tiến hành thanh toán.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pt-4">
            <Link href="/products" className={buttonStyles()}>
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
            Nhập email nhận hàng và quét mã VietQR tự động để nhận mã bản quyền ngay lập tức.
          </p>
        </div>

        <form onSubmit={handleCheckout} className="grid gap-8 lg:grid-cols-12">
          {/* Cột trái: Thông tin khách hàng */}
          <div className="space-y-6 lg:col-span-7">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Thông tin nhận sản phẩm</CardTitle>
                <CardDescription>
                  Mã bản quyền License và liên kết tải file sẽ được gửi trực tiếp đến email này.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-foreground text-sm font-medium">
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
                  <p className="text-muted-foreground text-xs">
                    Hãy đảm bảo email chính xác để không bị thất lạc mã License.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="name" className="text-foreground text-sm font-medium">
                    Họ và tên (tuỳ chọn)
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Phương thức thanh toán */}
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <QrCode className="text-primary h-5 w-5" />
                  Phương thức thanh toán
                </CardTitle>
                <CardDescription>
                  Chuyển khoản VietQR tự động 24/7 qua cổng PayOS (hỗ trợ mọi ngân hàng)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-primary/20 bg-primary/5 space-y-2 rounded-lg border p-4 text-sm">
                  <div className="text-foreground flex items-center gap-2 font-semibold">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Xác nhận tức thì qua Webhook VietQR
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Sau khi bấm nút bên dưới, bạn sẽ được chuyển tới giao diện mã VietQR động. Chỉ
                    cần mở app ngân hàng bất kỳ (VCB, MB, Techcombank, VPBank...) quét mã, tiền vào
                    là nhận file ngay.
                  </p>
                </div>
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
                      key={item.productId}
                      className="flex justify-between py-3 text-sm first:pt-0 last:pb-0"
                    >
                      <div>
                        <div className="text-foreground font-medium">{item.name}</div>
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

                  <div className="text-foreground border-border flex justify-between border-t pt-2 text-lg font-extrabold">
                    <span>Tổng thanh toán:</span>
                    <span className="text-primary">
                      {cartData.totalVnd.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

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
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang tạo mã VietQR...
                    </>
                  ) : (
                    <>
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
