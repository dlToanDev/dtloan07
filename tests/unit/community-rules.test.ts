import { describe, it, expect } from 'vitest';
import {
  normalizeTags,
  parseCommunityPostInput,
  shouldLockAfterWarnings,
  WARNING_LIMIT,
} from '@/lib/community/rules';

describe('khóa tài khoản theo cảnh báo', () => {
  it('đủ 3 cảnh báo thì khóa', () => {
    expect(WARNING_LIMIT).toBe(3);
    expect(shouldLockAfterWarnings(2)).toBe(false);
    expect(shouldLockAfterWarnings(3)).toBe(true);
    expect(shouldLockAfterWarnings(4)).toBe(true);
  });
});

describe('tag bài cộng đồng', () => {
  it('chuẩn hóa về chữ thường không dấu, bỏ trùng, tối đa 5', () => {
    expect(normalizeTags(['Docker', '#docker', 'Lập Trình', ' ', 'a', 'b', 'c', 'd'])).toEqual([
      'docker',
      'lap-trinh',
      'a',
      'b',
      'c',
    ]);
  });
});

describe('kiểm tra bài viết', () => {
  const body = `<p>${'Nội dung đủ dài cho một bài viết. '.repeat(5)}</p>`;

  it('lọc HTML và trả dữ liệu sạch', () => {
    const result = parseCommunityPostInput({
      title: '  Hướng dẫn Docker  ',
      contentHtml: `${body}<script>alert(1)</script>`,
      coverUrl: '/images/community/a.png',
      tags: ['Docker'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.title).toBe('Hướng dẫn Docker');
    expect(result.data.contentHtml).not.toContain('script');
    expect(result.data.tags).toEqual(['docker']);
  });

  it('từ chối tiêu đề ngắn, nội dung quá ngắn và ảnh bìa ngoài', () => {
    expect(parseCommunityPostInput({ title: 'Hi', contentHtml: body, tags: [] })).toMatchObject({
      ok: false,
      error: expect.stringContaining('Tiêu đề'),
    });
    expect(
      parseCommunityPostInput({ title: 'Tiêu đề ổn', contentHtml: '<p>ngắn</p>', tags: [] }),
    ).toMatchObject({ ok: false, error: expect.stringContaining('Nội dung') });
    // Nội dung chỉ toàn thẻ bị lọc thì coi như trống.
    expect(
      parseCommunityPostInput({
        title: 'Tiêu đề ổn',
        contentHtml: `<script>${'x'.repeat(500)}</script>`,
        tags: [],
      }),
    ).toMatchObject({ ok: false });
    expect(
      parseCommunityPostInput({
        title: 'Tiêu đề ổn',
        contentHtml: body,
        coverUrl: 'https://evil.example/a.png',
        tags: [],
      }),
    ).toMatchObject({ ok: false, error: expect.stringContaining('Ảnh bìa') });
  });
});
