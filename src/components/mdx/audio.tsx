import { Headphones } from 'lucide-react';

interface AudioProps {
  src: string;
  title?: string;
  description?: string;
}

/**
 * Trình phát Audio / Podcast responsive dùng trực tiếp trong MDX mà không cần import.
 * Hỗ trợ đường dẫn nội bộ (/audio/...) hoặc URL ngoài (https://...).
 * Nếu không cung cấp src hoặc src rỗng, component sẽ tự ẩn đi mà không gây lỗi giao diện.
 */
export function Audio({ src, title = 'Bản ghi âm / Podcast bài viết', description }: AudioProps) {
  const source = src?.trim();
  if (!source || (!source.startsWith('/') && !/^https?:\/\//i.test(source))) {
    return null;
  }

  return (
    <figure className="not-prose border-border/80 bg-card/60 my-6 rounded-xl border p-4 shadow-2xs backdrop-blur-xs">
      <div className="mb-3 flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Headphones className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-semibold">{title}</p>
          {description && <p className="text-muted-foreground truncate text-xs">{description}</p>}
        </div>
      </div>
      <audio controls preload="metadata" className="accent-primary h-10 w-full">
        <source src={source} />
        Trình duyệt của bạn không hỗ trợ phát âm thanh.
      </audio>
    </figure>
  );
}
