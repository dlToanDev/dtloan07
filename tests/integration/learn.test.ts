/**
 * Test tích hợp luồng học: ghi danh, khóa / mở bài, chạy thử, nộp bài, hoàn thành bài học.
 * Máy chấm được thay bằng runner giả (máy chấm thật: judge-piston.test.ts).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const session = { current: null as null | { id: string; role: 'USER' | 'ADMIN' } };
vi.mock('@/lib/auth', () => ({
  auth: async () => (session.current ? { user: session.current } : null),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');
const { setRunnerForTests } = await import('@/lib/judge/runner');
const learn = await import('@/server/actions/learn');
const admin = await import('@/server/actions/course-lessons');

// "Code" của học viên: SUM = in tổng các số, còn lại in 0. Runner giả mô phỏng máy chấm.
setRunnerForTests({
  async run({ code, stdin }) {
    const stdout =
      code === 'SUM'
        ? String(
            stdin
              .split(/\s+/)
              .filter(Boolean)
              .map(Number)
              .reduce((a, b) => a + b, 0),
          )
        : '0';
    return { status: 'OK', stdout, stderr: '', timeMs: 1, memoryKb: 100 };
  },
});

const P = 'it-learn-';
const ids = {
  student: '',
  admin: '',
  free: '',
  paid: '',
  l1: '',
  l2: '',
  draft: '',
  ex: '',
  paidLesson: '',
};
const as = (who: 'student' | 'admin' | null) => {
  session.current = who ? { id: ids[who], role: who === 'admin' ? 'ADMIN' : 'USER' } : null;
};

async function cleanup() {
  await db.course.deleteMany({ where: { slug: { startsWith: P } } });
  await db.user.deleteMany({ where: { email: { startsWith: P } } });
}

beforeAll(async () => {
  await cleanup();
  ids.student = (await db.user.create({ data: { email: `${P}hocvien@x.com`, name: 'HV' } })).id;
  ids.admin = (await db.user.create({ data: { email: `${P}admin@x.com`, role: 'ADMIN' } })).id;
  const free = await db.course.create({
    data: { slug: `${P}cpp`, title: 'C++ cơ bản', description: '', status: 'ACTIVE', priceVnd: 0 },
  });
  ids.free = free.id;
  const l1 = await db.lesson.create({
    data: { courseId: free.id, title: 'Bài 1', slug: 'bai-1', sortOrder: 10, status: 'PUBLISHED' },
  });
  const l2 = await db.lesson.create({
    data: { courseId: free.id, title: 'Bài 2', slug: 'bai-2', sortOrder: 20, status: 'PUBLISHED' },
  });
  const draft = await db.lesson.create({
    data: { courseId: free.id, title: 'Nháp', slug: 'nhap', sortOrder: 30, status: 'DRAFT' },
  });
  Object.assign(ids, { l1: l1.id, l2: l2.id, draft: draft.id });
  const ex = await db.exercise.create({
    data: {
      lessonId: l1.id,
      title: 'Tổng hai số',
      languages: ['cpp', 'python'],
      testCases: {
        create: [
          { input: '3 5', expectedOutput: '8', isSample: true, sortOrder: 0 },
          { input: '10 20', expectedOutput: '30', isSample: false, sortOrder: 1 },
        ],
      },
    },
  });
  ids.ex = ex.id;
  const paid = await db.course.create({
    data: { slug: `${P}java`, title: 'Java', description: '', status: 'ACTIVE', priceVnd: 500000 },
  });
  ids.paid = paid.id;
  ids.paidLesson = (
    await db.lesson.create({
      data: { courseId: paid.id, title: 'Bài 1', slug: 'bai-1', status: 'PUBLISHED' },
    })
  ).id;
});

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

const submit = (code: string, language = 'python') =>
  learn.submitExerciseCode({ exerciseId: ids.ex, language, code });

describe('khóa miễn phí', () => {
  it('chưa đăng nhập / chưa ghi danh thì không nộp được', async () => {
    as(null);
    expect(await submit('SUM')).toEqual({ ok: false, error: 'Vui lòng đăng nhập để học.' });
    as('student');
    expect(await submit('SUM')).toEqual({ ok: false, error: 'Bạn chưa đăng ký khóa học này.' });
  });

  it('ghi danh → bài 1 mở, bài 2 khóa, bài nháp ẩn', async () => {
    as('student');
    expect(await learn.enrollFreeCourse(ids.free)).toEqual({ ok: true, data: null });
    expect(await learn.completeLesson(ids.l2)).toEqual({
      ok: false,
      error: 'Hoàn thành bài trước để mở bài này.',
    });
    expect(await learn.completeLesson(ids.draft)).toEqual({
      ok: false,
      error: 'Không tìm thấy bài học.',
    });
  });

  it('chạy thử chỉ dùng test mẫu, trả output thật', async () => {
    as('student');
    const run = await learn.runExerciseCode({
      exerciseId: ids.ex,
      language: 'python',
      code: 'SUM',
    });
    expect(run).toEqual({
      ok: true,
      data: [
        expect.objectContaining({ input: '3 5', expected: '8', stdout: '8', verdict: 'ACCEPTED' }),
      ],
    });
    const custom = await learn.runExerciseCode({
      exerciseId: ids.ex,
      language: 'cpp',
      code: 'SUM',
      customInput: '1 2 3',
    });
    expect(custom.ok && custom.data[0]).toMatchObject({ stdout: '6', verdict: null });
  });

  it('ngôn ngữ không cho phép / code rỗng bị chặn', async () => {
    as('student');
    expect((await submit('SUM', 'java')).ok).toBe(false);
    expect(await submit('   ')).toEqual({ ok: false, error: 'Bạn chưa viết code.' });
  });

  it('nộp sai → lưu WRONG_ANSWER, không lộ test ẩn, bài 2 vẫn khóa', async () => {
    as('student');
    const wrong = await submit('WRONG');
    expect(wrong.ok && wrong.data.result).toMatchObject({
      verdict: 'WRONG_ANSWER',
      passed: 0,
      total: 2,
    });
    expect(wrong.ok && wrong.data.lessonCompleted).toBe(false);
    const saved = await db.submission.findFirstOrThrow({ where: { userId: ids.student } });
    expect(JSON.stringify(saved.details)).not.toContain('10 20');
    expect((await learn.completeLesson(ids.l2)).ok).toBe(false);
  });

  it('nộp đúng → hoàn thành bài 1, mở bài 2; bài 2 không có bài tập thì tự bấm hoàn thành', async () => {
    as('student');
    const right = await submit('SUM');
    expect(right.ok && right.data.result.verdict).toBe('ACCEPTED');
    expect(right.ok && right.data.lessonCompleted).toBe(true);
    // Nộp đúng lần nữa không "hoàn thành" lại.
    const again = await submit('SUM');
    expect(again.ok && again.data.lessonCompleted).toBe(false);

    expect(await learn.completeLesson(ids.l1)).toEqual({
      ok: false,
      error: 'Làm đúng hết bài tập để hoàn thành bài này.',
    });
    expect(await learn.completeLesson(ids.l2)).toEqual({ ok: true, data: null });
    const progress = await db.lessonProgress.findMany({ where: { userId: ids.student } });
    expect(progress.map((p) => p.lessonId).sort()).toEqual([ids.l1, ids.l2].sort());
  });
});

describe('khóa trả phí và admin', () => {
  it('học viên không tự ghi danh được; admin cấp quyền theo email (không phân biệt hoa thường)', async () => {
    as('student');
    expect((await learn.enrollFreeCourse(ids.paid)).ok).toBe(false);
    expect((await learn.completeLesson(ids.paidLesson)).ok).toBe(false);

    as('admin');
    const granted = await admin.grantEnrollment(ids.paid, `${P}HOCVIEN@x.com`);
    expect(granted.ok).toBe(true);
    expect((await admin.grantEnrollment(ids.paid, 'khong-co@x.com')).ok).toBe(false);

    as('student');
    expect(await learn.completeLesson(ids.paidLesson)).toEqual({ ok: true, data: null });
  });

  it('admin học được cả bài nháp; học viên không gọi được thao tác admin', async () => {
    as('admin');
    expect(await learn.completeLesson(ids.draft)).toEqual({ ok: true, data: null });
    as('student');
    await expect(admin.createLesson(ids.free, 'Hack')).rejects.toThrow('không có quyền');
  });

  it('lưu bài tập: thay bộ test, bỏ code mẫu của ngôn ngữ không dùng, kiểm tra giới hạn', async () => {
    as('admin');
    const base = {
      title: 'Tổng hai số',
      statement: 'Nhập a, b',
      languages: ['python'],
      starterCode: { python: 'a, b = map(int, input().split())', cpp: 'int main(){}' },
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      testCases: [{ input: '1 1', expectedOutput: '2', isSample: true }],
    };
    expect(await admin.saveExercise(ids.ex, base)).toEqual({ ok: true, data: null });
    const saved = await db.exercise.findUniqueOrThrow({
      where: { id: ids.ex },
      include: { testCases: true },
    });
    expect(saved.starterCode).toEqual({ python: 'a, b = map(int, input().split())' });
    expect(saved.testCases.map((t) => t.input)).toEqual(['1 1']);

    expect(await admin.saveExercise(ids.ex, { ...base, timeLimitMs: 10_000 })).toEqual({
      ok: false,
      error: 'Giới hạn thời gian tối đa 3000 ms.',
    });
    expect(await admin.saveExercise(ids.ex, { ...base, languages: [] })).toEqual({
      ok: false,
      error: 'Chọn ít nhất một ngôn ngữ.',
    });
  });

  it('chạy lời giải mẫu với bộ test đang soạn', async () => {
    as('admin');
    const ok = await admin.tryReferenceSolution({
      language: 'cpp',
      code: 'SUM',
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      testCases: [
        { input: '2 2', expectedOutput: '4', isSample: false },
        { input: '2 3', expectedOutput: '6', isSample: false }, // đáp án soạn sai
      ],
    });
    expect(ok.ok && ok.data).toMatchObject({ verdict: 'WRONG_ANSWER', passed: 1 });
  });
});
