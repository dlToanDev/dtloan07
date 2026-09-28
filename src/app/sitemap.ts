import { getAllCategories, getAllTags, getPostMetas } from '@/lib/mdx';
import { POSTS_PER_PAGE } from '@/config/blog';
import { absoluteUrl } from '@/lib/seo';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, tags, categories] = await Promise.all([
    getPostMetas(),
    getAllTags(),
    getAllCategories(),
  ]);

  const latest = posts[0]?.publishedAt ?? new Date().toISOString().slice(0, 10);
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);

  return [
    { url: absoluteUrl('/'), lastModified: latest, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/blog'), lastModified: latest, changeFrequency: 'weekly', priority: 0.9 },
    {
      url: absoluteUrl('/courses'),
      lastModified: latest,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/shop'),
      lastModified: latest,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/pro'),
      lastModified: latest,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: absoluteUrl('/affiliate'),
      lastModified: latest,
      changeFrequency: 'weekly',
      priority: 0.8,
    },

    // Trang 2 trở đi — trang 1 chính là /blog nên không liệt kê lại.
    ...Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({
      url: absoluteUrl(`/blog/page/${index + 2}`),
      lastModified: latest,
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    })),

    ...posts
      .filter((post) => !post.noIndex)
      .map((post) => ({
        url: absoluteUrl(`/blog/${post.slug}`),
        lastModified: post.updatedAt ?? post.publishedAt,
        changeFrequency: 'monthly' as const,
        priority: post.featured ? 0.8 : 0.7,
      })),

    ...categories.map(({ category }) => ({
      url: absoluteUrl(`/categories/${category}`),
      lastModified: latest,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),

    ...tags.map(({ tag }) => ({
      url: absoluteUrl(`/tags/${encodeURIComponent(tag)}`),
      lastModified: latest,
      changeFrequency: 'weekly' as const,
      priority: 0.3,
    })),
  ];
}
