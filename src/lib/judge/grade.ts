import { outputsMatch } from '@/lib/judge/compare';
import type { LanguageKey } from '@/lib/judge/languages';
import type { CodeRunner, JudgeTest, RunResult, Verdict } from '@/lib/judge/types';

/** Số test chạy song song cho một bài nộp (máy chấm được giới hạn 2 CPU). */
const PARALLEL_TESTS = 2;
const MAX_MESSAGE = 2000;
const MAX_SAMPLE_OUTPUT = 4000;

export interface TestDetail {
  index: number; // 1-based
  isSample: boolean;
  verdict: Verdict;
  timeMs: number;
  memoryKb: number;
}

export interface GradeResult {
  verdict: Verdict;
  passed: number;
  total: number;
  details: TestDetail[];
  message: string | null;
}

interface GradeInput {
  runner: CodeRunner;
  exercise: { timeLimitMs: number; memoryLimitMb: number };
  tests: JudgeTest[];
  language: LanguageKey;
  code: string;
}

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max)}\n… (đã cắt bớt)` : text;

function verdictOf(result: RunResult, expected: string): Verdict {
  if (result.status === 'OK')
    return outputsMatch(result.stdout, expected) ? 'ACCEPTED' : 'WRONG_ANSWER';
  return result.status;
}

/**
 * Chấm một bài nộp theo kiểu Codeforces: chạy test 1 trước (bắt lỗi biên dịch sớm), sau đó các
 * test còn lại theo từng nhóm song song, dừng ở test sai đầu tiên. Chi tiết trả về không chứa
 * input/output của test ẩn; thông báo lỗi chạy chỉ lấy từ test mẫu để không lộ dữ liệu test ẩn.
 */
export async function gradeSubmission({
  runner,
  exercise,
  tests,
  language,
  code,
}: GradeInput): Promise<GradeResult> {
  const total = tests.length;
  if (total === 0)
    return {
      verdict: 'SYSTEM_ERROR',
      passed: 0,
      total,
      details: [],
      message: 'Bài tập chưa có test.',
    };

  const runOne = (test: JudgeTest) =>
    runner.run({
      language,
      code,
      stdin: test.input,
      timeLimitMs: exercise.timeLimitMs,
      memoryLimitMb: exercise.memoryLimitMb,
    });

  const details: TestDetail[] = [];
  let message: string | null = null;
  try {
    const first = await runOne(tests[0]!);
    if (first.status === 'COMPILE_ERROR')
      return {
        verdict: 'COMPILE_ERROR',
        passed: 0,
        total,
        details: [],
        message: clip(first.stderr || first.stdout, MAX_MESSAGE),
      };

    const results: RunResult[] = [first];
    let failed = verdictOf(first, tests[0]!.expectedOutput) !== 'ACCEPTED';
    for (let start = 1; start < total && !failed; start += PARALLEL_TESTS) {
      const batch = tests.slice(start, start + PARALLEL_TESTS);
      const batchResults = await Promise.all(batch.map(runOne));
      results.push(...batchResults);
      failed = batchResults.some((r, i) => verdictOf(r, batch[i]!.expectedOutput) !== 'ACCEPTED');
    }

    for (const [i, result] of results.entries()) {
      const test = tests[i]!;
      const verdict = verdictOf(result, test.expectedOutput);
      details.push({
        index: i + 1,
        isSample: test.isSample,
        verdict,
        timeMs: result.timeMs,
        memoryKb: result.memoryKb,
      });
      if (verdict !== 'ACCEPTED') {
        if (test.isSample && result.stderr) message = clip(result.stderr, MAX_MESSAGE);
        break;
      }
    }
  } catch (error) {
    console.error('Judge failed:', error);
    return {
      verdict: 'SYSTEM_ERROR',
      passed: 0,
      total,
      details: [],
      message: 'Máy chấm đang bận hoặc gặp sự cố. Vui lòng thử lại sau ít phút.',
    };
  }

  const failure = details.find((d) => d.verdict !== 'ACCEPTED');
  return {
    verdict: failure?.verdict ?? 'ACCEPTED',
    passed: failure ? failure.index - 1 : total,
    total,
    details,
    message,
  };
}

export interface SampleRun {
  input: string;
  expected: string | null;
  stdout: string;
  stderr: string;
  status: RunResult['status'];
  /** null khi chạy với input tự nhập (không có đáp án để so). */
  verdict: Verdict | null;
  timeMs: number;
}

/** "Chạy thử": chạy các test mẫu (hoặc input tự nhập) và trả output thật, không lưu. */
export async function runSamples({
  runner,
  exercise,
  tests,
  language,
  code,
  customInput,
}: GradeInput & { customInput?: string }): Promise<SampleRun[]> {
  const cases =
    customInput !== undefined
      ? [{ input: customInput, expected: null }]
      : tests.map((test) => ({ input: test.input, expected: test.expectedOutput }));
  const out: SampleRun[] = [];
  for (const item of cases) {
    const result = await runner.run({
      language,
      code,
      stdin: item.input,
      timeLimitMs: exercise.timeLimitMs,
      memoryLimitMb: exercise.memoryLimitMb,
    });
    out.push({
      input: item.input,
      expected: item.expected,
      stdout: clip(result.stdout, MAX_SAMPLE_OUTPUT),
      stderr: clip(result.stderr, MAX_MESSAGE),
      status: result.status,
      verdict: item.expected === null ? null : verdictOf(result, item.expected),
      timeMs: result.timeMs,
    });
    // Lỗi biên dịch thì các test sau cũng vậy — không chạy tiếp.
    if (result.status === 'COMPILE_ERROR') break;
  }
  return out;
}
