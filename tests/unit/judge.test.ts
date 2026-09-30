import { describe, it, expect } from 'vitest';
import { outputsMatch, normalizeOutput } from '@/lib/judge/compare';
import { gradeSubmission, runSamples } from '@/lib/judge/grade';
import type { CodeRunner, RunRequest, RunResult } from '@/lib/judge/types';
import { isLanguageKey } from '@/lib/judge/languages';

describe('normalizeOutput / outputsMatch', () => {
  it('bỏ \\r, khoảng trắng cuối dòng và dòng trống cuối', () => {
    expect(normalizeOutput('8  \r\n9\t\n\n\n')).toBe('8\n9');
    expect(outputsMatch('1 2 3\n', '1 2 3')).toBe(true);
    expect(outputsMatch('  8', '8')).toBe(false); // khoảng trắng đầu dòng vẫn tính
    expect(outputsMatch('8\n9', '9\n8')).toBe(false);
  });
});

/** Runner giả: "chạy" code bằng một hàm JS nhận stdin. */
function fakeRunner(behave: (req: RunRequest) => Partial<RunResult>): CodeRunner & {
  calls: RunRequest[];
} {
  const calls: RunRequest[] = [];
  return {
    calls,
    async run(req) {
      calls.push(req);
      return { status: 'OK', stdout: '', stderr: '', timeMs: 5, memoryKb: 1000, ...behave(req) };
    },
  };
}

const tests = [
  { input: '3 5', expectedOutput: '8', isSample: true },
  { input: '-2 10', expectedOutput: '8', isSample: false },
  { input: '100 1', expectedOutput: '101', isSample: false },
];
const exercise = { timeLimitMs: 1000, memoryLimitMb: 128 };
const sum = (stdin: string) =>
  String(
    stdin
      .split(/\s+/)
      .map(Number)
      .reduce((a, b) => a + b, 0),
  );

describe('gradeSubmission', () => {
  it('đúng hết → ACCEPTED, truyền giới hạn thời gian / RAM xuống runner', async () => {
    const runner = fakeRunner((req) => ({ stdout: `${sum(req.stdin)}\n` }));
    const result = await gradeSubmission({ runner, exercise, tests, language: 'cpp', code: 'x' });
    expect(result).toMatchObject({ verdict: 'ACCEPTED', passed: 3, total: 3 });
    expect(runner.calls[0]).toMatchObject({
      language: 'cpp',
      timeLimitMs: 1000,
      memoryLimitMb: 128,
    });
  });

  it('sai ở test ẩn → WRONG_ANSWER, không lộ input/output test ẩn', async () => {
    const runner = fakeRunner((req) => ({
      stdout: req.stdin === '100 1' ? '999' : sum(req.stdin),
    }));
    const result = await gradeSubmission({
      runner,
      exercise,
      tests,
      language: 'python',
      code: 'x',
    });
    expect(result.verdict).toBe('WRONG_ANSWER');
    expect(result.passed).toBe(2);
    const failed = result.details.find((d) => d.verdict === 'WRONG_ANSWER')!;
    expect(failed).toMatchObject({ index: 3, isSample: false });
    expect(JSON.stringify(result.details)).not.toContain('999');
    expect(JSON.stringify(result.details)).not.toContain('100 1');
  });

  it('lỗi biên dịch ở test đầu → dừng ngay, trả thông báo lỗi', async () => {
    const runner = fakeRunner(() => ({
      status: 'COMPILE_ERROR',
      stderr: "error: 'x' was not declared",
    }));
    const result = await gradeSubmission({ runner, exercise, tests, language: 'cpp', code: 'x' });
    expect(result).toMatchObject({ verdict: 'COMPILE_ERROR', passed: 0, total: 3 });
    expect(result.message).toContain('was not declared');
    expect(runner.calls).toHaveLength(1);
  });

  it('quá thời gian / quá RAM / lỗi chạy được báo đúng loại', async () => {
    for (const [status, verdict] of [
      ['TIME_LIMIT', 'TIME_LIMIT'],
      ['MEMORY_LIMIT', 'MEMORY_LIMIT'],
      ['RUNTIME_ERROR', 'RUNTIME_ERROR'],
    ] as const) {
      const runner = fakeRunner((req) =>
        req.stdin === '-2 10' ? { status, stderr: 'boom' } : { stdout: sum(req.stdin) },
      );
      const result = await gradeSubmission({
        runner,
        exercise,
        tests,
        language: 'java',
        code: 'x',
      });
      expect(result.verdict).toBe(verdict);
    }
  });

  it('máy chấm lỗi / không có test → SYSTEM_ERROR', async () => {
    const broken: CodeRunner = {
      run: async () => {
        throw new Error('ECONNREFUSED');
      },
    };
    expect(
      (await gradeSubmission({ runner: broken, exercise, tests, language: 'c', code: 'x' }))
        .verdict,
    ).toBe('SYSTEM_ERROR');
    const runner = fakeRunner(() => ({}));
    expect(
      (await gradeSubmission({ runner, exercise, tests: [], language: 'c', code: 'x' })).verdict,
    ).toBe('SYSTEM_ERROR');
  });
});

describe('runSamples', () => {
  it('chạy test mẫu và trả output thật để học viên so sánh', async () => {
    const runner = fakeRunner((req) => ({ stdout: `${sum(req.stdin)}\n` }));
    const results = await runSamples({
      runner,
      exercise,
      tests: tests.filter((t) => t.isSample),
      language: 'javascript',
      code: 'x',
    });
    expect(results).toEqual([
      expect.objectContaining({ input: '3 5', expected: '8', stdout: '8\n', verdict: 'ACCEPTED' }),
    ]);
  });

  it('input tự nhập → chỉ chạy, không chấm', async () => {
    const runner = fakeRunner((req) => ({ stdout: `echo:${req.stdin}` }));
    const results = await runSamples({
      runner,
      exercise,
      tests: [],
      customInput: 'hello',
      language: 'python',
      code: 'x',
    });
    expect(results).toEqual([
      expect.objectContaining({ input: 'hello', stdout: 'echo:hello', verdict: null }),
    ]);
  });
});

describe('mapPistonResponse (phản hồi thật đã ghi lại từ Piston)', async () => {
  const { mapPistonResponse } = await import('@/lib/judge/piston');

  it('chạy đúng', () => {
    expect(
      mapPistonResponse(
        {
          compile: { code: 0, stdout: '', stderr: '' },
          run: {
            stdout: '8\n',
            stderr: '',
            code: 0,
            signal: null,
            status: null,
            cpu_time: 3,
            memory: 1952000,
          },
        },
        256,
      ),
    ).toMatchObject({ status: 'OK', stdout: '8\n', timeMs: 3, memoryKb: 1906 });
  });

  it('lỗi biên dịch C++', () => {
    expect(
      mapPistonResponse(
        {
          compile: { code: 1, stderr: "main.cpp:1:20: error: 'x' was not declared" },
          run: { code: 1, status: 'RE' },
        },
        256,
      ),
    ).toMatchObject({ status: 'COMPILE_ERROR', stderr: expect.stringContaining('not declared') });
  });

  it('vòng lặp vô hạn → TIME_LIMIT', () => {
    expect(
      mapPistonResponse(
        { run: { signal: 'SIGKILL', code: null, status: 'TO', cpu_time: 1074, memory: 10824000 } },
        256,
      ).status,
    ).toBe('TIME_LIMIT');
  });

  it('quá thời gian xét theo CPU: chạy chậm do máy bận (CPU thấp) vẫn OK', () => {
    const run = { stdout: '8', code: 0, status: null, memory: 1000 };
    expect(
      mapPistonResponse({ run: { ...run, cpu_time: 900, wall_time: 3500 } }, 256, 1000).status,
    ).toBe('OK');
    expect(
      mapPistonResponse({ run: { ...run, cpu_time: 1200, wall_time: 1300 } }, 256, 1000).status,
    ).toBe('TIME_LIMIT');
  });

  it('ngốn RAM (exit 137 ở sát giới hạn) → MEMORY_LIMIT; exit khác 0 → RUNTIME_ERROR', () => {
    expect(
      mapPistonResponse({ run: { code: 137, status: 'RE', memory: 268432000 } }, 256).status,
    ).toBe('MEMORY_LIMIT');
    expect(mapPistonResponse({ run: { code: 1, status: 'RE', memory: 9000000 } }, 256).status).toBe(
      'RUNTIME_ERROR',
    );
  });

  it('output quá dài (OL) → RUNTIME_ERROR kèm lời nhắc', () => {
    expect(
      mapPistonResponse(
        { run: { status: 'OL', message: 'stdout length exceeded', code: null } },
        256,
      ),
    ).toMatchObject({ status: 'RUNTIME_ERROR', stderr: expect.stringContaining('Output quá dài') });
  });

  it('Piston báo lỗi nội bộ / không có kết quả → ném lỗi (thành SYSTEM_ERROR khi chấm)', () => {
    expect(() => mapPistonResponse({ run: { status: 'XX', message: 'boom' } }, 256)).toThrow(
      'boom',
    );
    expect(() => mapPistonResponse({ message: 'runtime is unknown' }, 256)).toThrow('unknown');
  });
});

describe('isLanguageKey', () => {
  it('chỉ nhận đúng các khóa ngôn ngữ, không nhận thuộc tính kế thừa', () => {
    expect(['cpp', 'c', 'python', 'javascript', 'java'].every(isLanguageKey)).toBe(true);
    expect(isLanguageKey('toString')).toBe(false);
    expect(isLanguageKey('constructor')).toBe(false);
    expect(isLanguageKey('ruby')).toBe(false);
  });
});
