import { db } from '@/lib/db';
import { isPro } from '@/lib/membership';
import { communityExcerpt, countWords, sanitizeCommunityHtml } from '@/lib/community/sanitize';
import type { Post, PostMeta } from '@/types/post';
import { unstable_cache } from 'next/cache';

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Chỉ lấy thông tin metadata của bài viết cộng đồng (tiêu đề, slug, tác giả, ảnh bìa...)
 * KHÔNG đọc nội dung HTML nặng, KHÔNG chạy sanitizeHTML -> Tăng tốc hiển thị danh sách bài viết gấp nhiều lần.
 */
const loadCommunityPostMetasCached = unstable_cache(
  async (): Promise<PostMeta[]> => {
    const rows = await db.communityPost.findMany({
      where: { status: 'PUBLISHED', author: { lockedAt: null } },
      select: {
        title: true,
        slug: true,
        category: true,
        tags: true,
        coverUrl: true,
        createdAt: true,
        updatedAt: true,
        indexable: true,
        authorId: true,
        author: { select: { name: true, email: true, proUntil: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return rows.map((row) => ({
      title: row.title,
      description: row.title,
      publishedAt: isoDate(row.createdAt),
      updatedAt: row.updatedAt > row.createdAt ? isoDate(row.updatedAt) : undefined,
      category: row.category,
      categories: [row.category],
      tags: row.tags.length > 0 ? row.tags : ['cong-dong'],
      cover: row.coverUrl ?? undefined,
      draft: false,
      featured: false,
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      slug: row.slug,
      readingMinutes: 3,
      wordCount: 500,
      featuredScore: 0,
      source: 'community' as const,
      author: {
        name: row.author.name || row.author.email.split('@')[0] || 'Thành viên',
        pro: isPro(row.author),
        id: row.authorId,
        email: row.author.email,
      },
      noIndex: !row.indexable,
    }));
  },
  ['community-post-metas-list'],
  { revalidate: 60, tags: ['community-posts'] },
);

export async function loadCommunityPostMetas(): Promise<PostMeta[]> {
  return loadCommunityPostMetasCached();
}

/**
 * Bài cộng đồng đang hiển thị, ở cùng dạng `Post` với bài MDX để danh sách, tag, chuyên mục,
 * bài liên quan… dùng chung. `content` là HTML đã lọc — trang bài viết phải render bằng
 * `CommunityContent`, không đưa vào MDX.
 */
const loadCommunityPostsCached = unstable_cache(
  async (): Promise<Post[]> => {
    const rows = await db.communityPost.findMany({
      where: { status: 'PUBLISHED', author: { lockedAt: null } },
      include: { author: { select: { name: true, email: true, proUntil: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return rows.map((row) => {
      const words = countWords(row.contentHtml);
      return {
        title: row.title,
        description: communityExcerpt(row.contentHtml) || row.title,
        publishedAt: isoDate(row.createdAt),
        updatedAt: row.updatedAt > row.createdAt ? isoDate(row.updatedAt) : undefined,
        category: row.category,
        categories: [row.category],
        tags: row.tags.length > 0 ? row.tags : ['cong-dong'],
        cover: row.coverUrl ?? undefined,
        draft: false,
        featured: false,
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        slug: row.slug,
        content: sanitizeCommunityHtml(row.contentHtml),
        readingMinutes: Math.max(1, Math.round(words / 200)),
        wordCount: words,
        featuredScore: 0,
        source: 'community' as const,
        author: {
          name: row.author.name || row.author.email.split('@')[0] || 'Thành viên',
          pro: isPro(row.author),
          id: row.authorId,
          email: row.author.email,
        },
        noIndex: !row.indexable,
      };
    });
  },
  ['community-posts-list'],
  { revalidate: 60, tags: ['community-posts'] },
);

export async function loadCommunityPosts(): Promise<Post[]> {
  return loadCommunityPostsCached();
}
