import { PostList } from '@/components/blog/post-list';
import { Container } from '@/components/layout/container';
import { CATEGORY_LABELS, getAllCategories, getPostsByCategory } from '@/lib/mdx';
import { buildMetadata } from '@/lib/seo';
import type { PostMeta } from '@/types/post';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ category: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map(({ category }) => ({ category }));
}

function labelOf(category: string): string | undefined {
  return CATEGORY_LABELS[category as PostMeta['category']];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const label = labelOf(category) ?? category;

  return buildMetadata({
    title: label,
    description: `Tất cả bài viết thuộc chuyên mục ${label}.`,
    pathname: `/categories/${category}`,
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const label = labelOf(category);

  if (!label) notFound();

  const posts = await getPostsByCategory(category);
  if (posts.length === 0) notFound();

  return (
    <Container className="py-12">
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">Chuyên mục</p>
        <h1 className="text-3xl font-bold tracking-tight">{label}</h1>
        <p className="text-muted-foreground">{posts.length} bài viết</p>
      </header>

      <PostList posts={posts} />
    </Container>
  );
}
