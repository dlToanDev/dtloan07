import { sanitizeCommunityHtml } from '@/lib/community/sanitize';

/**
 * Nội dung bài cộng đồng: HTML lọc lại theo danh sách cho phép ngay lúc hiển thị.
 * Không bao giờ đưa nội dung này vào MDX (MDX chạy được JavaScript).
 */
export function CommunityContent({ html }: { html: string }) {
  return (
    <div
      className="[&_img]:h-auto [&_img]:max-w-full [&_pre]:overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: sanitizeCommunityHtml(html) }}
    />
  );
}
