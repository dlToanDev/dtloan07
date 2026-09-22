'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AffiliateCategory, AffiliateItem } from '@prisma/client';
import { Check, Copy, ExternalLink, Sparkles, Tag } from 'lucide-react';

interface AffiliateCardProps {
  deal: AffiliateItem;
}

const CATEGORY_LABELS: Record<AffiliateCategory, string> = {
  CLOUD: 'VPS & Cloud',
  DOMAIN: 'Tên miền & DNS',
  DEVOPS: 'DevOps & Tooling',
  DEVTOOLS: 'Công cụ Dev & AI',
  SECURITY: 'Bảo mật & VPN',
  SHOPPING: 'Mua sắm & Thiết bị',
  SHOPEE: 'Shopee Deals',
  TIKTOK: 'TikTok Shop',
  TOOLCODE: 'Tool Code',
  OTHER: 'Khác',
};

export function AffiliateCard({ deal }: AffiliateCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!deal.couponCode) return;
    navigator.clipboard.writeText(deal.couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group border-border bg-card hover:border-primary/40 relative flex flex-col justify-between rounded-2xl border p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      {/* Header card: Logo + Tên + Category */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {deal.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={deal.logoUrl}
                alt={deal.name}
                className="border-border bg-background size-11 shrink-0 rounded-xl border object-contain p-1.5"
                loading="lazy"
              />
            ) : (
              <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
                {deal.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-foreground group-hover:text-primary font-bold transition-colors">
                {deal.name}
              </h3>
              <Badge
                variant="outline"
                className="text-muted-foreground mt-0.5 text-[11px] font-medium"
              >
                {CATEGORY_LABELS[deal.category] || deal.category}
              </Badge>
            </div>
          </div>

          {deal.featured && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <Sparkles className="size-3" /> Hot Deal
            </span>
          )}
        </div>

        {/* Perks badge nổi bật */}
        {deal.perks && (
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Tag className="size-3.5 shrink-0" />
            <span>{deal.perks}</span>
          </div>
        )}

        {/* Mô tả */}
        <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
          {deal.description}
        </p>
      </div>

      {/* Footer card: Mã coupon + Nút CTA */}
      <div className="border-border/80 mt-6 flex flex-col gap-3 border-t pt-4">
        {deal.couponCode ? (
          <div className="bg-muted/60 flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-muted-foreground font-mono">
              Mã:{' '}
              <strong className="text-foreground font-bold tracking-wider">
                {deal.couponCode}
              </strong>
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-primary inline-flex items-center gap-1 font-semibold hover:underline"
              title="Sao chép mã giảm giá"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Đã chép!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>
        ) : null}

        <a
          href={`/go/${deal.slug}`}
          target="_blank"
          rel="sponsored nofollow noopener"
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold shadow transition focus-visible:ring-2 focus-visible:outline-none"
        >
          Nhận ưu đãi ngay <ExternalLink className="size-4" />
        </a>
      </div>
    </div>
  );
}
