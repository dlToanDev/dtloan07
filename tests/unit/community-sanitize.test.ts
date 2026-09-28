import { describe, it, expect } from 'vitest';
import { communityExcerpt, countWords, sanitizeCommunityHtml } from '@/lib/community/sanitize';

describe('sanitizeCommunityHtml', () => {
  it('giữ định dạng cơ bản', () => {
    const html =
      '<h2>Tiêu đề</h2><p><strong>Đậm</strong> <em>nghiêng</em> <code>x</code></p><ul><li>a</li></ul><pre><code>npm i</code></pre>';
    expect(sanitizeCommunityHtml(html)).toBe(html);
  });

  it('bỏ script, style, iframe, sự kiện onclick và javascript: URL', () => {
    const dirty =
      '<p onclick="alert(1)">Hi</p><script>alert(1)</script><style>*{}</style><iframe src="https://x"></iframe><a href="javascript:alert(1)">x</a>';
    const clean = sanitizeCommunityHtml(dirty);
    expect(clean).not.toMatch(/script|style|iframe|onclick|javascript:/i);
    expect(clean).toContain('<p>Hi</p>');
  });

  it('link ngoài luôn nofollow ugc và mở tab mới', () => {
    const clean = sanitizeCommunityHtml('<a href="https://example.com">x</a>');
    expect(clean).toContain('rel="nofollow ugc noopener noreferrer"');
    expect(clean).toContain('target="_blank"');
  });

  it('ảnh chỉ nhận ảnh upload cộng đồng hoặc https; bỏ data: và http:', () => {
    expect(sanitizeCommunityHtml('<img src="/images/community/a.png" alt="a">')).toContain(
      'src="/images/community/a.png"',
    );
    expect(sanitizeCommunityHtml('<img src="https://cdn.x/a.png">')).toContain(
      'https://cdn.x/a.png',
    );
    expect(sanitizeCommunityHtml('<img src="data:image/svg+xml;base64,AAA">')).not.toContain(
      '<img',
    );
    expect(sanitizeCommunityHtml('<img src="/api/admin/x">')).not.toContain('<img');
  });

  it('không cho h1 (tiêu đề bài đã là h1) — hạ xuống h2', () => {
    expect(sanitizeCommunityHtml('<h1>A</h1>')).toBe('<h2>A</h2>');
  });
});

describe('trích dẫn và đếm chữ', () => {
  it('lấy đoạn đầu dạng chữ thuần, cắt theo độ dài', () => {
    const excerpt = communityExcerpt('<h2>Mở đầu</h2><p>Nội dung <strong>rất</strong> dài</p>', 12);
    expect(excerpt).toBe('Mở đầu Nội…');
  });

  it('đếm số từ trong HTML', () => {
    expect(countWords('<p>một hai</p><p>ba</p>')).toBe(3);
  });
});
