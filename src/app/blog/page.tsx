import { PostList } from '@/components/blog/post-list';
import { Container } from '@/components/layout/container';
import { getPostMetas } from '@/lib/mdx';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

const TITLE = 'Bài viết';
const DESCRIPTION =
  'Bài viết chuyên sâu về lập trình, quản trị server Linux, Nginx, Docker và PostgreSQL — kèm ví dụ chạy được.';

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  pathname: '/blog',
});

export default async function BlogIndexPage() {
  const posts = await getPostMetas();

  return (
    <Container className="py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{TITLE}</h1>
        <p className="text-muted-foreground">{posts.length} bài viết</p>
      </header>

      <PostList posts={posts} />
    </Container>
  );
}
