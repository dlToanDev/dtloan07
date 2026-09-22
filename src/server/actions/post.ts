'use server';

import { auth } from '@/lib/auth';
import {
  parseDocxImport,
  parseMarkdownImport,
  slugifyPostTitle,
  type ImportedPostDraft,
} from '@/lib/post-import';
import { postFrontmatterSchema } from '@/types/post';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { revalidatePath } from 'next/cache';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

export type PostActionResult =
  { success: true; slug: string; fileName: string } | { success: false; error: string };

export type PostImportResult =
  { success: true; post: ImportedPostDraft } | { success: false; error: string };

async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
  }
}

function getString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function yamlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function serializePostFile(input: {
  title: string;
  description: string;
  publishedAt: string;
  category: string;
  categories?: string[];
  tags: string[];
  cover?: string;
  draft: boolean;
  featured: boolean;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  content: string;
}): string {
  const cats =
    input.categories && input.categories.length > 0 ? input.categories : [input.category];
  const lines = [
    '---',
    `title: ${yamlQuote(input.title)}`,
    `description: ${yamlQuote(input.description)}`,
    `publishedAt: ${yamlQuote(input.publishedAt)}`,
    `category: ${yamlQuote(input.category)}`,
    `categories: [${cats.map(yamlQuote).join(', ')}]`,
    `tags: [${input.tags.map(yamlQuote).join(', ')}]`,
  ];

  if (input.cover) lines.push(`cover: ${yamlQuote(input.cover)}`);
  lines.push(`draft: ${input.draft}`, `featured: ${input.featured}`);
  if (typeof input.views === 'number') lines.push(`views: ${input.views}`);
  if (typeof input.likes === 'number') lines.push(`likes: ${input.likes}`);
  if (typeof input.comments === 'number') lines.push(`comments: ${input.comments}`);
  if (typeof input.shares === 'number') lines.push(`shares: ${input.shares}`);
  lines.push('---', '', input.content, '');
  return lines.join('\n');
}

export async function createPost(formData: FormData): Promise<PostActionResult> {
  await requireAdmin();

  const title = getString(formData, 'title');
  const slug = slugifyPostTitle(getString(formData, 'slug') || title);
  const description = getString(formData, 'description');
  const publishedAt = getString(formData, 'publishedAt');
  const categoriesRaw = getString(formData, 'categories');
  const categorySingle = getString(formData, 'category');
  const categories = categoriesRaw
    ? categoriesRaw
        .split(',')
        .map((c) =>
          c
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, ''),
        )
        .filter(Boolean)
    : categorySingle
      ? [
          categorySingle
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, ''),
        ]
      : [];
  const category = categories[0] || categorySingle || 'lap-trinh';

  const tags = getString(formData, 'tags')
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  const cover = getString(formData, 'cover');
  const content = getString(formData, 'content');
  const draft = formData.get('draft') === 'true';
  const featured = formData.get('featured') === 'true';

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { success: false, error: 'Slug không hợp lệ.' };
  }
  if (content.length < 20) {
    return { success: false, error: 'Nội dung bài viết cần ít nhất 20 ký tự.' };
  }

  const parsed = postFrontmatterSchema.safeParse({
    title,
    description,
    publishedAt,
    category,
    categories: categories.length > 0 ? categories : [category],
    tags,
    cover: cover || undefined,
    draft,
    featured,
  });

  if (!parsed.success) {
    const error = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'Dữ liệu'}: ${issue.message}`)
      .join(' · ');
    return { success: false, error };
  }

  const fileName = `${parsed.data.publishedAt.slice(0, 7)}-${slug}.mdx`;
  const filePath = path.join(POSTS_DIR, fileName);
  const raw = serializePostFile({ ...parsed.data, cover, content });

  try {
    await mkdir(POSTS_DIR, { recursive: true });
    await writeFile(filePath, raw, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      return { success: false, error: `Đã tồn tại bài viết có file ${fileName}.` };
    }
    console.error('Không thể tạo file bài viết:', error);
    return {
      success: false,
      error: 'Không thể ghi file bài viết. Hãy kiểm tra quyền ghi thư mục content/posts.',
    };
  }

  revalidatePath('/admin/posts');
  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);
  revalidatePath('/');
  revalidatePath('/sitemap.xml');
  revalidatePath('/rss.xml');

  return { success: true, slug, fileName };
}

export async function importPostFile(formData: FormData): Promise<PostImportResult> {
  await requireAdmin();

  const uploaded = formData.get('file');
  if (!(uploaded instanceof File) || uploaded.size === 0) {
    return { success: false, error: 'Vui lòng chọn một file để tải lên.' };
  }
  if (uploaded.size > MAX_UPLOAD_BYTES) {
    return { success: false, error: 'File vượt quá giới hạn 5 MB.' };
  }

  const extension = path.extname(uploaded.name).toLowerCase();
  try {
    if (['.md', '.markdown', '.mdx'].includes(extension)) {
      return { success: true, post: parseMarkdownImport(await uploaded.text(), uploaded.name) };
    }
    if (extension === '.docx') {
      const buffer = Buffer.from(await uploaded.arrayBuffer());
      return { success: true, post: parseDocxImport(buffer, uploaded.name) };
    }

    return {
      success: false,
      error: 'Định dạng chưa được hỗ trợ. Hãy dùng .md, .markdown, .mdx hoặc .docx.',
    };
  } catch (error) {
    console.error('Không thể đọc file bài viết:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể đọc nội dung file đã tải lên.',
    };
  }
}

const COVER_DIR = path.join(process.cwd(), 'public', 'images', 'posts');
const ALLOWED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif']);

export interface CoverUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

async function savePostImage(
  formData: FormData,
  fallbackName: 'cover' | 'image',
): Promise<CoverUploadResult> {
  await requireAdmin();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'Vui lòng chọn một tệp ảnh để tải lên.' };
  }

  // Giới hạn từng ảnh tối đa 8 MB. Server Action chừa thêm overhead multipart.
  if (file.size > 8 * 1024 * 1024) {
    return { success: false, error: 'Ảnh vượt quá dung lượng tối đa (8 MB).' };
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_IMAGE_EXTS.has(ext)) {
    return {
      success: false,
      error: 'Chỉ chấp nhận các định dạng ảnh: PNG, JPG, JPEG, WebP, SVG, GIF, AVIF.',
    };
  }

  const rawBaseName = path.basename(file.name, ext);
  const cleanName = slugifyPostTitle(rawBaseName) || fallbackName;
  const fileName = `${cleanName}-${randomUUID().slice(0, 8)}${ext}`;
  const targetPath = path.join(COVER_DIR, fileName);

  try {
    await mkdir(COVER_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(targetPath, buffer);
    return { success: true, url: `/images/posts/${fileName}` };
  } catch (err) {
    console.error('Lỗi lưu ảnh cover:', err);
    return {
      success: false,
      error:
        'Không thể lưu tệp ảnh lên máy chủ. Vui lòng kiểm tra quyền thư mục public/images/posts.',
    };
  }
}

export async function uploadCoverImage(formData: FormData): Promise<CoverUploadResult> {
  return savePostImage(formData, 'cover');
}

/** Upload ảnh dùng bên trong nội dung và trả URL để chèn vào Markdown. */
export async function uploadPostImage(formData: FormData): Promise<CoverUploadResult> {
  return savePostImage(formData, 'image');
}

/**
 * Đảo trạng thái Xuất bản <-> Bản nháp cho bài viết
 */
export async function togglePostPublish(
  slug: string,
): Promise<{ success: boolean; isDraft?: boolean; error?: string }> {
  await requireAdmin();

  try {
    const fileNames = (await readdir(POSTS_DIR)).filter((name) => name.endsWith('.mdx'));
    const targetFileName = fileNames.find((name) => {
      const s = name.replace(/\.mdx$/, '').replace(/^\d{4}-\d{2}-/, '');
      return s === slug;
    });

    if (!targetFileName) {
      return { success: false, error: 'Không tìm thấy file bài viết.' };
    }

    const filePath = path.join(POSTS_DIR, targetFileName);
    const raw = await readFile(filePath, 'utf8');

    let newDraft = false;
    let updatedRaw = raw;

    if (/^draft:\s*true/m.test(raw)) {
      updatedRaw = raw.replace(/^draft:\s*true/m, 'draft: false');
      newDraft = false;
    } else if (/^draft:\s*false/m.test(raw)) {
      updatedRaw = raw.replace(/^draft:\s*false/m, 'draft: true');
      newDraft = true;
    } else {
      updatedRaw = raw.replace(/^---/, '---\ndraft: false');
      newDraft = false;
    }

    await writeFile(filePath, updatedRaw, 'utf8');

    revalidatePath('/admin/posts');
    revalidatePath('/blog');
    revalidatePath(`/blog/${slug}`);
    revalidatePath('/');
    revalidatePath('/sitemap.xml');
    revalidatePath('/rss.xml');

    return { success: true, isDraft: newDraft };
  } catch (err) {
    console.error('Lỗi cập nhật trạng thái bài viết:', err);
    return { success: false, error: 'Không thể cập nhật trạng thái bài viết.' };
  }
}
