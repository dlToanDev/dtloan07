import { PostCard, formatDate } from '@/components/blog/post-card';
import { PostComments } from '@/components/blog/post-comments';
import { JsonLd } from '@/components/json-ld';
import { Container } from '@/components/layout/container';
import { mdxComponents } from '@/components/mdx/mdx-components';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_POST_COVER } from '@/config/blog';
import {
  extractToc,
  getAllPosts,
  getCategoryLabel,
  getPostBySlug,
  getRelatedPosts,
} from '@/lib/mdx';
import { mdxOptions } from '@/lib/mdx-options';
import { blogPostingJsonLd, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Eye,
  Heart,
  List,
  MessageSquare,
  Share2,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { CommunityContent } from '@/components/blog/community-content';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Cho phép bài MDX được tạo từ trang admin có URL ngay mà không cần build lại.
export const dynamicParams = true;

export async function generateStaticParams() {
  const posts = await getAllPosts();
  // Bài cộng đồng render theo yêu cầu (dynamicParams) để bài mới/bị gỡ cập nhật ngay.
  return posts.filter((post) => post.source !== 'community').map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) return {};

  return buildMetadata({
    title: post.title,
    description: post.description,
    pathname: `/blog/${post.slug}`,
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    ogImage: post.cover || DEFAULT_POST_COVER,
    tags: post.tags,
    noIndex: post.draft || post.noIndex,
  });
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const { content, ...meta } = post;
  const toc = extractToc(content);
  const related = await getRelatedPosts(slug);
  const categories =
    post.categories && post.categories.length > 0 ? post.categories : [post.category];

  return (
    <Container className="py-10 sm:py-14">
      <JsonLd data={blogPostingJsonLd(meta)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Trang chủ', pathname: '/' },
          { name: 'Bài viết', pathname: '/blog' },
          { name: post.title, pathname: `/blog/${post.slug}` },
        ])}
      />

      {/* Nút quay lại danh sách bài viết (Căn trái) */}
      <div className="mb-6 flex items-center justify-start">
        <Link
          href="/blog"
          className="border-border/70 bg-card/50 text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-2xs backdrop-blur-xs transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Tất cả bài viết</span>
        </Link>
      </div>

      <article className="mx-auto max-w-4xl">
        {/* Header bài viết: Căn giữa hoàn toàn, cân đối & sang trọng */}
        <header className="flex flex-col items-center text-center">
          {/* Danh sách chuyên mục đa chọn */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <Link key={cat} href={`/categories/${cat}`}>
                <Badge
                  variant="secondary"
                  className="hover:bg-primary hover:text-primary-foreground px-3 py-1 text-xs font-semibold tracking-wider uppercase transition-colors"
                >
                  {getCategoryLabel(cat)}
                </Badge>
              </Link>
            ))}
            {post.featured || (post.featuredScore ?? 0) >= 1500 ? (
              <Badge
                className="gap-1 border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400"
                title={`Bài viết nổi bật (${post.featuredScore ?? 0} điểm: Lượt xem ×1 + Like ×2 + Bình luận ×3 + Chia sẻ ×2)`}
              >
                <Sparkles className="size-3" /> Nổi bật ({post.featuredScore ?? 0} điểm)
              </Badge>
            ) : null}
          </div>

          {/* Tiêu đề bài viết */}
          <h1 className="text-foreground mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-balance sm:text-4xl md:text-5xl md:leading-[1.2]">
            {post.title}
          </h1>

          {/* Mô tả tóm tắt */}
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed text-pretty sm:text-lg">
            {post.description}
          </p>

          {/* Thanh thông số ngày, thời gian đọc, số từ */}
          <div className="text-muted-foreground mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm">
            {post.author && (
              <>
                <span className="text-foreground inline-flex items-center gap-1.5 font-medium">
                  <UserRound className="text-primary/80 size-3.5" />
                  {post.author.name}
                  {post.author.pro && (
                    <Badge className="bg-amber-500 px-1.5 py-0 text-[10px] text-white hover:bg-amber-500">
                      PRO
                    </Badge>
                  )}
                </span>
                <span aria-hidden="true" className="text-border">
                  ·
                </span>
              </>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="text-primary/80 size-3.5" />
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            </span>
            <span aria-hidden="true" className="text-border">
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="text-primary/80 size-3.5" />
              <span>{post.readingMinutes} phút đọc</span>
            </span>
            <span aria-hidden="true" className="text-border">
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="text-primary/80 size-3.5" />
              <span>{post.wordCount} từ</span>
            </span>
          </div>

          {/* Thanh tương tác & Tags: Cân đối giữa */}
          <div className="border-border/60 mt-6 flex w-full max-w-2xl flex-wrap items-center justify-center gap-4 border-y py-3">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {post.tags.map((tag) => (
                <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                  <Badge
                    variant="outline"
                    className="hover:bg-muted px-2 py-0.5 text-xs transition-colors"
                  >
                    #{tag}
                  </Badge>
                </Link>
              ))}
            </div>

            <div className="bg-border/80 hidden h-4 w-px sm:block" />

            <div className="text-muted-foreground flex items-center justify-center gap-4 text-xs font-medium sm:text-sm">
              <span
                className="inline-flex items-center gap-1.5"
                title={`${(post.views ?? 0).toLocaleString('vi-VN')} lượt xem (1 điểm)`}
              >
                <Eye className="text-muted-foreground/80 size-4" />
                <span>{(post.views ?? 0).toLocaleString('vi-VN')}</span>
              </span>
              <span
                className="inline-flex items-center gap-1.5"
                title={`${post.likes ?? 0} lượt thích (2 điểm)`}
              >
                <Heart className="size-4 fill-rose-500/20 text-rose-500" />
                <span>{post.likes ?? 0}</span>
              </span>
              <span
                className="inline-flex items-center gap-1.5"
                title={`${post.comments ?? 0} bình luận (3 điểm)`}
              >
                <MessageSquare className="size-4 text-sky-500" />
                <span>{post.comments ?? 0}</span>
              </span>
              <span
                className="inline-flex items-center gap-1.5"
                title={`${post.shares ?? 0} lượt chia sẻ (2 điểm)`}
              >
                <Share2 className="size-4 text-emerald-500" />
                <span>{post.shares ?? 0}</span>
              </span>
            </div>
          </div>

          {/* Ảnh Cover Banner căn giữa */}
          <figure className="border-border/80 bg-muted relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl border shadow-md">
            <Image
              src={post.cover || DEFAULT_POST_COVER}
              alt={post.cover ? post.title : `Ảnh bìa mặc định cho ${post.title}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
              className="object-cover"
            />
          </figure>
        </header>

        {/* Nội dung bài viết: Căn giữa với bề rộng đọc chuẩn typography */}
        <div className="mx-auto mt-10 max-w-3xl">
          {/* Mục lục bài viết: Box cấu trúc gọn gàng, trang nhã */}
          {toc.length > 1 && (
            <div className="border-border/70 bg-card/60 mb-10 rounded-xl border p-5 shadow-2xs backdrop-blur-xs">
              <div className="border-border/50 text-foreground flex items-center gap-2 border-b pb-2.5 text-sm font-semibold">
                <List className="text-primary size-4" />
                <span>Mục lục nội dung ({toc.length} phần)</span>
              </div>
              <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2 sm:text-sm">
                {toc.map((item) => (
                  <li
                    key={item.id}
                    className={cn(item.depth === 3 && 'text-muted-foreground pl-4')}
                  >
                    <a
                      href={`#${item.id}`}
                      className="text-muted-foreground hover:text-primary line-clamp-1 block transition-colors"
                    >
                      <span className="text-primary/70 mr-1.5">•</span>
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prose content */}
          <div className="prose dark:prose-invert max-w-none text-base leading-relaxed sm:text-lg">
            {post.source === 'community' ? (
              <CommunityContent html={content} />
            ) : (
              <MDXRemote source={content} components={mdxComponents} options={{ mdxOptions }} />
            )}
          </div>

          {/* Phần Bình luận bài viết */}
          <div className="border-border/60 mt-14 border-t pt-10">
            <PostComments postSlug={post.slug} initialCommentCount={post.comments ?? 0} />
          </div>
        </div>
      </article>

      {/* Bài viết liên quan ở cuối trang: Căn giữa, lưới 3 cột cân xứng */}
      {related.length > 0 ? (
        <section
          aria-labelledby="related-heading"
          className="border-border/80 mx-auto mt-20 max-w-5xl border-t pt-12"
        >
          <div className="mb-8 text-center">
            <p className="text-primary text-xs font-semibold tracking-wider uppercase">
              Khám phá tiếp
            </p>
            <h2 id="related-heading" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Bài viết liên quan
            </h2>
          </div>
          <div
            className={cn(
              'mx-auto grid gap-6',
              related.length === 1 && 'max-w-sm',
              related.length === 2 && 'max-w-3xl sm:grid-cols-2',
              related.length >= 3 && 'sm:grid-cols-2 lg:grid-cols-3',
            )}
          >
            {related.map((item) => (
              <PostCard key={item.slug} post={item} headingLevel="h3" variant="grid" />
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
