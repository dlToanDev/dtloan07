'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button, buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/use-cart';
import { ShoppingCart, Check, MessageCircle } from 'lucide-react';
import { ProductCover } from '@/components/shop/product-cover';
import { useState } from 'react';

export interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    name: string;
    shortDesc: string;
    priceVnd: number;
    saleMode?: 'FREE' | 'CONTACT' | 'PAID';
    compareAtVnd?: number | null;
    coverUrl?: string;
    version: string;
    maxDownloads: number;
  };
  catalog?: 'source-code' | 'shop';
}

export function ProductCard({ product, catalog = 'shop' }: ProductCardProps) {
  const addItem = useCart((state) => state.addItem);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addItem(product.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const mode = product.saleMode || (product.priceVnd === 0 ? 'FREE' : 'PAID');
  const discountPercent =
    mode === 'PAID' && product.compareAtVnd && product.compareAtVnd > product.priceVnd
      ? Math.round(((product.compareAtVnd - product.priceVnd) / product.compareAtVnd) * 100)
      : null;

  return (
    <Card className="hover:border-primary/40 flex h-full flex-col overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader className="p-0">
        <Link href={`/${catalog}/${product.slug}`} className="relative block">
          <ProductCover
            name={product.name}
            slug={product.slug}
            coverUrl={product.coverUrl}
            kind={catalog === 'source-code' ? 'SOURCE_CODE' : 'SHOP'}
          />

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
        </Link>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 p-5">
        <div>
          <Link
            href={`/${catalog}/${product.slug}`}
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
            {mode === 'FREE'
              ? 'Miễn phí'
              : mode === 'CONTACT'
                ? 'Liên hệ báo giá'
                : `${product.priceVnd.toLocaleString('vi-VN')} đ`}
          </span>
          {mode === 'PAID' && product.compareAtVnd && product.compareAtVnd > product.priceVnd && (
            <span className="text-muted-foreground text-sm line-through">
              {product.compareAtVnd.toLocaleString('vi-VN')} đ
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 p-5 pt-0">
        <div className="grid w-full grid-cols-2 gap-2">
          <Link
            href={`/${catalog}/${product.slug}`}
            className={buttonStyles({
              variant: 'outline',
              className: 'w-full text-xs font-medium',
            })}
          >
            Chi tiết
          </Link>
          {mode !== 'PAID' ? (
            <a
              href={mode === 'FREE' ? `/${catalog}/${product.slug}` : '/about#lien-he'}
              className={buttonStyles({ className: 'w-full text-xs' })}
            >
              {mode === 'FREE' ? 'Tải miễn phí' : 'Liên hệ'}
            </a>
          ) : (
            <Button
              onClick={handleAddToCart}
              className="w-full text-xs font-semibold"
              disabled={added}
            >
              {added ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Đã thêm
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                  {catalog === 'source-code' ? 'Mua source' : 'Chọn mua'}
                </>
              )}
            </Button>
          )}
        </div>
        {catalog === 'source-code' && (
          <Link
            href="/about#lien-he"
            className={buttonStyles({
              variant: 'ghost',
              className: 'text-muted-foreground w-full text-xs font-medium',
            })}
          >
            <MessageCircle className="mr-1.5 size-3.5" /> Nhắn tin đặt theo yêu cầu
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
