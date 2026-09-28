import { PistonRunner } from '@/lib/judge/piston';
import { Semaphore } from '@/lib/judge/limiter';
import type { CodeRunner } from '@/lib/judge/types';

// Tối đa 4 lần chạy code cùng lúc trên cả server (một tiến trình PM2).
const slots = new Semaphore(4);
let current: CodeRunner = new PistonRunner();

/** Máy chấm dùng cho học viên, đã giới hạn số lần chạy đồng thời. */
export const judgeRunner: CodeRunner = { run: (request) => slots.use(() => current.run(request)) };

/** Thay máy chấm — chỉ dùng trong test. */
export function setRunnerForTests(next: CodeRunner) {
  if (process.env.NODE_ENV !== 'test') throw new Error('Chỉ dùng trong test.');
  current = next;
}
