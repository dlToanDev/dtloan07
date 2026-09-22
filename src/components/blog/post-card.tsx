import { Badge } from '@/components/ui/badge';
import { getCategoryLabel } from '@/config/blog';
import { cn } from '@/lib/utils';
import type { PostMeta } from '@/types/post';
import { Eye, Heart, MessageSquare, Share2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export function PostCard({
  post,
  headingLevel = 'h2',
  variant = 'list',
}: {
  post: PostMeta;
  headingLevel?: 'h2' | 'h3';
  variant?: 'list' | 'grid';
}) {
  const Heading = headingLevel;
  const isGrid = variant === 'grid';

  return (
    <article
      className={cn(
        'group flex transition-all duration-200',
        isGrid
          ? 'border-border bg-card hover:border-primary/40 h-full flex-col rounded-xl border p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md sm:p-5'
          : 'border-border flex-col gap-5 border-b pb-8 last:border-b-0 sm:flex-row sm:items-start sm:gap-6',
      )}
    >
      {/* Ảnh Banner / Cover */}
      {post.cover ? (
        <Link
          href={`/blog/${post.slug}`}
          className={cn(
            'bg-muted border-border/60 group/cover relative block shrink-0 overflow-hidden border',
            isGrid
              ? 'mb-3.5 aspect-[16/9] w-full rounded-lg'
              : 'aspect-[16/9] w-full rounded-xl sm:w-64 md:w-72',
          )}
        >
          <Image
            src={post.cover}
            alt={post.title}
            fill
            sizes={
              isGrid
                ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
                : '(max-width: 640px) 100vw, 300px'
            }
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {(post.featured || (post.featuredScore ?? 0) >= 1500) && (
            <span
              className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 rounded-md bg-amber-500/95 px-2 py-0.5 text-xs font-semibold text-white shadow-xs backdrop-blur-xs"
              title={`Điểm nổi bật: ${post.featuredScore ?? 0} (Lượt xem ×1 + Like ×2 + Bình luận ×3 + Chia sẻ ×2)`}
            >
              <Sparkles className="size-3" /> Nổi bật
            </span>
          )}
        </Link>
      ) : null}

      {/* Nội dung bài viết */}
      <div className={cn('flex min-w-0 flex-1 flex-col gap-2', isGrid ? 'h-full' : '')}>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readingMinutes} phút đọc</span>
          <span aria-hidden="true" className={cn(isGrid && 'hidden')}>
            ·
          </span>
          <Link
            href={`/categories/${post.category}`}
            className={cn(
              'hover:text-foreground transition-colors',
              isGrid && 'basis-full text-xs font-medium tracking-wide uppercase',
            )}
          >
            {getCategoryLabel(post.category)}
          </Link>
          {!post.cover && (post.featured || (post.featuredScore ?? 0) >= 1500) ? (
            <Badge>Nổi bật</Badge>
          ) : null}
        </div>

        <Heading
          className={cn(
            'font-semibold tracking-tight text-balance',
            isGrid ? 'mt-0.5 text-lg leading-snug' : 'text-xl',
          )}
        >
          {/* Link phủ cả tiêu đề, không phủ cả card — để còn bấm được tag bên dưới. */}
          <Link
            href={`/blog/${post.slug}`}
            className="group-hover:text-primary hover:text-primary transition-colors"
          >
            {post.title}
          </Link>
        </Heading>

        <p
          className={cn(
            'text-muted-foreground text-pretty',
            isGrid
              ? 'line-clamp-2 text-sm leading-relaxed'
              : 'line-clamp-3 text-sm leading-relaxed',
          )}
        >
          {post.description}
        </p>

        {/* Tags */}
        <div className={cn('flex flex-wrap gap-1.5', isGrid ? 'mt-auto pt-2.5' : 'mt-1')}>
          {post.tags.map((tag) => (
            <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
              <Badge variant="outline" className="hover:bg-muted py-0.5 text-xs transition-colors">
                #{tag}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Lượt tương tác: Xem, Like, Comment, Share */}
        <div
          className={cn(
            'text-muted-foreground flex items-center gap-3.5 text-xs',
            isGrid ? 'border-border/60 mt-2 border-t pt-3' : 'mt-1 pt-2',
          )}
        >
          <span
            className="hover:text-foreground inline-flex items-center gap-1.5 font-medium transition-colors"
            title={`${(post.views ?? 0).toLocaleString('vi-VN')} lượt xem (1 điểm)`}
          >
            <Eye className="text-muted-foreground/80 size-3.5" />
            <span>{(post.views ?? 0).toLocaleString('vi-VN')}</span>
          </span>
          <span
            className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-rose-500"
            title={`${post.likes ?? 0} lượt thích (2 điểm)`}
          >
            <Heart className="size-3.5 fill-rose-500/20 text-rose-500/90" />
            <span>{post.likes ?? 0}</span>
          </span>
          <span
            className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-sky-500"
            title={`${post.comments ?? 0} bình luận (3 điểm)`}
          >
            <MessageSquare className="size-3.5 text-sky-500" />
            <span>{post.comments ?? 0}</span>
          </span>
          <span
            className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-emerald-500"
            title={`${post.shares ?? 0} lượt chia sẻ (2 điểm)`}
          >
            <Share2 className="size-3.5 text-emerald-500" />
            <span>{post.shares ?? 0}</span>
          </span>
        </div>
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
