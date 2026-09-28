'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
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
  const selected = active.find((variant) => variant.id === selectedId) ?? initial;

  if (!selected) {
    return <p className="text-muted-foreground text-sm">Sản phẩm tạm ngừng bán.</p>;
  }

  const purchasable = PURCHASABLE_TYPES.includes(type);
  const discount =
    selected.compareAtVnd && selected.compareAtVnd > selected.priceVnd
      ? Math.round(((selected.compareAtVnd - selected.priceVnd) / selected.compareAtVnd) * 100)
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-foreground text-3xl font-extrabold">
          {formatVnd(selected.priceVnd)}
        </span>
        {discount && (
          <>
            <span className="text-muted-foreground text-base line-through">
              {formatVnd(selected.compareAtVnd!)}
            </span>
            <Badge variant="destructive" className="text-xs font-bold">
              -{discount}%
            </Badge>
          </>
        )}
      </div>

      {active.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Lựa chọn: <span className="text-muted-foreground">{selected.name}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {active.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedId(variant.id)}
                title={inStock(variant) ? undefined : 'Tạm hết hàng — liên hệ để đặt'}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  inStock(variant) ? '' : 'text-muted-foreground line-through'
                } ${
                  variant.id === selected.id
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {variant.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {stockOf(selected) !== null && (
        <p className="text-muted-foreground text-xs">
          {(stockOf(selected) ?? 0) > 0
            ? `Còn ${stockOf(selected)} ${type === 'ACCOUNT' ? 'tài khoản' : 'sản phẩm'}`
            : 'Tạm hết hàng — liên hệ để đặt trước'}
        </p>
      )}

      {/* Hết hàng (số lượng = 0) → cho khách liên hệ thay vì nút mua bị khóa. */}
      {purchasable && !inStock(selected) ? (
        <Link
          href="/about#lien-he"
          className={buttonStyles({ size: 'lg', className: 'h-12 w-full text-sm font-semibold' })}
        >
          <MessageCircle className="h-4 w-4" />
          Liên hệ
        </Link>
      ) : (
        <AddToCartButton
          productId={productId}
          variantId={selected.id}
          disabled={!purchasable}
          disabledLabel="Sắp mở bán"
        />
      )}
    </div>
  );
}
