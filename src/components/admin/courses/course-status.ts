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
    className: 'bg-success/10 text-success',
  },
  UPCOMING: {
    label: 'Sắp mở',
    hint: 'Hiện trên web để giới thiệu, chưa cho học.',
    className: 'bg-info/10 text-info',
  },
  ARCHIVED: {
    label: 'Lưu trữ',
    hint: 'Ẩn khỏi web; dữ liệu và tiến độ học viên được giữ.',
    className: 'bg-warning/10 text-warning',
  },
} as const;
