'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Minus, Plus, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddToCartButton } from '@/components/shop/add-to-cart-button';
import {
  effectiveStock,
  pickDefaultVariant,
  PURCHASABLE_TYPES,
  type ProductTypeValue,
  type VariantSnapshot,
} from '@/lib/shop/variants';

const formatVnd = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

export function VariantPurchasePanel({
  productId,
  type,
  deliveryMode,
  variants,
}: {
  productId: string;
  type: ProductTypeValue;
  deliveryMode?: 'AUTO' | 'MANUAL' | null;
  variants: VariantSnapshot[];
}) {
  const stockOf = (variant: VariantSnapshot) => effectiveStock({ type, deliveryMode }, variant);
  const inStock = (variant: VariantSnapshot) => {
    const stock = stockOf(variant);
    return stock === null || stock > 0;
  };
  const active = variants.filter((variant) => variant.active);
  const initial = active.find(inStock) ?? pickDefaultVariant(variants);
  const [selectedId, setSelectedId] = useState(initial?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const selected = active.find((variant) => variant.id === selectedId) ?? initial;

  if (!selected) {
    return <p className="text-muted-foreground text-sm">Sản phẩm tạm ngừng bán.</p>;
  }

  const purchasable = PURCHASABLE_TYPES.includes(type);
  const availableStock = stockOf(selected);
  const maxQty = availableStock !== null ? Math.max(1, availableStock) : 99;

  const handleDecreaseQty = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncreaseQty = () => {
    setQuantity((prev) => Math.min(maxQty, prev + 1));
  };

  const discount =
    selected.compareAtVnd && selected.compareAtVnd > selected.priceVnd
      ? Math.round(((selected.compareAtVnd - selected.priceVnd) / selected.compareAtVnd) * 100)
      : null;

  const savingAmount =
    selected.compareAtVnd && selected.compareAtVnd > selected.priceVnd
      ? selected.compareAtVnd - selected.priceVnd
      : null;

  return (
    <div className="space-y-6">
      {/* Khối giá tiền to rõ ràng */}
      <div className="bg-muted/40 border-border/60 space-y-1.5 rounded-xl border p-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-foreground text-primary text-3xl font-black tracking-tight sm:text-4xl">
            {formatVnd(selected.priceVnd)}
          </span>
          {discount && selected.compareAtVnd && (
            <>
              <span className="text-muted-foreground text-lg line-through">
                {formatVnd(selected.compareAtVnd)}
              </span>
              <Badge variant="destructive" className="px-2 py-0.5 text-xs font-bold shadow-xs">
                -{discount}%
              </Badge>
            </>
          )}
        </div>
        {savingAmount && (
          <p className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            Tiết kiệm {formatVnd(savingAmount)} so với giá niêm yết
          </p>
        )}
      </div>

      {/* Bộ chọn biến thể (Size / Phân loại) */}
      {active.length > 1 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground font-semibold">Phân loại / Kích cỡ:</span>
            <span className="text-primary font-medium">{selected.name}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {active.map((variant) => {
              const hasStock = inStock(variant);
              const isSelected = variant.id === selected.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(variant.id);
                    setQuantity(1);
                  }}
                  title={hasStock ? undefined : 'Tạm hết hàng'}
                  className={`relative flex items-center justify-center rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                    !hasStock
                      ? 'border-border/40 text-muted-foreground/50 line-through opacity-60'
                      : ''
                  } ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary ring-primary/20 shadow-xs ring-2'
                      : 'border-border/80 bg-background hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  {variant.name}
                  {isSelected && (
                    <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] shadow-xs">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tình trạng tồn kho & Bộ chọn số lượng */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {availableStock !== null ? (
              availableStock > 0 ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Còn hàng ({availableStock} {type === 'ACCOUNT' ? 'tài khoản' : 'sản phẩm'} sẵn
                    có)
                  </span>
                </>
              ) : (
                <>
                  <span className="bg-destructive h-2 w-2 rounded-full"></span>
                  <span className="text-destructive font-medium">Tạm hết hàng</span>
                </>
              )
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Sẵn sàng cung cấp
                </span>
              </>
            )}
          </div>
        </div>

        {/* Bộ đếm số lượng */}
        {purchasable && inStock(selected) && (
          <div className="flex items-center gap-4">
            <span className="text-foreground text-sm font-semibold">Số lượng:</span>
            <div className="border-border bg-background flex items-center rounded-lg border shadow-xs">
              <button
                type="button"
                onClick={handleDecreaseQty}
                disabled={quantity <= 1}
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-l-lg disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Giảm số lượng"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-foreground w-12 text-center text-sm font-bold">{quantity}</span>
              <button
                type="button"
                onClick={handleIncreaseQty}
                disabled={quantity >= maxQty}
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-r-lg disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Tăng số lượng"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nút đặt hàng hoặc liên hệ */}
      {purchasable && !inStock(selected) ? (
        <Link
          href="/about#lien-he"
          className={buttonStyles({ size: 'lg', className: 'h-12 w-full text-sm font-semibold' })}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Liên hệ đặt trước
        </Link>
      ) : (
        <AddToCartButton
          productId={productId}
          variantId={selected.id}
          quantity={quantity}
          disabled={!purchasable}
          disabledLabel="Sắp mở bán"
        />
      )}
    </div>
  );
}
