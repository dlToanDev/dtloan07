'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button, buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/use-cart';
import { ShoppingCart, Check, Download } from 'lucide-react';
import { useState } from 'react';

export interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    name: string;
    shortDesc: string;
    priceVnd: number;
    compareAtVnd?: number | null;
    coverUrl?: string;
    version: string;
    maxDownloads: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCart((state) => state.addItem);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addItem(product.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const discountPercent =
    product.compareAtVnd && product.compareAtVnd > product.priceVnd
      ? Math.round(((product.compareAtVnd - product.priceVnd) / product.compareAtVnd) * 100)
      : null;

  return (
    <Card className="hover:border-primary/40 flex h-full flex-col overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader className="p-0">
        <div className="bg-muted/60 relative flex aspect-video w-full items-center justify-center overflow-hidden">
          {/* Placeholder minh hoạ nếu chưa có ảnh CDN */}
          <div className="text-muted-foreground/60 flex flex-col items-center p-6 text-center">
            <Download className="text-primary/70 mb-2 h-10 w-10" />
            <span className="font-mono text-xs font-medium">{product.slug}</span>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <Badge variant="secondary" className="font-mono text-xs shadow-xs">
              v{product.version}
            </Badge>
            {discountPercent && (
              <Badge variant="destructive" className="text-xs font-bold shadow-xs">
                -{discountPercent}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 p-5">
        <div>
          <Link
            href={`/products/${product.slug}`}
            className="text-foreground hover:text-primary line-clamp-2 text-lg font-bold transition-colors"
          >
            {product.name}
          </Link>
          <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-relaxed">
            {product.shortDesc}
          </p>
        </div>

        <div className="flex items-baseline gap-2 pt-2">
          <span className="text-foreground text-2xl font-extrabold tracking-tight">
            {product.priceVnd.toLocaleString('vi-VN')} đ
          </span>
          {product.compareAtVnd && product.compareAtVnd > product.priceVnd && (
            <span className="text-muted-foreground text-sm line-through">
              {product.compareAtVnd.toLocaleString('vi-VN')} đ
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-2 p-5 pt-0">
        <Link
          href={`/products/${product.slug}`}
          className={buttonStyles({ variant: 'outline', className: 'w-full text-xs font-medium' })}
        >
          Chi tiết
        </Link>
        <Button onClick={handleAddToCart} className="w-full text-xs font-semibold" disabled={added}>
          {added ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Đã thêm
            </>
          ) : (
            <>
              <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
              Chọn mua
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
