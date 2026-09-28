'use client';

import type { AffiliateItem } from '@prisma/client';
import { cn } from '@/lib/utils';
import { ExternalLink, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AffiliateCardProps {
  deal: AffiliateItem;
  variant?: 'grid' | 'list';
}

const DEFAULT_PRODUCT_IMAGE = '/images/products/default-affiliate-product.svg';

export function AffiliateCard({ deal, variant = 'grid' }: AffiliateCardProps) {
  const isList = variant === 'list';

  return (
    <a
      href={`/go/${deal.slug}`}
      target="_blank"
      rel="sponsored nofollow noopener"
      aria-label={`Xem sản phẩm ${deal.name}`}
      className={cn(
        'group border-border bg-card focus-visible:ring-ring overflow-hidden rounded-2xl border shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-lg focus-visible:ring-2 focus-visible:outline-none',
        isList ? 'flex flex-col sm:flex-row sm:items-center' : 'block',
      )}
    >
      <div
        className={cn(
          'bg-muted/30 relative shrink-0 overflow-hidden',
          isList
            ? 'aspect-video w-full border-b sm:aspect-[4/3] sm:w-44 sm:border-r sm:border-b-0'
            : 'aspect-[4/3] border-b',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={deal.logoUrl || DEFAULT_PRODUCT_IMAGE}
          alt={deal.name}
          loading="lazy"
          onError={(event) => {
            if (!event.currentTarget.src.endsWith(DEFAULT_PRODUCT_IMAGE)) {
              event.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
            }
          }}
          className="size-full bg-white object-contain p-2 transition duration-300 group-hover:scale-[1.03]"
        />
        {deal.featured && (
          <div className="absolute top-2 left-2">
            <Badge variant="destructive" className="text-[10px] font-bold">
              HOT
            </Badge>
          </div>
        )}
      </div>

      <div
        className={cn(
          'flex flex-1 justify-between',
          isList
            ? 'flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center'
            : 'flex-col space-y-2 p-4 sm:p-5',
        )}
      >
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            {deal.platform && (
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {deal.platform}
              </span>
            )}
            {deal.perks && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Tag className="size-3" /> {deal.perks}
              </span>
            )}
          </div>

          <h2 className="text-foreground group-hover:text-primary line-clamp-2 text-base leading-snug font-bold transition-colors">
            {deal.name}
          </h2>

          <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
            {deal.description}
          </p>
        </div>

        {isList && (
          <div className="flex shrink-0 items-center justify-end">
            <span className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors">
              Xem chi tiết <ExternalLink className="size-3.5" />
            </span>
          </div>
        )}
      </div>
    </a>
  );
}
