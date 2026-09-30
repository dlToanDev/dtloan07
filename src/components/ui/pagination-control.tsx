'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonStyles } from '@/components/ui/button';

export interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  totalItems?: number;
  pageSize?: number;
}

export function PaginationControl({
  currentPage,
  totalPages,
  onPageChange,
  className,
  totalItems,
  pageSize = 12,
}: PaginationControlProps) {
  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);

    // Cuộn mượt lên vị trí danh sách
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  // Tạo mảng số trang với dấu "..." nếu có nhiều trang
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = totalItems
    ? Math.min(currentPage * pageSize, totalItems)
    : currentPage * pageSize;

  return (
    <div
      className={cn(
        'mt-10 flex flex-col items-center justify-between gap-4 sm:flex-row',
        className,
      )}
    >
      {totalItems !== undefined ? (
        <p className="text-muted-foreground text-xs">
          Hiển thị <strong>{startItem}</strong> - <strong>{endItem}</strong> trong tổng số{' '}
          <strong>{totalItems}</strong> mục
        </p>
      ) : (
        <div />
      )}

      <nav aria-label="Phân trang" className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => handlePageChange(currentPage - 1)}
          className={cn(
            buttonStyles({ variant: 'outline', size: 'sm' }),
            'cursor-pointer gap-1 text-xs disabled:pointer-events-none disabled:opacity-40',
          )}
          aria-label="Trang trước"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Trang trước</span>
        </button>

        <ul className="flex items-center gap-1">
          {pages.map((p, idx) =>
            p === 'ellipsis' ? (
              <li key={`ell-${idx}`} className="text-muted-foreground px-2 text-xs">
                …
              </li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => handlePageChange(p)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  aria-label={`Trang ${p}`}
                  className={cn(
                    buttonStyles({
                      variant: p === currentPage ? 'primary' : 'outline',
                      size: 'sm',
                    }),
                    'h-8 min-w-8.5 cursor-pointer text-xs font-semibold transition-colors',
                  )}
                >
                  {p}
                </button>
              </li>
            ),
          )}
        </ul>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
          className={cn(
            buttonStyles({ variant: 'outline', size: 'sm' }),
            'cursor-pointer gap-1 text-xs disabled:pointer-events-none disabled:opacity-40',
          )}
          aria-label="Trang sau"
        >
          <span className="hidden sm:inline">Trang sau</span>
          <ChevronRight className="size-4" />
        </button>
      </nav>
    </div>
  );
}
