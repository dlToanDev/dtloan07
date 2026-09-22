'use client';

import { useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Check, Zap } from 'lucide-react';

interface AddToCartButtonProps {
  productId: string;
}

export function AddToCartButton({ productId }: AddToCartButtonProps) {
  const addItem = useCart((state) => state.addItem);
  const openCart = useCart((state) => state.openCart);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    setAdding(true);
    addItem(productId, 1);
    setTimeout(() => {
      setAdding(false);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }, 250);
  };

  const handleBuyNow = () => {
    addItem(productId, 1);
    openCart();
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        onClick={handleAddToCart}
        variant="outline"
        size="lg"
        className="h-12 flex-1 text-sm font-semibold"
        disabled={added}
        loading={adding}
        loadingText="Đang thêm..."
      >
        {added ? (
          <>
            <Check className="mr-2 h-4 w-4 text-emerald-500" />
            Đã thêm vào giỏ
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Thêm vào giỏ hàng
          </>
        )}
      </Button>

      <Button
        onClick={handleBuyNow}
        size="lg"
        className="h-12 flex-1 text-sm font-semibold shadow-sm"
      >
        <Zap className="mr-2 h-4 w-4" />
        Mua ngay
      </Button>
    </div>
  );
}
