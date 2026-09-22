import { getCategoryLabel } from '@/config/blog';
import type { PostMeta } from '@/types/post';
import { Clock, Heart, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export function SidebarRelated({ posts }: { posts: PostMeta[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-sm font-bold tracking-tight uppercase">
          Bài liên quan
        </h3>
        <span className="text-muted-foreground text-[11px] font-medium">
          {posts.length} bài gợi ý
        </span>
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="group hover:bg-muted/50 hover:border-border/60 flex items-start gap-3 rounded-lg border border-transparent p-2 transition-all"
          >
            {post.cover ? (
              <Link
                href={`/blog/${post.slug}`}
                className="bg-muted border-border/50 relative block aspect-[16/9] w-20 shrink-0 overflow-hidden rounded-md border"
              >
                <Image
                  src={post.cover}
                  alt={post.title}
                  fill
                  sizes="80px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </Link>
            ) : null}

            <div className="min-w-0 flex-1 space-y-1">
              <Link
                href={`/categories/${post.category}`}
                className="text-primary/90 block truncate text-[10px] font-semibold tracking-wider uppercase hover:underline"
              >
                {getCategoryLabel(post.category)}
              </Link>

              <h4 className="text-foreground line-clamp-2 text-xs leading-snug font-semibold">
                <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                  {post.title}
                </Link>
              </h4>

              <div className="text-muted-foreground flex items-center gap-2 pt-0.5 text-[10px]">
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="size-2.5" />
                  {post.readingMinutes}p
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5 text-rose-500/90">
                  <Heart className="size-2.5 fill-rose-500/20" />
                  {post.likes ?? 0}
                </span>
                <span className="inline-flex items-center gap-0.5 text-sky-500/90">
                  <MessageSquare className="size-2.5" />
                  {post.comments ?? 0}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
