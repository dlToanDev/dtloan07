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
  ok: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  bad: 'bg-red-500/10 text-red-700 dark:text-red-400',
  warn: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
} as const;
