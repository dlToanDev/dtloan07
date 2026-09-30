'use client';

import { useCart } from '@/hooks/use-cart';
import { ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';

export function CartButton() {
  const [mounted, setMounted] = useState(false);
  const items = useCart((state) => state.items);
  const toggleCart = useCart((state) => state.toggleCart);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalCount = items.reduce((acc, item) => acc + item.qty, 0);

  return (
    <button
      type="button"
      onClick={toggleCart}
      className="hover:bg-muted text-muted-foreground hover:text-foreground relative inline-flex size-9 items-center justify-center rounded-lg transition-colors"
      title="Giỏ hàng"
      aria-label={`Giỏ hàng (${totalCount} sản phẩm)`}
    >
      <ShoppingCart className="size-4" />
      {mounted && totalCount > 0 && (
        <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
          {totalCount}
        </span>
      )}
    </button>
  );
}
