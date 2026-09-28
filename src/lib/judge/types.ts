import type { LanguageKey } from '@/lib/judge/languages';

export interface RunRequest {
  language: LanguageKey;
  code: string;
  stdin: string;
  timeLimitMs: number;
  memoryLimitMb: number;
}

/** Kết quả chạy một lần, đã quy về trạng thái chung (không phụ thuộc máy chấm cụ thể). */
export interface RunResult {
  status: 'OK' | 'COMPILE_ERROR' | 'TIME_LIMIT' | 'MEMORY_LIMIT' | 'RUNTIME_ERROR';
  stdout: string;
  stderr: string;
  timeMs: number;
  memoryKb: number;
}

/** Máy chấm: chỉ cần biết chạy code với một input. Đổi Piston sang máy khác = viết runner mới. */
export interface CodeRunner {
  run(request: RunRequest): Promise<RunResult>;
}

export type Verdict =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT'
  | 'MEMORY_LIMIT'
  | 'RUNTIME_ERROR'
  | 'COMPILE_ERROR'
  | 'SYSTEM_ERROR';

export interface JudgeTest {
  input: string;
  expectedOutput: string;
  isSample: boolean;
}
