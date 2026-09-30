/** Nhãn + màu trạng thái khóa học dùng trong admin. */
export const COURSE_STATUS = {
  DRAFT: {
    label: 'Nháp',
    hint: 'Chỉ admin thấy.',
    className: 'bg-muted text-muted-foreground',
  },
  ACTIVE: {
    label: 'Đang mở',
    hint: 'Hiện trên web, học viên đăng ký và học được.',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  UPCOMING: {
    label: 'Sắp mở',
    hint: 'Hiện trên web để giới thiệu, chưa cho học.',
    className: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  },
  ARCHIVED: {
    label: 'Lưu trữ',
    hint: 'Ẩn khỏi web; dữ liệu và tiến độ học viên được giữ.',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
} as const;
