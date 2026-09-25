'use client';

import type { AffiliateItem } from '@prisma/client';

interface AffiliateCardProps {
  deal: AffiliateItem;
}

const DEFAULT_PRODUCT_IMAGE = '/images/products/default-affiliate-product.svg';

export function AffiliateCard({ deal }: AffiliateCardProps) {
  return (
    <a
      href={`/go/${deal.slug}`}
      target="_blank"
      rel="sponsored nofollow noopener"
      aria-label={`Xem sản phẩm ${deal.name}`}
      className="group border-border bg-card focus-visible:ring-ring block overflow-hidden rounded-2xl border shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-lg focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="bg-muted/30 relative aspect-[4/3] overflow-hidden border-b">
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
      </div>

      <div className="space-y-2 p-4 sm:p-5">
        <h2 className="text-foreground group-hover:text-primary line-clamp-2 text-base leading-snug font-bold transition-colors">
          {deal.name}
        </h2>
        <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
          {deal.description}
        </p>
      </div>
    </a>
  );
}
