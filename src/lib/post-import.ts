import { inflateRawSync } from 'node:zlib';
import matter from 'gray-matter';

const DOCX_DOCUMENT_PATH = 'word/document.xml';
const MAX_DOCUMENT_XML_BYTES = 10 * 1024 * 1024;

export interface ImportedPostDraft {
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  category: string;
  categories: string[];
  tags: string;
  cover: string;
  draft: boolean;
  featured: boolean;
  content: string;
}

import { slugifyPostTitle } from '@/lib/utils';
export { slugifyPostTitle };

function stripDatePrefix(fileName: string): string {
  return fileName.replace(/\.(?:md|markdown|mdx|docx)$/i, '').replace(/^\d{4}-\d{2}-/, '');
}

function plainText(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>~-]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferDescription(content: string): string {
  const paragraph = content
    .split(/\n\s*\n/)
    .map(plainText)
    .find((item) => item.length >= 20);

  if (!paragraph) return '';
  if (paragraph.length <= 160) return paragraph;

  const shortened = paragraph.slice(0, 157);
  const lastSpace = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, lastSpace > 100 ? lastSpace : 157).trim()}…`;
}

function inferTitle(content: string, fileName: string): string {
  const heading = /^#\s+(.+)$/m.exec(content)?.[1];
  if (heading) return plainText(heading);

  return stripDatePrefix(fileName)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeTags(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').join(', ');
  }
  return typeof value === 'string' ? value : '';
}

export function parseMarkdownImport(raw: string, fileName: string): ImportedPostDraft {
  const normalizedRaw = raw.replace(/^\uFEFF/, '');
  const parsed = matter(normalizedRaw);
  const data = parsed.data as Record<string, unknown>;
  const sourceContent = parsed.content.trim();
  const inferredTitle = inferTitle(sourceContent, fileName);
  // Layout bài viết đã render H1 từ metadata; bỏ H1 đầu file để tránh lặp tiêu đề.
  const content = sourceContent.replace(/^#\s+.+(?:\r?\n)+/, '').trim();
  const title = typeof data.title === 'string' ? data.title : inferredTitle;
  const rawCategories = Array.isArray(data.categories)
    ? data.categories
    : typeof data.categories === 'string'
      ? data.categories.split(',')
      : [];
  const parsedCategories = rawCategories
    .map((c) =>
      typeof c === 'string'
        ? c
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')
        : '',
    )
    .filter(Boolean);

  const categoryValue =
    typeof data.category === 'string'
      ? data.category
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '')
      : '';

  const categories =
    parsedCategories.length > 0
      ? parsedCategories
      : categoryValue
        ? [categoryValue]
        : ['lap-trinh'];
  const category = categoryValue || categories[0] || 'lap-trinh';

  const publishedAt =
    typeof data.publishedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.publishedAt)
      ? data.publishedAt
      : new Date().toISOString().slice(0, 10);

  return {
    title,
    slug:
      typeof data.slug === 'string'
        ? slugifyPostTitle(data.slug)
        : slugifyPostTitle(stripDatePrefix(fileName) || title),
    description:
      typeof data.description === 'string' ? data.description : inferDescription(content),
    publishedAt,
    category,
    categories,
    tags: normalizeTags(data.tags),
    cover: typeof data.cover === 'string' ? data.cover : '',
    draft: typeof data.draft === 'boolean' ? data.draft : true,
    featured: typeof data.featured === 'boolean' ? data.featured : false,
    content,
  };
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const signature = 0x06054b50;
  const earliestOffset = Math.max(0, buffer.length - 65_557);

  for (let offset = buffer.length - 22; offset >= earliestOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) return offset;
  }

  throw new Error('File DOCX không hợp lệ hoặc đã bị hỏng.');
}

function readDocxDocumentXml(buffer: Buffer): string {
  if (buffer.length < 22) throw new Error('File DOCX không hợp lệ hoặc đã bị hỏng.');

  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  let centralOffset = buffer.readUInt32LE(endOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (centralOffset + 46 > buffer.length || buffer.readUInt32LE(centralOffset) !== 0x02014b50) {
      throw new Error('Cấu trúc file DOCX không hợp lệ.');
    }

    const compressionMethod = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const uncompressedSize = buffer.readUInt32LE(centralOffset + 24);
    const fileNameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const nameStart = centralOffset + 46;
    const nameEnd = nameStart + fileNameLength;

    if (nameEnd > buffer.length) throw new Error('Cấu trúc file DOCX không hợp lệ.');

    const entryName = buffer.toString('utf8', nameStart, nameEnd);
    centralOffset = nameEnd + extraLength + commentLength;

    if (entryName !== DOCX_DOCUMENT_PATH) continue;
    if (uncompressedSize > MAX_DOCUMENT_XML_BYTES || compressedSize > buffer.length) {
      throw new Error('Nội dung file Word quá lớn.');
    }
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error('Cấu trúc file DOCX không hợp lệ.');
    }

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) throw new Error('File DOCX bị thiếu dữ liệu.');

    const compressed = buffer.subarray(dataStart, dataEnd);
    let documentXml: Buffer;
    if (compressionMethod === 0) {
      documentXml = compressed;
    } else if (compressionMethod === 8) {
      documentXml = inflateRawSync(compressed, { maxOutputLength: MAX_DOCUMENT_XML_BYTES });
    } else {
      throw new Error('DOCX dùng kiểu nén chưa được hỗ trợ.');
    }

    return documentXml.toString('utf8');
  }

  throw new Error('Không tìm thấy nội dung văn bản trong file DOCX.');
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export function docxBufferToMarkdown(buffer: Buffer): string {
  const xml = readDocxDocumentXml(buffer);
  const paragraphs: string[] = [];

  for (const match of xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)) {
    const paragraphXml = match[0];
    const headingMatch = /<w:pStyle\b[^>]*w:val="(?:Heading|heading)([1-6])"[^>]*\/?\s*>/.exec(
      paragraphXml,
    );
    const isTitle = /<w:pStyle\b[^>]*w:val="(?:Title|title)"[^>]*\/?\s*>/.test(paragraphXml);
    const isList = /<w:numPr(?:\s[^>]*)?>/.test(paragraphXml);
    const text = decodeXmlEntities(
      paragraphXml
        .replace(/<w:tab\b[^>]*\/?\s*>/g, '\t')
        .replace(/<w:(?:br|cr)\b[^>]*\/?\s*>/g, '\n')
        .replace(/<[^>]+>/g, ''),
    ).trim();

    if (!text) continue;

    if (headingMatch?.[1]) {
      paragraphs.push(`${'#'.repeat(Number(headingMatch[1]))} ${text}`);
    } else if (isTitle) {
      paragraphs.push(`# ${text}`);
    } else if (isList) {
      paragraphs.push(`- ${text}`);
    } else {
      paragraphs.push(text);
    }
  }

  const markdown = paragraphs.join('\n\n').trim();
  if (!markdown) throw new Error('File Word không có nội dung văn bản để nhập.');
  return markdown;
}

export function parseDocxImport(buffer: Buffer, fileName: string): ImportedPostDraft {
  return parseMarkdownImport(docxBufferToMarkdown(buffer), fileName);
}
