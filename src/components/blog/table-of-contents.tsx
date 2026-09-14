'use client';

import { cn } from '@/lib/utils';
import type { TocItem } from '@/types/post';
import { useEffect, useState } from 'react';

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (items.length === 0) return;

    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);

    if (headings.length === 0) return;

    // rootMargin cắt bớt phần trên (header sticky cao 4rem) và phần dưới,
    // nên chỉ heading nằm ở vùng đọc thực sự mới được tính là "đang đọc".
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );

    for (const heading of headings) observer.observe(heading);
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav
      aria-label="Mục lục"
      className="sticky top-24 hidden max-h-[calc(100dvh-8rem)] overflow-y-auto lg:block"
    >
      <p className="mb-3 text-sm font-semibold">Mục lục</p>
      <ul className="border-border flex flex-col gap-1 border-l">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={activeId === item.id ? 'location' : undefined}
              className={cn(
                'hover:text-foreground -ml-px block border-l py-1 text-sm transition-colors',
                item.depth === 3 ? 'pl-6' : 'pl-3',
                activeId === item.id
                  ? 'border-primary text-primary font-medium'
                  : 'text-muted-foreground border-transparent',
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
