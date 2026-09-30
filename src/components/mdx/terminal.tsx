import type { ReactNode } from 'react';

/**
 * Khung giả lập terminal cho các đoạn lệnh chạy trên server.
 * Dùng khi muốn nhấn mạnh "đây là lệnh gõ trên VPS", khác với code block thường.
 */
export function Terminal({ title = 'bash', children }: { title?: string; children: ReactNode }) {
  return (
    <div className="border-border my-6 overflow-hidden rounded-lg border">
      <div className="border-border bg-muted flex items-center gap-2 border-b px-4 py-2">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
        </span>
        <span className="text-muted-foreground font-mono text-xs">{title}</span>
      </div>
      {/* CodeBlock bọc <pre> trong một div có my-6 — phải khử cả div lẫn pre. */}
      <div className="[&_pre]:rounded-none [&_pre]:border-0 [&>div]:my-0">{children}</div>
    </div>
  );
}
