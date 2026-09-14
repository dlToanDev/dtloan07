'use client';

import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';
import { useRef, useState, type ComponentProps } from 'react';

/**
 * Bọc <pre> do rehype-pretty-code sinh ra để thêm nút Copy và tiêu đề file.
 * Lấy text từ DOM thay vì từ children: children đã là cây span đã tô màu,
 * ghép tay sẽ mất xuống dòng.
 */
export function CodeBlock({ className, children, ...props }: ComponentProps<'pre'>) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = ref.current?.innerText ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard bị chặn (không phải HTTPS / user từ chối quyền) — bỏ qua im lặng.
    }
  }

  return (
    <div className="group relative my-6">
      <pre
        ref={ref}
        className={cn(
          'border-border bg-muted/60 overflow-x-auto rounded-lg border py-4 text-sm leading-relaxed',
          className,
        )}
        {...props}
      >
        {children}
      </pre>

      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Đã sao chép' : 'Sao chép code'}
        className={cn(
          'border-border bg-background absolute top-2.5 right-2.5 rounded-md border p-1.5',
          'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        {copied ? (
          <Check className="size-4 text-emerald-500" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
