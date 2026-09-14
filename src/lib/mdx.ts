import { postFrontmatterSchema, type Post, type PostMeta, type TocItem } from '@/types/post';
import GithubSlugger from 'github-slugger';
import matter from 'gray-matter';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import readingTime from 'reading-time';
import { cache } from 'react';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

/** Tên file = slug. `2026-09-toi-uu-nginx.mdx` → `toi-uu-nginx`. */
function fileNameToSlug(fileName: string): string {
  return fileName.replace(/\.mdx$/, '').replace(/^\d{4}-\d{2}-/, '');
}

function parsePost(fileName: string, raw: string): Post {
  const { data, content } = matter(raw);
  const parsed = postFrontmatterSchema.safeParse(data);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    // Ném lỗi => `next build` dừng. Cố ý: thà fail build còn hơn publish
    // một bài thiếu meta description hoặc sai ngày.
    throw new Error(`❌ Frontmatter không hợp lệ trong content/posts/${fileName}:\n${issues}`);
  }

  const stats = readingTime(content);

  return {
    ...parsed.data,
    slug: fileNameToSlug(fileName),
    content,
    readingMinutes: Math.max(1, Math.round(stats.minutes)),
    wordCount: stats.words,
  };
}

/**
 * `cache()` của React dedupe trong cùng một lần render/build — nhiều trang
 * (list, tag, sitemap, rss) gọi chung mà chỉ đọc đĩa một lần.
 */
export const getAllPosts = cache(async (): Promise<Post[]> => {
  const fileNames = (await readdir(POSTS_DIR)).filter((name) => name.endsWith('.mdx'));

  const posts = await Promise.all(
    fileNames.map(async (fileName) => {
      const raw = await readFile(path.join(POSTS_DIR, fileName), 'utf8');
      return parsePost(fileName, raw);
    }),
  );

  const slugs = new Set<string>();
  for (const post of posts) {
    if (slugs.has(post.slug)) {
      throw new Error(`❌ Trùng slug "${post.slug}" — hai file MDX sinh ra cùng một URL.`);
    }
    slugs.add(post.slug);
  }

  return posts
    .filter((post) => !post.draft || process.env.NODE_ENV === 'development')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
});

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
  const posts = await getAllPosts();
  return posts.find((post) => post.slug === slug) ?? null;
});

export async function getPostMetas(): Promise<PostMeta[]> {
  const posts = await getAllPosts();
  return posts.map((post) => {
    const { content, ...meta } = post;
    void content;
    return meta;
  });
}

export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const posts = await getAllPosts();
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Rút TOC từ text MDX thô. Bỏ qua heading nằm trong code fence —
 * `# comment` trong block bash không phải là heading.
 */
export function extractToc(content: string): TocItem[] {
  const items: TocItem[] = [];
  let insideFence = false;

  // Phải dùng đúng github-slugger mà rehype-slug dùng, nếu không id trong TOC
  // sẽ khác id trên thẻ heading (rehype-slug GIỮ dấu tiếng Việt) và link chết.
  // Slugger có state để xử lý heading trùng tên (-1, -2), nên tạo mới mỗi lần gọi.
  const slugger = new GithubSlugger();

  for (const line of content.split('\n')) {
    if (/^\s*```/.test(line)) {
      insideFence = !insideFence;
      continue;
    }
    if (insideFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match?.[1] || !match[2]) continue;

    const text = match[2].replace(/[*_`]/g, '');
    items.push({
      id: slugger.slug(text),
      text,
      depth: match[1].length === 2 ? 2 : 3,
    });
  }

  return items;
}

export const CATEGORY_LABELS: Record<PostMeta['category'], string> = {
  server: 'Quản trị server',
  'lap-trinh': 'Lập trình',
  devops: 'DevOps',
  database: 'Database',
};

export async function getPostsByTag(tag: string): Promise<PostMeta[]> {
  const posts = await getPostMetas();
  return posts.filter((post) => post.tags.some((item) => item.toLowerCase() === tag.toLowerCase()));
}

export async function getPostsByCategory(category: string): Promise<PostMeta[]> {
  const posts = await getPostMetas();
  return posts.filter((post) => post.category === category);
}

export async function getAllCategories(): Promise<
  { category: PostMeta['category']; count: number }[]
> {
  const posts = await getPostMetas();
  const counts = new Map<PostMeta['category'], number>();

  for (const post of posts) {
    counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Bài liên quan: xếp theo số tag trùng, rồi tới cùng chuyên mục, rồi mới tới
 * ngày đăng. Chỉ trả về bài thực sự có điểm chung — thà hiện 1 bài đúng còn
 * hơn 3 bài ngẫu nhiên.
 */
export async function getRelatedPosts(slug: string, limit = 3): Promise<PostMeta[]> {
  const posts = await getPostMetas();
  const current = posts.find((post) => post.slug === slug);
  if (!current) return [];

  const currentTags = new Set(current.tags);

  return posts
    .filter((post) => post.slug !== slug)
    .map((post) => ({
      post,
      score:
        post.tags.filter((tag) => currentTags.has(tag)).length * 2 +
        (post.category === current.category ? 1 : 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.post.publishedAt.localeCompare(a.post.publishedAt))
    .slice(0, limit)
    .map((item) => item.post);
}

/** Index cho search client-side. Cố ý không kèm nội dung bài để file nhẹ. */
export async function getSearchIndex() {
  const posts = await getPostMetas();
  return posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    tags: post.tags,
    category: post.category,
    publishedAt: post.publishedAt,
  }));
}
