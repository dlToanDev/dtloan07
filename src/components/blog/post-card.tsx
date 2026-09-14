import { Badge } from '@/components/ui/badge';
import { CATEGORY_LABELS } from '@/lib/mdx';
import type { PostMeta } from '@/types/post';
import Link from 'next/link';

export function PostCard({
  post,
  headingLevel = 'h2',
}: {
  post: PostMeta;
  headingLevel?: 'h2' | 'h3';
}) {
  const Heading = headingLevel;

  return (
    <article className="border-border flex flex-col gap-2 border-b pb-8 last:border-b-0">
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        <span aria-hidden="true">·</span>
        <span>{post.readingMinutes} phút đọc</span>
        <span aria-hidden="true">·</span>
        <Link
          href={`/categories/${post.category}`}
          className="hover:text-foreground transition-colors"
        >
          {CATEGORY_LABELS[post.category]}
        </Link>
        {post.featured ? <Badge>Nổi bật</Badge> : null}
      </div>

      <Heading className="text-xl font-semibold tracking-tight text-balance">
        {/* Link phủ cả tiêu đề, không phủ cả card — để còn bấm được tag bên dưới. */}
        <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
          {post.title}
        </Link>
      </Heading>

      <p className="text-muted-foreground text-pretty">{post.description}</p>

      <div className="mt-1 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
            <Badge variant="outline" className="hover:bg-muted transition-colors">
              #{tag}
            </Badge>
          </Link>
        ))}
      </div>
    </article>
  );
}

export function formatDate(isoDate: string): string {
  // Cố định vi-VN + UTC để server và client render ra cùng một chuỗi,
  // nếu không sẽ lệch hydration khi máy khách ở múi giờ khác.
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
