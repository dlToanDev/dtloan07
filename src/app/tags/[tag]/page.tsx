import { PostList } from '@/components/blog/post-list';
import { Container } from '@/components/layout/container';
import { getAllTags, getPostsByTag } from '@/lib/mdx';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ tag: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map(({ tag }) => ({ tag: encodeURIComponent(tag) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);

  return buildMetadata({
    title: `Bài viết về ${decoded}`,
    description: `Tổng hợp bài viết được gắn thẻ "${decoded}" — lập trình, quản trị server và DevOps.`,
    pathname: `/tags/${tag}`,
  });
}

export default async function TagPage({ params }: PageProps) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const posts = await getPostsByTag(decoded);

  if (posts.length === 0) notFound();

  return (
    <Container className="py-12">
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">Thẻ</p>
        <h1 className="text-3xl font-bold tracking-tight">#{decoded}</h1>
        <p className="text-muted-foreground">{posts.length} bài viết</p>
      </header>

      <PostList posts={posts} />
    </Container>
  );
}
