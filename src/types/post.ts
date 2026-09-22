import { z } from 'zod';

/**
 * Schema frontmatter. Đây là hợp đồng duy nhất giữa file MDX và code render.
 *
 * Cố ý KHÔNG có giá trị mặc định cho các field quan trọng (title, description,
 * publishedAt): thiếu là fail build ngay, hơn là deploy ra một bài thiếu
 * meta description rồi mất điểm SEO âm thầm.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const postFrontmatterSchema = z
  .object({
    title: z
      .string()
      .min(1, 'bắt buộc')
      .max(120, 'nên ngắn hơn 120 ký tự để không bị cắt trên Google'),
    description: z
      .string()
      .min(1, 'Mô tả bài viết không được để trống')
      .max(5000, 'Mô tả quá dài (tối đa 5000 ký tự)'),
    publishedAt: z.string().regex(ISO_DATE, 'phải theo định dạng YYYY-MM-DD'),
    updatedAt: z.string().regex(ISO_DATE, 'phải theo định dạng YYYY-MM-DD').optional(),
    category: z
      .string()
      .trim()
      .regex(
        /^[a-z0-9-]+$/,
        'Chuyên mục chỉ gồm chữ thường không dấu, số và dấu gạch nối (vd: lap-trinh, devops)',
      )
      .optional(),
    categories: z
      .array(
        z
          .string()
          .trim()
          .regex(
            /^[a-z0-9-]+$/,
            'Chuyên mục chỉ gồm chữ thường không dấu, số và dấu gạch nối (vd: lap-trinh, devops)',
          ),
      )
      .optional(),
    tags: z.array(z.string().min(1)).min(1, 'cần ít nhất 1 tag').max(6),
    cover: z
      .string()
      .trim()
      .refine(
        (val) =>
          !val ||
          val.startsWith('/') ||
          val.startsWith('http://') ||
          val.startsWith('https://') ||
          val.startsWith('data:image/'),
        'Ảnh cover phải là đường dẫn nội bộ (vd: /images/abc.png) hoặc liên kết URL (vd: https://...)',
      )
      .optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    likes: z.number().int().nonnegative().default(0),
    comments: z.number().int().nonnegative().default(0),
    shares: z.number().int().nonnegative().default(0),
    views: z.number().int().nonnegative().default(0),
  })
  .transform(
    (
      data,
    ): Omit<typeof data, 'category' | 'categories'> & {
      category: string;
      categories: string[];
    } => {
      const categories =
        data.categories && data.categories.length > 0
          ? data.categories
          : data.category
            ? [data.category]
            : ['lap-trinh'];
      const category: string = data.category || categories[0] || 'lap-trinh';
      return {
        ...data,
        category,
        categories,
      };
    },
  );

/**
 * Công thức tính điểm bài viết nổi bật:
 * - Lượt xem (views) = 1 điểm
 * - Lượt thích (likes) = 2 điểm
 * - Bình luận (comments) = 3 điểm
 * - Chia sẻ (shares) = 2 điểm
 */
export function calculateFeaturedScore(post: {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}): number {
  const views = post.views ?? 0;
  const likes = post.likes ?? 0;
  const comments = post.comments ?? 0;
  const shares = post.shares ?? 0;
  return views * 1 + likes * 2 + comments * 3 + shares * 2;
}

export function getPostInteractions(post: {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}): number {
  return calculateFeaturedScore(post);
}

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;

export interface PostMeta extends PostFrontmatter {
  slug: string;
  readingMinutes: number;
  wordCount: number;
  featuredScore: number;
}

export interface Post extends PostMeta {
  content: string;
}

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}
