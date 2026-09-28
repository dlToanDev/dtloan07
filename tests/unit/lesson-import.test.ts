import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { importDocx, importMarkdown } from '@/lib/courses/content-import';

describe('nhập nội dung bài học từ file', () => {
  it('Word: giữ tiêu đề, đậm/nghiêng, danh sách, bảng, code; ảnh lưu thành file', async () => {
    const saved: string[] = [];
    const result = await importDocx(
      readFileSync('tests/fixtures/bai-giang.docx'),
      async (data, type) => {
        saved.push(type);
        expect(data.length).toBeGreaterThan(0);
        return '/images/lessons/test.png';
      },
    );
    expect(result.title).toBe('Bài 1: Biến và kiểu dữ liệu');
    expect(result.markdown).not.toContain('# Bài 1'); // tiêu đề tách riêng, không lặp trong nội dung
    expect(result.markdown).toContain('**biến**');
    expect(result.markdown).toMatch(/[_*]kiểu dữ liệu[_*]/);
    expect(result.markdown).toContain('## Các kiểu cơ bản');
    expect(result.markdown).toMatch(/[-*]\s+int: số nguyên/);
    expect(result.markdown).toMatch(/\|\s*int\s*\|\s*4 byte\s*\|/);
    expect(result.markdown).toContain('![](/images/lessons/test.png)');
    expect(result.markdown).toContain('```');
    expect(result.markdown).toContain('int main() { return 0; }');
    expect(saved).toEqual(['image/png']);
    expect(result.images).toBe(1);
  });

  it('Markdown / MDX: tiêu đề từ frontmatter hoặc dòng # đầu, bỏ khỏi nội dung', () => {
    expect(importMarkdown('---\ntitle: Con trỏ\n---\n\n# Tiêu đề phụ\n\nNội dung')).toEqual({
      title: 'Con trỏ',
      markdown: 'Nội dung',
      images: 0,
    });
    expect(importMarkdown('﻿# Vòng lặp for\n\n```cpp\nfor(;;){}\n```')).toEqual({
      title: 'Vòng lặp for',
      markdown: '```cpp\nfor(;;){}\n```',
      images: 0,
    });
    expect(importMarkdown('Không có tiêu đề').title).toBeNull();
  });
});
