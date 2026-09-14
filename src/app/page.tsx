import { PostCard } from '@/components/blog/post-card';
import { JsonLd } from '@/components/json-ld';
import { Container } from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { siteConfig } from '@/config/site';
import { CATEGORY_LABELS, getAllCategories, getPostMetas } from '@/lib/mdx';
import { buildMetadata, personJsonLd } from '@/lib/seo';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = buildMetadata({
  title: siteConfig.name,
  description: siteConfig.description,
  pathname: '/',
});

export default async function HomePage() {
  const [posts, categories] = await Promise.all([getPostMetas(), getAllCategories()]);
  const featured = posts.filter((post) => post.featured).slice(0, 2);
  const latest = posts.slice(0, 4);

  return (
    <Container className="py-16 sm:py-20">
      <JsonLd data={personJsonLd()} />

      <section className="flex max-w-2xl flex-col items-start gap-5">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {siteConfig.name}
        </h1>
        <p className="text-muted-foreground text-lg text-pretty">{siteConfig.description}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/blog" className={buttonStyles({ size: 'lg' })}>
            Đọc bài viết
          </Link>
          <Link href="/products" className={buttonStyles({ variant: 'outline', size: 'lg' })}>
            Xem sản phẩm
          </Link>
        </div>
      </section>

      {categories.length > 0 ? (
        <section aria-labelledby="categories-heading" className="mt-14">
          <h2 id="categories-heading" className="sr-only">
            Chuyên mục
          </h2>
          <ul className="flex flex-wrap gap-2">
            {categories.map(({ category, count }) => (
              <li key={category}>
                <Link href={`/categories/${category}`}>
                  <Badge variant="outline" className="hover:bg-muted transition-colors">
                    {CATEGORY_LABELS[category]} ({count})
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section aria-labelledby="featured-heading" className="mt-14">
          <h2 id="featured-heading" className="text-2xl font-bold tracking-tight">
            Bài nổi bật
          </h2>
          <div className="mt-6 flex flex-col gap-8">
            {featured.map((post) => (
              <PostCard key={post.slug} post={post} headingLevel="h3" />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="latest-heading" className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="latest-heading" className="text-2xl font-bold tracking-tight">
            Bài mới nhất
          </h2>
          <Link href="/blog" className="text-primary text-sm font-medium hover:underline">
            Xem tất cả
          </Link>
        </div>
        <div className="mt-6 flex flex-col gap-8">
          {latest.map((post) => (
            <PostCard key={post.slug} post={post} headingLevel="h3" />
          ))}
        </div>
      </section>
    </Container>
  );
}
