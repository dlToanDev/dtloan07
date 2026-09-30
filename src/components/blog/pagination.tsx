import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function hrefForPage(page: number): string {
  // Trang 1 luôn là /blog, không phải /blog/page/1 — tránh trùng lặp nội dung.
  return page === 1 ? '/blog' : `/blog/page/${page}`;
}

export function Pagination({ current, total }: { current: number; total: number }) {
  if (total <= 1) return null;

  const pages = Array.from({ length: total }, (_, index) => index + 1);

  return (
    <nav aria-label="Phân trang" className="mt-12 flex items-center justify-center gap-2">
      {current > 1 ? (
        <Link
          href={hrefForPage(current - 1)}
          rel="prev"
          className={buttonStyles({ variant: 'outline', size: 'sm' })}
        >
          Trang trước
        </Link>
      ) : null}

      <ul className="flex items-center gap-1">
        {pages.map((page) => (
          <li key={page}>
            <Link
              href={hrefForPage(page)}
              aria-current={page === current ? 'page' : undefined}
              aria-label={`Trang ${page}`}
              className={cn(
                buttonStyles({ variant: page === current ? 'primary' : 'ghost', size: 'sm' }),
                'min-w-9',
              )}
            >
              {page}
            </Link>
          </li>
        ))}
      </ul>

      {current < total ? (
        <Link
          href={hrefForPage(current + 1)}
          rel="next"
          className={buttonStyles({ variant: 'outline', size: 'sm' })}
        >
          Trang sau
        </Link>
      ) : null}
    </nav>
  );
}
