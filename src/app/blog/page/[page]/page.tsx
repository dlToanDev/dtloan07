import { PostList, paginate } from '@/components/blog/post-list';
import { Container } from '@/components/layout/container';
import { POSTS_PER_PAGE } from '@/config/blog';
import { getPostMetas } from '@/lib/mdx';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ page: string }>;
}

export async function generateStaticParams() {
  const posts = await getPostMetas();
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);

  // Bắt đầu từ 2: trang 1 đã là /blog.
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({
    page: String(index + 2),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { page } = await params;

  return buildMetadata({
    title: `Bài viết — trang ${page}`,
    description: 'Bài viết về lập trình, quản trị server Linux, Nginx, Docker và PostgreSQL.',
    pathname: `/blog/page/${page}`,
  });
}

export default async function BlogPagedPage({ params }: PageProps) {
  const { page } = await params;
  const pageNumber = Number(page);

  if (!Number.isInteger(pageNumber) || pageNumber < 2) notFound();

  const posts = await getPostMetas();
  const { items, current, totalPages } = paginate(posts, pageNumber);

  if (current !== pageNumber) notFound();

  return (
    <Container className="py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Bài viết</h1>
        <p className="text-muted-foreground">
          Trang {current} / {totalPages}
        </p>
      </header>

      <PostList posts={items} page={current} totalPages={totalPages} />
    </Container>
  );
}
