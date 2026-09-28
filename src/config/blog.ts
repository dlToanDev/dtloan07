/** Số bài mỗi trang. Đổi ở đây là đổi cả /blog lẫn /blog/page/[page]. */
export const POSTS_PER_PAGE = 6;

/** Ảnh bìa dùng chung khi bài viết chưa khai báo cover trong frontmatter. */
export const DEFAULT_POST_COVER = '/images/posts/default-cover.svg';

/**
 * Danh sách chuyên mục và nhãn hiển thị tiếng Việt.
 * Muốn thêm chuyên mục mới, chỉ cần thêm 1 dòng vào đây:
 * 'slug-chuyen-muc': 'Tên Chuyên Mục Hiển Thị'
 */
export const CATEGORY_LABELS: Record<string, string> = {
  server: 'Quản trị server',
  'lap-trinh': 'Lập trình',
  devops: 'DevOps',
  database: 'Database',
  'cong-dong': 'Cộng đồng',
};

/**
 * Lấy nhãn hiển thị cho chuyên mục.
 * Nếu chưa cấu hình nhãn tiếng Việt trong CATEGORY_LABELS, tự động chuyển slug thành dạng dễ đọc.
 * Ví dụ: "cloud-computing" -> "Cloud Computing"
 */
export function getCategoryLabel(category: string): string {
  if (CATEGORY_LABELS[category]) {
    return CATEGORY_LABELS[category];
  }
  return category
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
