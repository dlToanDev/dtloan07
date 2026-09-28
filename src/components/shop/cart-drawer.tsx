'use client';

import { useCart } from '@/hooks/use-cart';
import { useEffect, useState, useTransition } from 'react';
import { X, Trash2, Plus, Minus, Tag, Loader2, ArrowRight, ShoppingBag } from 'lucide-react';
import { Button, buttonStyles } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface ValidatedCartItem {
  productId: string;
  variantId: string;
  variantName: string;
  hasMultipleVariants: boolean;
  stockLeft: number | null;
  name: string;
  slug: string;
  coverUrl: string;
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
  couponError?: string;
  errors?: string[];
}

export function CartDrawer() {
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const { items, isOpen, closeCart, updateQty, removeItem, couponCode, setCouponCode } = useCart();
  const [cartData, setCartData] = useState<ValidatedCartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Đồng bộ giỏ hàng với server mỗi khi items hoặc couponCode thay đổi
  useEffect(() => {
    if (!isOpen) return;

    if (items.length === 0) {
      setCartData(null);
      return;
    }

    let isSubscribed = true;
    setLoading(true);

    fetch('/api/cart/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, couponCode }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (isSubscribed && res.success) {
          setCartData(res.data);
          if (res.data.couponError) {
            setCouponError(res.data.couponError);
          } else {
            setCouponError(null);
          }

          // Giỏ cũ trong localStorage chưa có variantId: gắn biến thể mặc định
          // mà server vừa chọn, để nút +/− và nút xóa khớp đúng dòng.
          const legacy = items.filter((item) => !item.variantId);
          if (legacy.length > 0) {
            const store = useCart.getState();
            for (const item of legacy) {
              const resolved = (res.data.items as ValidatedCartItem[]).find(
                (line) => line.productId === item.productId,
              );
              if (!resolved?.variantId) continue;
              store.removeItem(item.productId);
              store.addItem(item.productId, item.qty, resolved.variantId);
            }
          }
        }
      })
      .catch((err) => console.error('Lỗi tính giá giỏ hàng:', err))
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [items, couponCode, isOpen]);

  // Đóng bằng phím Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponError(null);
    startTransition(() => {
      setCouponCode(couponInput.trim().toUpperCase());
    });
  }

  function handleRemoveCoupon() {
    setCouponInput('');
    setCouponError(null);
    setCouponCode(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="animate-in fade-in fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer content */}
      <aside className="border-border bg-card animate-in slide-in-from-right relative flex h-full w-full max-w-md flex-col border-l shadow-2xl transition-transform duration-200">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b p-4">
          <div className="text-foreground flex items-center gap-2 font-semibold">
            <ShoppingBag className="text-primary h-5 w-5" />
            <span>Giỏ hàng của bạn</span>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors"
            aria-label="Đóng giỏ hàng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Danh sách items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="text-muted-foreground/40 mb-3 h-12 w-12" />
              <p className="text-foreground font-medium">Giỏ hàng của bạn đang trống</p>
              <p className="text-muted-foreground mt-1 max-w-xs text-xs">
                Hãy lựa chọn các template và giải pháp hạ tầng server để thêm vào giỏ hàng.
              </p>
              <Link
                href="/shop"
                onClick={closeCart}
                className={buttonStyles({ variant: 'outline', className: 'mt-5 text-xs' })}
              >
                Khám phá sản phẩm
              </Link>
            </div>
          ) : (
            <div className="divide-border divide-y">
              {cartData?.errors && cartData.errors.length > 0 && (
                <p
                  role="alert"
                  className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400"
                >
                  {cartData.errors.join(' ')}
                </p>
              )}
              {cartData?.items.map((item) => (
                <div
                  key={`${item.productId}:${item.variantId}`}
                  className="flex gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${item.slug}`}
                      onClick={closeCart}
                      className="text-foreground hover:text-primary line-clamp-1 text-sm font-semibold transition-colors"
                    >
                      {item.name}
                    </Link>
                    {item.hasMultipleVariants && (
                      <p className="text-muted-foreground text-xs">{item.variantName}</p>
                    )}
                    <div className="text-muted-foreground mt-1 text-xs">
                      Đơn giá: {item.unitPriceVnd.toLocaleString('vi-VN')} đ
                    </div>

                    {/* Bộ điều khiển số lượng */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="border-border flex items-center rounded-md border">
                        <button
                          type="button"
                          onClick={() => updateQty(item.productId, item.qty - 1, item.variantId)}
                          className="text-muted-foreground hover:text-foreground px-2 py-1"
                          aria-label="Giảm số lượng"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-semibold">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.productId, item.qty + 1, item.variantId)}
                          disabled={item.stockLeft !== null && item.qty >= item.stockLeft}
                          className="text-muted-foreground hover:text-foreground px-2 py-1 disabled:opacity-40"
                          aria-label="Tăng số lượng"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-foreground text-sm font-bold">
                          {item.itemTotalVnd.toLocaleString('vi-VN')} đ
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                          aria-label="Xoá món hàng"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer tính tiền */}
        {items.length > 0 && (
          <div className="border-border bg-muted/30 space-y-4 border-t p-4">
            {/* Nhập mã giảm giá */}
            <form onSubmit={handleApplyCoupon} className="space-y-1.5">
              <div className="flex gap-2">
                <Input
                  placeholder="Mã giảm giá (vd: WELCOME10)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="h-9 text-xs uppercase"
                  disabled={loading || isPending}
                />
                <Button type="submit" size="sm" variant="outline" disabled={loading || isPending}>
                  {loading || isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Áp dụng'}
                </Button>
              </div>

              {couponError && <p className="text-xs text-rose-500">{couponError}</p>}

              {cartData?.couponApplied && (
                <div className="flex items-center justify-between rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Tag className="h-3.5 w-3.5" />
                    <span>
                      Đã áp dụng mã: {cartData.couponApplied.code}
                      {cartData.couponApplied.type === 'FREE_SHIP' &&
                        ' (miễn phí ship ở bước thanh toán)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-muted-foreground hover:text-foreground text-[10px] hover:underline"
                  >
                    Gỡ bỏ
                  </button>
                </div>
              )}
            </form>

            {/* Bảng tổng kết tiền */}
            <div className="border-border/60 space-y-1.5 border-t pt-3 text-sm">
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>Tạm tính:</span>
                <span>{(cartData?.subtotalVnd ?? 0).toLocaleString('vi-VN')} đ</span>
              </div>
              {(cartData?.discountVnd ?? 0) > 0 && (
                <div className="flex justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span>Giảm giá:</span>
                  <span>-{(cartData?.discountVnd ?? 0).toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div className="text-foreground border-border/40 flex justify-between border-t pt-1 text-base font-bold">
                <span>Tổng cộng:</span>
                <span className="text-primary">
                  {(cartData?.totalVnd ?? 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Nút thanh toán */}
            {isLoggedIn ? (
              <Link
                href="/checkout"
                onClick={closeCart}
                className={buttonStyles({ className: 'w-full font-semibold shadow-md' })}
              >
                Tiến hành thanh toán
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/login?callbackUrl=/checkout"
                onClick={closeCart}
                className={buttonStyles({ className: 'w-full font-semibold shadow-md' })}
              >
                Đăng nhập để thanh toán
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
