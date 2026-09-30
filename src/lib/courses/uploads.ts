import { randomUUID } from 'node:crypto';

export type UploadKind = 'video' | 'slide' | 'attachment';

const MB = 1024 * 1024;

export const UPLOAD_RULES: Record<
  UploadKind,
  { maxBytes: number; extensions: string[] | null; label: string }
> = {
  // MP4 (H.264) phát được trên mọi trình duyệt; MOV chỉ chắc chắn chạy trên Safari.
  video: { maxBytes: 5 * 1024 * MB, extensions: ['.mp4', '.m4v', '.webm', '.mov'], label: 'Video' },
  slide: { maxBytes: 100 * MB, extensions: ['.pdf'], label: 'Slide PDF' },
  attachment: { maxBytes: 500 * MB, extensions: null, label: 'Tài liệu' },
};

/** Kích thước mỗi phần khi upload nhiều phần (R2/S3 yêu cầu ≥ 5 MB, trừ phần cuối). */
export const PART_SIZE = 16 * MB;

export function partCount(size: number): number {
  return Math.max(1, Math.ceil(size / PART_SIZE));
}

export function extensionOf(filename: string): string {
  const match = filename.toLowerCase().match(/\.[a-z0-9]{1,8}$/);
  return match ? match[0] : '';
}

const formatLimit = (bytes: number) =>
  bytes >= 1024 * MB ? `${bytes / 1024 / MB} GB` : `${bytes / MB} MB`;

/** Kiểm tra file trước khi cho upload. Trả về thông báo lỗi, hoặc null nếu hợp lệ. */
export function validateUpload(kind: UploadKind, filename: string, size: number): string | null {
  const rule = UPLOAD_RULES[kind];
  if (!filename.trim()) return 'Thiếu tên file.';
  if (!Number.isInteger(size) || size <= 0) return 'File rỗng.';
  if (size > rule.maxBytes) return `${rule.label} tối đa ${formatLimit(rule.maxBytes)}.`;
  if (rule.extensions && !rule.extensions.includes(extensionOf(filename)))
    return `${rule.label} cần là file ${rule.extensions.join(', ')}.`;
  return null;
}

export function lessonKeyPrefix(courseId: string, lessonId: string) {
  return `courses/${courseId}/${lessonId}/`;
}

/** Đường dẫn lưu trên R2 do server tự đặt (không dùng tên file của người dùng). */
export function buildStorageKey(
  courseId: string,
  lessonId: string,
  kind: UploadKind,
  filename: string,
): string {
  return `${lessonKeyPrefix(courseId, lessonId)}${kind}-${randomUUID()}${extensionOf(filename)}`;
}

/** File (theo key) có đúng là của bài học và loại đang lưu không — chặn gắn file của bài khác. */
export function keyBelongsTo(key: string, courseId: string, lessonId: string, kind: UploadKind) {
  return key.startsWith(`${lessonKeyPrefix(courseId, lessonId)}${kind}-`) && !key.includes('..');
}

const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.pdf': 'application/pdf',
};

export function contentTypeFor(filename: string): string {
  return CONTENT_TYPES[extensionOf(filename)] ?? 'application/octet-stream';
}
