import { PostCard, formatDate } from '@/components/blog/post-card';
import { TableOfContents } from '@/components/blog/table-of-contents';
import { JsonLd } from '@/components/json-ld';
import { Container } from '@/components/layout/container';
import { mdxComponents } from '@/components/mdx/mdx-components';
import { Badge } from '@/components/ui/badge';
import {
  CATEGORY_LABELS,
  extractToc,
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
} from '@/lib/mdx';
import { mdxOptions } from '@/lib/mdx-options';
import { blogPostingJsonLd, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
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
    tags: post.tags,
    noIndex: post.draft,
  });
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const { content, ...meta } = post;
  const toc = extractToc(content);
  const related = await getRelatedPosts(slug);

  return (
    <Container className="py-12">
      <JsonLd data={blogPostingJsonLd(meta)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Trang chủ', pathname: '/' },
          { name: 'Bài viết', pathname: '/blog' },
          { name: post.title, pathname: `/blog/${post.slug}` },
        ])}
      />

      <div className="gap-12 lg:grid lg:grid-cols-[minmax(0,1fr)_16rem]">
        <article className="min-w-0">
          <header className="flex flex-col gap-3">
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              <Link href={`/categories/${post.category}`} className="hover:text-foreground">
                {CATEGORY_LABELS[post.category]}
              </Link>
              <span aria-hidden="true">·</span>
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              <span aria-hidden="true">·</span>
              <span>{post.readingMinutes} phút đọc</span>
              <span aria-hidden="true">·</span>
              <span>{post.wordCount} từ</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {post.title}
            </h1>

            <p className="text-muted-foreground text-lg text-pretty">{post.description}</p>

            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                  <Badge variant="outline" className="hover:bg-muted transition-colors">
                    #{tag}
                  </Badge>
                </Link>
              ))}
            </div>
          </header>

          <div className="prose dark:prose-invert mt-10 max-w-none">
            <MDXRemote source={content} components={mdxComponents} options={{ mdxOptions }} />
          </div>
        </article>

        <aside className="hidden lg:block">
          <TableOfContents items={toc} />
        </aside>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="border-border mt-16 border-t pt-10">
          <h2 id="related-heading" className="text-2xl font-bold tracking-tight">
            Bài liên quan
          </h2>
          <div className="mt-6 flex flex-col gap-8">
            {related.map((item) => (
              <PostCard key={item.slug} post={item} headingLevel="h3" />
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
