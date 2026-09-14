import { Container } from '@/components/layout/container';
import { mdxComponents } from '@/components/mdx/mdx-components';
import { Badge } from '@/components/ui/badge';
import { getAllPosts, getPostBySlug } from '@/lib/mdx';
import { mdxOptions } from '@/lib/mdx-options';
import type { Metadata } from 'next';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  return (
    <Container className="py-12">
      <article className="mx-auto max-w-3xl">
        <header className="flex flex-col gap-3">
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            <time dateTime={post.publishedAt}>{post.publishedAt}</time>
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
              <Badge key={tag} variant="outline">
                #{tag}
              </Badge>
            ))}
          </div>
        </header>

        <div className="prose dark:prose-invert prose-headings:scroll-mt-20 mt-10 max-w-none">
          <MDXRemote source={post.content} components={mdxComponents} options={{ mdxOptions }} />
        </div>
      </article>
    </Container>
  );
}
