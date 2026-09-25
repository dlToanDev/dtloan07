'use client';

import { useState } from 'react';
import { ProductCover } from '@/components/shop/product-cover';

export function ProductGallery({
  name,
  slug,
  kind,
  coverUrl,
  gallery,
  version,
}: {
  name: string;
  slug: string;
  kind: 'SOURCE_CODE' | 'SHOP';
  coverUrl: string;
  gallery: string[];
  version?: string;
}) {
  const images = [...new Set([coverUrl, ...gallery].filter(Boolean))];
  const [active, setActive] = useState(images[0] ?? '');

  return (
    <div className="space-y-3">
      <ProductCover
        name={name}
        slug={slug}
        coverUrl={active}
        kind={kind}
        version={version}
        className="border-border rounded-xl border"
      />
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(url)}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                url === active
                  ? 'border-primary'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              aria-label="Xem ảnh"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-16 object-cover sm:size-20" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
