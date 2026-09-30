import { slugifyPostTitle } from '@/lib/utils';
import {
  COMMUNITY_IMAGE_PREFIX,
  countWords,
  sanitizeCommunityHtml,
} from '@/lib/community/sanitize';

/** Đủ số cảnh báo này thì tài khoản bị khóa. */
export const WARNING_LIMIT = 3;
/** Mỗi tài khoản đăng tối đa ngần này bài mới trong 24 giờ (chống spam). */
export const DAILY_POST_LIMIT = 5;
export const MAX_TAGS = 5;
const MIN_WORDS = 20;
const MAX_HTML_LENGTH = 200_000;

export function shouldLockAfterWarnings(count: number) {
  return count >= WARNING_LIMIT;
}

export function normalizeTags(tags: string[]) {
  const clean = tags
    .map((tag) => slugifyPostTitle(tag.replace(/^#+/, '')))
    .filter((tag) => tag.length > 0 && tag.length <= 30);
  return [...new Set(clean)].slice(0, MAX_TAGS);
}

export interface CommunityPostInput {
  title: string;
  contentHtml: string;
  coverUrl?: string | null;
  tags: string[];
}

export type ParsedPost =
  | {
      ok: true;
      data: { title: string; contentHtml: string; coverUrl: string | null; tags: string[] };
    }
  | { ok: false; error: string };

/** Kiểm tra + lọc bài viết người dùng gửi lên (dùng cho cả tạo mới và sửa). */
export function parseCommunityPostInput(input: CommunityPostInput): ParsedPost {
  const title = input.title.replace(/\s+/g, ' ').trim();
  if (title.length < 5 || title.length > 150)
    return { ok: false, error: 'Tiêu đề cần từ 5 đến 150 ký tự.' };
  if (input.contentHtml.length > MAX_HTML_LENGTH)
    return { ok: false, error: 'Nội dung quá dài (tối đa khoảng 200.000 ký tự).' };

  const contentHtml = sanitizeCommunityHtml(input.contentHtml);
  if (countWords(contentHtml) < MIN_WORDS)
    return { ok: false, error: `Nội dung cần ít nhất ${MIN_WORDS} từ.` };

  const coverUrl = input.coverUrl?.trim() || null;
  if (coverUrl && !coverUrl.startsWith(COMMUNITY_IMAGE_PREFIX))
    return { ok: false, error: 'Ảnh bìa phải là ảnh tải lên từ trình soạn bài.' };

  return { ok: true, data: { title, contentHtml, coverUrl, tags: normalizeTags(input.tags) } };
}
