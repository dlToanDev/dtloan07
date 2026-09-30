'use client';

import { useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Check, Zap } from 'lucide-react';

interface AddToCartButtonProps {
  productId: string;
  variantId?: string;
  quantity?: number;
  disabled?: boolean;
  disabledLabel?: string;
}

export function AddToCartButton({
  productId,
  variantId,
  quantity = 1,
  disabled,
  disabledLabel,
}: AddToCartButtonProps) {
  const addItem = useCart((state) => state.addItem);
  const openCart = useCart((state) => state.openCart);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    setAdding(true);
    addItem(productId, quantity, variantId);
    setTimeout(() => {
      setAdding(false);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }, 250);
  };

  const handleBuyNow = () => {
    addItem(productId, quantity, variantId);
    openCart();
  };

  if (disabled) {
    return (
      <Button size="lg" disabled className="h-12 w-full text-sm font-semibold">
        {disabledLabel ?? 'Tạm hết hàng'}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Button
        onClick={handleAddToCart}
        variant="outline"
        size="lg"
        className="border-primary/40 hover:bg-primary/10 hover:text-primary flex h-12 w-full items-center justify-center gap-2 text-sm font-semibold whitespace-nowrap shadow-xs transition-all"
        disabled={added}
        loading={adding}
        loadingText="Đang thêm..."
      >
        {added ? (
          <>
            <Check className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>Đã thêm vào giỏ hàng!</span>
          </>
        ) : (
          <>
            <ShoppingCart className="text-primary h-4 w-4 shrink-0" />
            <span>Thêm vào giỏ hàng</span>
          </>
        )}
      </Button>

      <Button
        onClick={handleBuyNow}
        size="lg"
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-12 w-full items-center justify-center gap-2 text-base font-bold whitespace-nowrap shadow-md transition-all active:scale-[0.99]"
      >
        <Zap className="h-4 w-4 shrink-0 fill-current" />
        <span>Mua ngay</span>
      </Button>
    </div>
  );
}
