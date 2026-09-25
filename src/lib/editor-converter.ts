import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'joplin-turndown-plugin-gfm';

function parseJsxStyleToHtmlStyle(jsxStyle: string): string {
  const clean = jsxStyle.replace(/^\{\{?|\}\}?$/g, '').trim();
  const rules: string[] = [];
  const regex = /([a-zA-Z0-9_-]+)\s*:\s*(['"][^'"]*['"]|[^,;]+(?:\([^)]*\))?[^,;]*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(clean)) !== null) {
    if (!match[1] || !match[2]) continue;
    const key = match[1].trim();
    const val = match[2].trim().replace(/^['"]|['"]$/g, '');
    const kebabKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    rules.push(`${kebabKey}: ${val}`);
  }

  return rules.join('; ');
}

/**
 * Chuyển Markdown/MDX sang HTML để hiển thị và chỉnh sửa trực quan trong TipTap (Word mode)
 */
export function markdownToHtml(rawMd: string): string {
  if (!rawMd) return '';

  let md = rawMd;

  // Bỏ frontmatter nếu có (phòng trường hợp người dùng paste cả file mdx)
  md = md.replace(/^---[\s\S]*?---\s*/, '');

  // 1. Chuyển JSX style thành HTML inline style
  // VD: style={{ textAlign: 'center', color: '#ff0000' }} -> style="text-align: center; color: #ff0000"
  md = md.replace(/style=\{\{([^}]+)\}\}/g, (_, styleContent: string) => {
    return `style="${parseJsxStyleToHtmlStyle(styleContent)}"`;
  });

  // 2. Chuyển component <Video ... /> sang thẻ div block của TipTap
  md = md.replace(
    /<Video\s+src=(?:\{?"|'|`)([^"'>`\s]+)(?:\}?"|'|`)\s*(?:title=(?:\{?"|'|`)([^"'>`]*)(?:\}?"|'|`))?\s*\/?>(?:<\/Video>)?/g,
    (_, src: string, title?: string) => {
      const t = title?.trim() || 'Video minh họa';
      return `\n\n<div data-type="video-block" data-src="${src}" data-title="${t}">[Video: ${t}]</div>\n\n`;
    },
  );

  // 3. Chuyển component <Audio ... /> sang thẻ div block của TipTap
  md = md.replace(
    /<Audio\s+src=(?:\{?"|'|`)([^"'>`\s]+)(?:\}?"|'|`)\s*(?:title=(?:\{?"|'|`)([^"'>`]*)(?:\}?"|'|`))?\s*(?:description=(?:\{?"|'|`)([^"'>`]*)(?:\}?"|'|`))?\s*\/?>(?:<\/Audio>)?/g,
    (_, src: string, title?: string, desc?: string) => {
      const t = title?.trim() || 'Bản ghi âm / Podcast';
      const d = desc?.trim() || '';
      return `\n\n<div data-type="audio-block" data-src="${src}" data-title="${t}" data-description="${d}">[Audio: ${t}]</div>\n\n`;
    },
  );

  // 4. Chuyển component <Callout ...>...</Callout> sang thẻ div block của TipTap
  md = md.replace(
    /<Callout\s+type=(?:\{?"|'|`)([a-z]+)(?:\}?"|'|`)\s*(?:title=(?:\{?"|'|`)([^"'>`]*)(?:\}?"|'|`))?\s*>([\s\S]*?)<\/Callout>/g,
    (_, type: string, title?: string, content?: string) => {
      const t = title?.trim() || '';
      const parsedInner = marked.parse((content || '').trim(), { async: false }) as string;
      return `\n\n<div data-type="callout-block" data-callout-type="${type}" data-title="${t}">${parsedInner}</div>\n\n`;
    },
  );

  // 5. Parse markdown sang HTML qua marked
  const html = marked.parse(md, {
    async: false,
    gfm: true,
    breaks: false,
  }) as string;

  return html;
}

/**
 * Chuyển HTML từ TipTap (Word mode) sang Markdown/MDX chuẩn
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';

  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '_',
    strongDelimiter: '**',
  });

  // Kích hoạt plugin GFM (bảng biểu, task list, strikethrough)
  td.use(gfm);

  // Quy tắc Video block
  td.addRule('videoBlock', {
    filter: (node) => node.nodeName === 'DIV' && node.getAttribute('data-type') === 'video-block',
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const src = el.getAttribute('data-src') || '';
      const title = el.getAttribute('data-title') || 'Video minh họa';
      if (!src) return '';
      return `\n\n<Video src=${JSON.stringify(src)} title=${JSON.stringify(title)} />\n\n`;
    },
  });

  // Quy tắc Audio block
  td.addRule('audioBlock', {
    filter: (node) => node.nodeName === 'DIV' && node.getAttribute('data-type') === 'audio-block',
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const src = el.getAttribute('data-src') || '';
      const title = el.getAttribute('data-title') || '';
      const desc = el.getAttribute('data-description') || '';
      if (!src) return '';

      let tag = `<Audio src=${JSON.stringify(src)}`;
      if (title) tag += ` title=${JSON.stringify(title)}`;
      if (desc) tag += ` description=${JSON.stringify(desc)}`;
      tag += ' />';
      return `\n\n${tag}\n\n`;
    },
  });

  // Quy tắc Callout block
  td.addRule('calloutBlock', {
    filter: (node) => node.nodeName === 'DIV' && node.getAttribute('data-type') === 'callout-block',
    replacement: (content, node) => {
      const el = node as HTMLElement;
      const type = el.getAttribute('data-callout-type') || 'info';
      const title = el.getAttribute('data-title') || '';
      const cleanContent = content.trim();

      const titleAttr = title ? ` title=${JSON.stringify(title)}` : '';
      return `\n\n<Callout type=${JSON.stringify(type)}${titleAttr}>\n  ${cleanContent}\n</Callout>\n\n`;
    },
  });

  // Gạch chân (Underline)
  td.addRule('underline', {
    filter: ['u'],
    replacement: (content) => `<u>${content}</u>`,
  });

  // Màu nền / Highlight
  td.addRule('highlight', {
    filter: (node) =>
      node.nodeName === 'MARK' ||
      (node.nodeName === 'SPAN' && Boolean((node as HTMLElement).style?.backgroundColor)),
    replacement: (content, node) => {
      const el = node as HTMLElement;
      const bg = el.style?.backgroundColor || el.getAttribute('data-color') || '#fef08a';
      return `<mark style={{ backgroundColor: ${JSON.stringify(bg)} }}>${content}</mark>`;
    },
  });

  // Màu chữ (Text color)
  td.addRule('styledSpanColor', {
    filter: (node) => node.nodeName === 'SPAN' && Boolean((node as HTMLElement).style?.color),
    replacement: (content, node) => {
      const el = node as HTMLElement;
      const color = el.style?.color;
      if (!color) return content;
      return `<span style={{ color: ${JSON.stringify(color)} }}>${content}</span>`;
    },
  });

  // Căn lề đoạn văn (Align: center, right, justify)
  td.addRule('styledParagraphAlign', {
    filter: (node) => node.nodeName === 'P' && Boolean((node as HTMLElement).style?.textAlign),
    replacement: (content, node) => {
      const el = node as HTMLElement;
      const align = el.style?.textAlign?.toLowerCase();
      if (align && align !== 'left' && align !== 'start') {
        return `\n\n<p style={{ textAlign: ${JSON.stringify(align)} }}>${content}</p>\n\n`;
      }
      return `\n\n${content}\n\n`;
    },
  });

  // Căn lề tiêu đề (h1, h2, h3, h4, ...)
  td.addRule('styledHeadingAlign', {
    filter: (node) =>
      /^H[1-6]$/.test(node.nodeName) && Boolean((node as HTMLElement).style?.textAlign),
    replacement: (content, node) => {
      const el = node as HTMLElement;
      const align = el.style?.textAlign?.toLowerCase();
      const tag = node.nodeName.toLowerCase();
      if (align && align !== 'left' && align !== 'start') {
        return `\n\n<${tag} style={{ textAlign: ${JSON.stringify(align)} }}>${content}</${tag}>\n\n`;
      }
      const level = Number(node.nodeName.charAt(1));
      return `\n\n${'#'.repeat(level)} ${content}\n\n`;
    },
  });

  // Quy tắc Hình ảnh kèm Căn lề & Chú thích
  td.addRule('alignedImage', {
    filter: (node) => node.nodeName === 'IMG',
    replacement: (_content, node) => {
      const img = node as HTMLImageElement;
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || img.getAttribute('data-caption') || '';
      const align = img.getAttribute('data-alignment') || 'center';
      const width = img.getAttribute('data-width') || '100%';

      if (!src) return '';

      // Nếu là căn giữa mặc định và 100% width, dùng cú pháp Markdown chuẩn ![alt](src)
      if (align === 'center' && (!width || width === '100%')) {
        return `\n\n![${alt}](${src})\n\n`;
      }

      // Nếu có chỉnh căn lề (trái/phải) hoặc kích thước thu nhỏ (50%/75%), dùng JSX img với attributes
      const alignAttr =
        align && align !== 'center' ? ` data-alignment=${JSON.stringify(align)}` : '';
      const widthAttr = width && width !== '100%' ? ` data-width=${JSON.stringify(width)}` : '';
      return `\n\n<img src=${JSON.stringify(src)} alt=${JSON.stringify(alt)}${alignAttr}${widthAttr} />\n\n`;
    },
  });

  let markdown = td.turndown(html);

  // Chuẩn hóa dòng trống liên tiếp (tối đa 2 dòng trống)
  markdown = markdown
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return markdown;
}
