/**
 * JSON-LD phải là script thật trong DOM để Google đọc được.
 * Dữ liệu do chính code sinh ra (không phải input người dùng) nên
 * dangerouslySetInnerHTML ở đây là an toàn.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
