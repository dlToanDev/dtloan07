'use client';

import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type Fuse from 'fuse.js';
import type { FuseResult } from 'fuse.js';
import { Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

interface IndexItem {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  publishedAt: string;
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<IndexItem[] | null>(null);
  const [fuse, setFuse] = useState<Fuse<IndexItem> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  // Ctrl/Cmd + K mở nhanh — thói quen của dân lập trình.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /**
   * Tải index VÀ thư viện Fuse chỉ khi người dùng thực sự mở tìm kiếm.
   * Import tĩnh `fuse.js` sẽ kéo nó vào chunk chung của mọi trang (Header nằm
   * trong layout gốc) và đẩy Total Blocking Time lên — đã đo thấy trên /blog.
   */
  useEffect(() => {
    if (!open || index !== null) return;

    let cancelled = false;

    void (async () => {
      try {
        const [response, { default: FuseCtor }] = await Promise.all([
          fetch('/search-index.json'),
          import('fuse.js'),
        ]);
        const data: IndexItem[] = await response.json();
        if (cancelled) return;

        setIndex(data);
        setFuse(
          new FuseCtor(data, {
            keys: [
              { name: 'title', weight: 3 },
              { name: 'tags', weight: 2 },
              { name: 'description', weight: 1 },
            ],
            threshold: 0.4,
            ignoreLocation: true,
          }),
        );
      } catch {
        if (!cancelled) setIndex([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, index]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results: FuseResult<IndexItem>[] = useMemo(() => {
    if (!fuse || query.trim().length < 2) return [];
    return fuse.search(query.trim()).slice(0, 8);
  }, [fuse, query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tìm kiếm bài viết"
        className="hover:bg-muted inline-flex size-9 items-center justify-center rounded-lg transition-colors"
      >
        <Search className="size-5" aria-hidden="true" />
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tìm kiếm bài viết"
        description="Gõ ít nhất 2 ký tự. Mẹo: Ctrl/⌘ + K."
      >
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nginx, Docker, Zod..."
          aria-label="Từ khoá"
        />

        <div aria-live="polite" className="mt-4">
          {!fuse && (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-xs">
              <Loader2 className="text-primary size-3.5 animate-spin" />
              <span>Đang tải chỉ mục tìm kiếm...</span>
            </div>
          )}

          {fuse && query.trim().length >= 2 && results.length === 0 ? (
            <p className="text-muted-foreground text-sm">Không tìm thấy bài nào khớp.</p>
          ) : null}

          <ul className="flex flex-col">
            {results.map(({ item }) => (
              <li key={item.slug}>
                <Link
                  href={`/blog/${item.slug}`}
                  className={cn('hover:bg-muted block rounded-lg px-3 py-2 transition-colors')}
                >
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="text-muted-foreground line-clamp-1 block text-xs">
                    {item.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </>
  );
}
