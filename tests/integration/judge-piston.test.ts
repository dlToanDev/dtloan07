/**
 * Chấm thật qua Piston. Chạy khi có PISTON_URL, ví dụ:
 *   PISTON_URL=http://127.0.0.1:2000 pnpm test:int tests/integration/judge-piston.test.ts
 */
import { describe, it, expect } from 'vitest';
import { PistonRunner } from '@/lib/judge/piston';
import { gradeSubmission } from '@/lib/judge/grade';
import type { LanguageKey } from '@/lib/judge/languages';

const runner = new PistonRunner(process.env.PISTON_URL);
const exercise = { timeLimitMs: 2000, memoryLimitMb: 256 };
const tests = [
  { input: '3 5', expectedOutput: '8', isSample: true },
  { input: '-2 10', expectedOutput: '8', isSample: false },
  { input: '2000000000 2000000000', expectedOutput: '4000000000', isSample: false },
];

const solutions: Record<LanguageKey, string> = {
  cpp: '#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}',
  c: '#include <stdio.h>\nint main(){long long a,b;scanf("%lld %lld",&a,&b);printf("%lld\\n",a+b);}',
  python: 'a, b = map(int, input().split())\nprint(a + b)',
  javascript:
    "const [a,b]=require('fs').readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);console.log(a+b)",
  java: 'import java.util.*;public class Main{public static void main(String[] x){Scanner s=new Scanner(System.in);long a=s.nextLong(),b=s.nextLong();System.out.println(a+b);}}',
};

describe.skipIf(!process.env.PISTON_URL)('máy chấm Piston thật', () => {
  it.each(Object.entries(solutions))(
    '%s: lời giải đúng → ACCEPTED',
    async (language, code) => {
      const result = await gradeSubmission({
        runner,
        exercise,
        tests,
        language: language as LanguageKey,
        code,
      });
      expect(result).toMatchObject({ verdict: 'ACCEPTED', passed: 3, total: 3 });
    },
    60_000,
  );

  it('tràn số int ở test ẩn → WRONG_ANSWER ở test 3', async () => {
    const result = await gradeSubmission({
      runner,
      exercise,
      tests,
      language: 'cpp',
      code: '#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b;}',
    });
    expect(result).toMatchObject({ verdict: 'WRONG_ANSWER', passed: 2 });
  }, 60_000);

  it('lỗi biên dịch, vòng lặp vô hạn, ngốn RAM', async () => {
    const grade = (language: LanguageKey, code: string) =>
      gradeSubmission({ runner, exercise, tests, language, code });
    expect((await grade('cpp', 'int main(){ return x; }')).verdict).toBe('COMPILE_ERROR');
    expect((await grade('python', 'while True: pass')).verdict).toBe('TIME_LIMIT');
    expect((await grade('python', 'a = bytearray(900 * 1024 * 1024)')).verdict).toBe(
      'MEMORY_LIMIT',
    );
  }, 60_000);
});
