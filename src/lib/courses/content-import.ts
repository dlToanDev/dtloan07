import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import mammoth from 'mammoth';
import { htmlToMarkdown } from '@/lib/editor-converter';

export const IMPORT_EXTENSIONS = ['.docx', '.md', '.markdown', '.mdx'] as const;
export const MAX_IMPORT_BYTES = 9 * 1024 * 1024; // dưới giới hạn body server action (10 MB)
const MAX_IMAGES = 60;

export interface ImportedLesson {
  /** Tiêu đề lấy từ frontmatter / dòng tiêu đề đầu tiên, null nếu không có. */
  title: string | null;
  /** Markdown đúng định dạng trình soạn thảo đang dùng (tiêu đề đầu đã bỏ). */
  markdown: string;
  images: number;
}

/** Word: ánh xạ các kiểu đoạn "code" hay gặp thành khối code (các kiểu khác để mammoth tự xử lý). */
const STYLE_MAP = [
  "p[style-name='Preformatted Text'] => pre:separator('\\n')",
  "p[style-name='HTML Preformatted'] => pre:separator('\\n')",
  "p[style-name='Code'] => pre:separator('\\n')",
  "p[style-name='Source Code'] => pre:separator('\\n')",
  "r[style-name='Code Char'] => code",
];

/**
 * Sửa HTML của mammoth cho bộ chuyển Markdown: <pre> → <pre><code> (thành khối ```),
 * và dòng đầu mỗi bảng thành tiêu đề (<th>) để bảng Markdown không có dòng tiêu đề rỗng.
 */
export function tidyWordHtml(html: string): string {
  return html
    .replace(/<pre>([\s\S]*?)<\/pre>/g, (_, code: string) =>
      code.startsWith('<code') ? `<pre>${code}</pre>` : `<pre><code>${code}</code></pre>`,
    )
    .replace(
      /<table>\s*<tr>([\s\S]*?)<\/tr>/g,
      (_, row: string) =>
        `<table><tr>${row.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>')}</tr>`,
    );
}

/** Tách tiêu đề H1 đầu tiên ra khỏi nội dung (trang học đã hiện tên bài). */
function splitTitle(markdown: string): { title: string | null; body: string } {
  const match = markdown.match(/^\s*#\s+(.+?)\s*#*\s*(?:\r?\n|$)/);
  if (!match) return { title: null, body: markdown.trim() };
  return { title: match[1]!.trim(), body: markdown.slice(match[0].length).trim() };
}

export function importMarkdown(raw: string): ImportedLesson {
  const parsed = matter(raw.replace(/^﻿/, ''));
  const { title, body } = splitTitle(parsed.content);
  const frontTitle = typeof parsed.data.title === 'string' ? parsed.data.title.trim() : '';
  return { title: frontTitle || title, markdown: body, images: 0 };
}

/**
 * Word → HTML (mammoth, giữ đậm / nghiêng / danh sách / bảng / ảnh / code) → Markdown.
 * Ảnh trong file được lưu thành file ảnh riêng (`saveImage` trả URL công khai).
 */
export async function importDocx(
  buffer: Buffer,
  saveImage: (data: Buffer, contentType: string) => Promise<string>,
): Promise<ImportedLesson> {
  let images = 0;
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: STYLE_MAP,
      convertImage: mammoth.images.imgElement(async (image) => {
        if (++images > MAX_IMAGES) return { src: '' };
        const data = Buffer.from(await image.readAsBase64String(), 'base64');
        return { src: await saveImage(data, image.contentType) };
      }),
    },
  );
  const markdown = htmlToMarkdown(tidyWordHtml(result.value)).replace(/!\[[^\]]*\]\(\)\n?/g, '');
  if (!markdown.trim()) throw new Error('File Word không có nội dung để nhập.');
  const { title, body } = splitTitle(markdown);
  return { title, markdown: body, images: Math.min(images, MAX_IMAGES) };
}

const IMAGE_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

/** Lưu ảnh trong file Word vào public/images/lessons (giống ảnh chèn trong trình soạn thảo). */
export async function saveImportedImage(data: Buffer, contentType: string): Promise<string> {
  const ext = IMAGE_EXT[contentType];
  if (!ext || ext === '.svg') return ''; // bỏ định dạng lạ / SVG (có thể chứa script)
  const dir = path.join(process.cwd(), 'public', 'images', 'lessons');
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, name), data);
  return `/images/lessons/${name}`;
}

/** Đọc file người dùng tải lên (Word / Markdown / MDX) thành nội dung bài học. */
export async function importLessonFile(file: File): Promise<ImportedLesson> {
  const ext = path.extname(file.name).toLowerCase();
  if (!(IMPORT_EXTENSIONS as readonly string[]).includes(ext))
    throw new Error(`"${file.name}": chỉ nhận file Word (.docx), Markdown (.md) hoặc MDX (.mdx).`);
  if (file.size > MAX_IMPORT_BYTES) throw new Error(`"${file.name}" lớn hơn 9 MB.`);
  if (ext === '.docx') return importDocx(Buffer.from(await file.arrayBuffer()), saveImportedImage);
  return importMarkdown(await file.text());
}
