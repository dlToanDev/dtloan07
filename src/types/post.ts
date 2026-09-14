import { z } from 'zod';

/**
 * Schema frontmatter. Đây là hợp đồng duy nhất giữa file MDX và code render.
 *
 * Cố ý KHÔNG có giá trị mặc định cho các field quan trọng (title, description,
 * publishedAt): thiếu là fail build ngay, hơn là deploy ra một bài thiếu
 * meta description rồi mất điểm SEO âm thầm.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const postFrontmatterSchema = z.object({
  title: z
    .string()
    .min(1, 'bắt buộc')
    .max(120, 'nên ngắn hơn 120 ký tự để không bị cắt trên Google'),
  description: z
    .string()
    .min(50, 'quá ngắn — meta description nên 50–160 ký tự')
    .max(160, 'quá dài — Google sẽ cắt bớt'),
  publishedAt: z.string().regex(ISO_DATE, 'phải theo định dạng YYYY-MM-DD'),
  updatedAt: z.string().regex(ISO_DATE, 'phải theo định dạng YYYY-MM-DD').optional(),
  category: z.enum(['server', 'lap-trinh', 'devops', 'database']),
  tags: z.array(z.string().min(1)).min(1, 'cần ít nhất 1 tag').max(6),
  cover: z.string().startsWith('/', 'phải là đường dẫn tuyệt đối, vd /images/abc.png').optional(),
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
});

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;

export interface PostMeta extends PostFrontmatter {
  slug: string;
  readingMinutes: number;
  wordCount: number;
}

export interface Post extends PostMeta {
  content: string;
}

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}
