import type { Verdict } from '@/lib/judge/types';

/** Nhãn + màu hiển thị cho kết quả chấm (dùng cả phía admin và học viên). */
export const VERDICT_LABEL: Record<Verdict, { label: string; tone: 'ok' | 'bad' | 'warn' }> = {
  ACCEPTED: { label: 'Đúng', tone: 'ok' },
  WRONG_ANSWER: { label: 'Sai kết quả', tone: 'bad' },
  TIME_LIMIT: { label: 'Quá thời gian', tone: 'warn' },
  MEMORY_LIMIT: { label: 'Quá bộ nhớ', tone: 'warn' },
  RUNTIME_ERROR: { label: 'Lỗi khi chạy', tone: 'bad' },
  COMPILE_ERROR: { label: 'Lỗi biên dịch', tone: 'bad' },
  SYSTEM_ERROR: { label: 'Lỗi máy chấm', tone: 'warn' },
};

export const TONE_CLASS = {
  ok: 'bg-success/10 text-success',
  bad: 'bg-destructive/10 text-destructive',
  warn: 'bg-warning/10 text-warning',
} as const;
