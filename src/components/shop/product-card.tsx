'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button, buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/use-cart';
import { ShoppingCart, Check, MessageCircle } from 'lucide-react';
import { ProductCover } from '@/components/shop/product-cover';
import { conditionLabel } from '@/lib/shop/labels';
import type { VariantSummary } from '@/lib/shop/variants';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { siteConfig } from '@/config/site';

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
  /** Có mặt ở trang Shop: giá và tồn kho lấy từ biến thể thay vì cột Product. */
  shop?: {
    type: 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT';
    condition: string | null;
    summary: VariantSummary;
  };
  variant?: 'grid' | 'list';
}

export function ProductCard({ product, shop, variant = 'grid' }: ProductCardProps) {
  const addItem = useCart((state) => state.addItem);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addItem(product.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const mode = product.saleMode || (product.priceVnd === 0 ? 'FREE' : 'PAID');
  const summary = shop?.summary;
  const isSource = (shop?.type ?? 'DOWNLOAD') === 'DOWNLOAD';
  const needsDetail = Boolean(shop && (shop.type !== 'DOWNLOAD' || summary?.hasMultiple));
  const priceVnd = summary ? summary.minPriceVnd : product.priceVnd;
  const compareAtVnd = summary ? summary.compareAtVnd : product.compareAtVnd;
  const showFrom = Boolean(summary && summary.minPriceVnd !== summary.maxPriceVnd);
  const soldOut = Boolean(summary?.soldOut);
  const discountPercent =
    mode === 'PAID' && compareAtVnd && compareAtVnd > priceVnd
      ? Math.round(((compareAtVnd - priceVnd) / compareAtVnd) * 100)
      : null;

  const isList = variant === 'list';

  return (
    <Card
      className={cn(
        'hover:border-primary/40 overflow-hidden transition-all duration-200 hover:shadow-md',
        isList ? 'flex flex-col sm:flex-row' : 'flex h-full flex-col',
      )}
    >
      <CardHeader className={cn('p-0', isList && 'w-full shrink-0 sm:w-64 md:w-72')}>
        <Link href={`${siteConfig.shopPath}/${product.slug}`} className="relative block h-full">
          <ProductCover
            name={product.name}
            slug={product.slug}
            coverUrl={product.coverUrl}
            type={shop?.type ?? 'DOWNLOAD'}
            version={isSource ? product.version : undefined}
          />

          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {isSource && (
              <Badge variant="secondary" className="font-mono text-xs shadow-xs">
                v{product.version}
              </Badge>
            )}
            {shop?.condition && (
              <Badge variant="secondary" className="text-xs shadow-xs">
                {conditionLabel(shop.condition)}
              </Badge>
            )}
            {soldOut && (
              <Badge variant="destructive" className="text-xs shadow-xs">
                Hết hàng
              </Badge>
            )}
            {discountPercent && (
              <Badge variant="destructive" className="text-xs font-bold shadow-xs">
                -{discountPercent}%
              </Badge>
            )}
          </div>
        </Link>
      </CardHeader>

      <div
        className={cn(
          'flex flex-1',
          isList
            ? 'flex-col justify-between p-5 md:flex-row md:items-center md:gap-6'
            : 'flex-col justify-between',
        )}
      >
        <CardContent className={cn('space-y-3', isList ? 'p-0 md:flex-1' : 'flex-1 p-5')}>
          <div>
            <Link
              href={`${siteConfig.shopPath}/${product.slug}`}
              className="text-foreground hover:text-primary line-clamp-2 text-lg font-bold transition-colors"
            >
              {product.name}
            </Link>
            <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed sm:line-clamp-3">
              {product.shortDesc}
            </p>
          </div>

          <div className="flex items-baseline gap-2 pt-2">
            <span className="text-foreground text-2xl font-extrabold tracking-tight">
              {mode === 'FREE'
                ? 'Miễn phí'
                : mode === 'CONTACT'
                  ? 'Liên hệ báo giá'
                  : `${showFrom ? 'Từ ' : ''}${priceVnd.toLocaleString('vi-VN')} đ`}
            </span>
            {mode === 'PAID' && compareAtVnd && compareAtVnd > priceVnd && (
              <span className="text-muted-foreground text-sm line-through">
                {compareAtVnd.toLocaleString('vi-VN')} đ
              </span>
            )}
          </div>
        </CardContent>

        <CardFooter
          className={cn(
            'flex flex-col gap-2',
            isList ? 'p-0 pt-4 md:w-56 md:shrink-0 md:pt-0' : 'p-5 pt-0',
          )}
        >
          <div className="grid w-full grid-cols-2 gap-2">
            <Link
              href={`${siteConfig.shopPath}/${product.slug}`}
              className={buttonStyles({
                variant: 'outline',
                className: 'w-full text-xs font-medium',
              })}
            >
              Chi tiết
            </Link>
            {mode !== 'PAID' ? (
              <Link
                href={mode === 'FREE' ? `${siteConfig.shopPath}/${product.slug}` : '/about#lien-he'}
                className={buttonStyles({ className: 'w-full text-xs' })}
              >
                {mode === 'FREE' ? 'Tải miễn phí' : 'Liên hệ'}
              </Link>
            ) : soldOut ? (
              <Link href="/about#lien-he" className={buttonStyles({ className: 'w-full text-xs' })}>
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Liên hệ
              </Link>
            ) : needsDetail ? (
              <Link
                href={`${siteConfig.shopPath}/${product.slug}`}
                className={buttonStyles({ className: 'w-full text-xs font-semibold' })}
              >
                Chọn mua
              </Link>
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
                    {isSource ? 'Mua source' : 'Chọn mua'}
                  </>
                )}
              </Button>
            )}
          </div>
          {isSource && (
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
      </div>
    </Card>
  );
}
