import { db } from '@/lib/db';
import { isPro } from '@/lib/membership';
import { communityExcerpt, countWords, sanitizeCommunityHtml } from '@/lib/community/sanitize';
import type { Post } from '@/types/post';

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Bài cộng đồng đang hiển thị, ở cùng dạng `Post` với bài MDX để danh sách, tag, chuyên mục,
 * bài liên quan… dùng chung. `content` là HTML đã lọc — trang bài viết phải render bằng
 * `CommunityContent`, không đưa vào MDX.
 */
export async function loadCommunityPosts(): Promise<Post[]> {
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
      },
      noIndex: !row.indexable,
    };
  });
}
