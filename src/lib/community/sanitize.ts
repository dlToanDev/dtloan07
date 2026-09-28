import sanitizeHtml from 'sanitize-html';

/** Ảnh tài khoản Pro upload được lưu ở đây (xem uploadCommunityImage). */
export const COMMUNITY_IMAGE_PREFIX = '/images/community/';

const isAllowedImage = (src: string) =>
  src.startsWith(COMMUNITY_IMAGE_PREFIX) || /^https:\/\//i.test(src);

/**
 * Lọc HTML bài viết của người dùng theo danh sách cho phép (không MDX, không script).
 * Gọi cả khi lưu lẫn khi hiển thị để luật mới áp dụng cho bài cũ.
 */
export function sanitizeCommunityHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'h2',
      'h3',
      'h4',
      'p',
      'br',
      'hr',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    // rel/target luôn bị transformTags ghi đè nên người viết không tự đặt được.
    allowedAttributes: { a: ['href', 'rel', 'target'], img: ['src', 'alt'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['https'] },
    allowProtocolRelative: false,
    transformTags: {
      h1: 'h2',
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'nofollow ugc noopener noreferrer',
          target: '_blank',
        },
      }),
    },
    exclusiveFilter: (frame) => frame.tag === 'img' && !isAllowedImage(frame.attribs.src ?? ''),
  });
}

function toText(html: string) {
  return sanitizeHtml(html.replace(/<\/(p|h[1-6]|li|blockquote|pre|tr)>/gi, ' $&'), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Đoạn mô tả ngắn cho danh sách bài / meta description. */
export function communityExcerpt(html: string, max = 200) {
  const text = toText(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function countWords(html: string) {
  const text = toText(html);
  return text ? text.split(' ').length : 0;
}
