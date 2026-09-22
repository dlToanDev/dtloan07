import { describe, expect, it } from 'vitest';
import {
  docxBufferToMarkdown,
  parseDocxImport,
  parseMarkdownImport,
  slugifyPostTitle,
} from '@/lib/post-import';

function createStoredZip(fileName: string, content: string): Buffer {
  const name = Buffer.from(fileName);
  const data = Buffer.from(content);

  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt32LE(0, 14);
  localHeader.writeUInt32LE(data.length, 18);
  localHeader.writeUInt32LE(data.length, 22);
  localHeader.writeUInt16LE(name.length, 26);
  localHeader.writeUInt16LE(0, 28);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0, 8);
  centralHeader.writeUInt16LE(0, 10);
  centralHeader.writeUInt32LE(0, 16);
  centralHeader.writeUInt32LE(data.length, 20);
  centralHeader.writeUInt32LE(data.length, 24);
  centralHeader.writeUInt16LE(name.length, 28);
  centralHeader.writeUInt16LE(0, 30);
  centralHeader.writeUInt16LE(0, 32);
  centralHeader.writeUInt16LE(0, 34);
  centralHeader.writeUInt16LE(0, 36);
  centralHeader.writeUInt32LE(0, 38);
  centralHeader.writeUInt32LE(0, 42);

  const localPart = Buffer.concat([localHeader, name, data]);
  const centralPart = Buffer.concat([centralHeader, name]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralPart.length, 12);
  end.writeUInt32LE(localPart.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([localPart, centralPart, end]);
}

describe('Nhập bài viết Markdown và Word', () => {
  it('chuẩn hóa tiêu đề tiếng Việt thành slug an toàn', () => {
    expect(slugifyPostTitle('Tối ưu Nginx & Docker trên VPS')).toBe('toi-uu-nginx-docker-tren-vps');
  });

  it('đọc frontmatter và nội dung từ file Markdown', () => {
    const result = parseMarkdownImport(
      `---
title: 'Bài thử nghiệm'
description: 'Đây là mô tả đủ dài để dùng làm metadata cho bài viết thử nghiệm.'
publishedAt: '2026-09-18'
category: 'devops'
tags: ['docker', 'vps']
draft: false
---

## Nội dung

Đây là phần nội dung chính của bài viết.
`,
      '2026-09-bai-thu-nghiem.mdx',
    );

    expect(result).toMatchObject({
      title: 'Bài thử nghiệm',
      slug: 'bai-thu-nghiem',
      category: 'devops',
      tags: 'docker, vps',
      draft: false,
    });
    expect(result.content).toContain('## Nội dung');
  });

  it('chuyển đoạn, heading và danh sách trong DOCX thành Markdown', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Hướng dẫn Docker</w:t></w:r></w:p>
          <w:p><w:r><w:t>Đây là đoạn giới thiệu &amp; mô tả bài viết đủ dài để kiểm tra.</w:t></w:r></w:p>
          <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Cài đặt</w:t></w:r></w:p>
          <w:p><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Chạy Docker Compose</w:t></w:r></w:p>
        </w:body>
      </w:document>`;
    const docx = createStoredZip('word/document.xml', xml);

    expect(docxBufferToMarkdown(docx)).toBe(
      '# Hướng dẫn Docker\n\nĐây là đoạn giới thiệu & mô tả bài viết đủ dài để kiểm tra.\n\n## Cài đặt\n\n- Chạy Docker Compose',
    );

    const imported = parseDocxImport(docx, 'huong-dan-docker.docx');
    expect(imported.title).toBe('Hướng dẫn Docker');
    expect(imported.slug).toBe('huong-dan-docker');
    expect(imported.draft).toBe(true);
  });

  it('từ chối file giả không có cấu trúc DOCX', () => {
    expect(() => docxBufferToMarkdown(Buffer.from('not-a-docx'))).toThrow(/DOCX không hợp lệ/);
  });
});
