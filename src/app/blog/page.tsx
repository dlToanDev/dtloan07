import { Container } from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import { getPostMetas } from '@/lib/mdx';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Bài viết',
  description: 'Bài viết về lập trình, quản trị server Linux, Nginx, Docker và PostgreSQL.',
};

export default async function BlogIndexPage() {
  const posts = await getPostMetas();

  return (
    <Container className="py-12">
      <h1 className="text-3xl font-bold tracking-tight">Bài viết</h1>
      <p className="text-muted-foreground mt-2">{posts.length} bài</p>

      <ul className="mt-8 flex flex-col gap-8">
        {posts.map((post) => (
          <li key={post.slug}>
            <article className="flex flex-col gap-2">
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                <time dateTime={post.publishedAt}>{post.publishedAt}</time>
                <span aria-hidden="true">·</span>
                <span>{post.readingMinutes} phút đọc</span>
                {post.featured ? <Badge>Nổi bật</Badge> : null}
              </div>

              <h2 className="text-xl font-semibold tracking-tight">
                <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                  {post.title}
                </Link>
              </h2>

              <p className="text-muted-foreground">{post.description}</p>

              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </article>
          </li>
        ))}
      </ul>
    </Container>
  );
}
