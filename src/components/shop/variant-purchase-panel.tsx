'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AddToCartButton } from '@/components/shop/add-to-cart-button';
import {
  pickDefaultVariant,
  PURCHASABLE_TYPES,
  type ProductTypeValue,
  type VariantSnapshot,
} from '@/lib/shop/variants';

const formatVnd = (value: number) => `${value.toLocaleString('vi-VN')} đ`;
const inStock = (variant: VariantSnapshot) => variant.stock === null || variant.stock > 0;

export function VariantPurchasePanel({
  productId,
  type,
  variants,
}: {
  productId: string;
  type: ProductTypeValue;
  variants: VariantSnapshot[];
}) {
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
                disabled={!inStock(variant)}
                onClick={() => setSelectedId(variant.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
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

      {selected.stock !== null && (
        <p className="text-muted-foreground text-xs">
          {selected.stock > 0 ? `Còn ${selected.stock} sản phẩm` : 'Tạm hết hàng'}
        </p>
      )}

      <AddToCartButton
        productId={productId}
        variantId={selected.id}
        disabled={!purchasable || !inStock(selected)}
        disabledLabel={purchasable ? 'Tạm hết hàng' : 'Sắp mở bán'}
      />
    </div>
  );
}
