'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { ACCESS_MESSAGES, checkLessonAccess, getViewer } from '@/lib/courses/access';
import { allExercisesSolved } from '@/lib/courses/progress';
import { gradeSubmission, runSamples, type GradeResult, type SampleRun } from '@/lib/judge/grade';
import { isLanguageKey, MAX_CODE_BYTES, type LanguageKey } from '@/lib/judge/languages';
import { Cooldown } from '@/lib/judge/limiter';
import { judgeRunner } from '@/lib/judge/runner';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

// Mỗi học viên nộp bài cách nhau ít nhất 5 giây, chạy thử cách nhau 2 giây (tắt khi chạy test).
const testing = process.env.NODE_ENV === 'test';
const submitCooldown = new Cooldown(testing ? 0 : 5000);
const runCooldown = new Cooldown(testing ? 0 : 2000);

/** Đăng ký khóa miễn phí (khóa trả phí: admin cấp quyền / mua ở giai đoạn sau). */
export async function enrollFreeCourse(courseId: string): Promise<Result<null>> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: ACCESS_MESSAGES.login };
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course || course.status !== 'ACTIVE') return { ok: false, error: 'Khóa học chưa mở.' };
  if (course.priceVnd > 0 && !viewer.isAdmin)
    return { ok: false, error: 'Khóa học trả phí — vui lòng liên hệ để đăng ký.' };
  await db.enrollment.upsert({
    where: { userId_courseId: { userId: viewer.id, courseId } },
    create: { userId: viewer.id, courseId },
    update: {},
  });
  revalidatePath(`/courses/${course.slug}`);
  return { ok: true, data: null };
}

async function loadExerciseForViewer(exerciseId: string, language: string, code: string) {
  const viewer = await getViewer();
  if (!viewer) return { error: ACCESS_MESSAGES.login } as const;
  if (!isLanguageKey(language)) return { error: 'Ngôn ngữ không hợp lệ.' } as const;
  if (new TextEncoder().encode(code).length > MAX_CODE_BYTES)
    return { error: 'Code quá dài (tối đa 64 KB).' } as const;
  if (!code.trim()) return { error: 'Bạn chưa viết code.' } as const;

  const exercise = await db.exercise.findUnique({
    where: { id: exerciseId },
    include: { testCases: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
  });
  if (!exercise) return { error: 'Không tìm thấy bài tập.' } as const;
  if (!exercise.languages.includes(language))
    return { error: 'Bài tập này không cho dùng ngôn ngữ đó.' } as const;
  const access = await checkLessonAccess(exercise.lessonId, viewer);
  if (!access.ok) return { error: ACCESS_MESSAGES[access.reason] } as const;
  return { viewer, exercise, language: language as LanguageKey } as const;
}

/** "Chạy thử" với test mẫu hoặc input tự nhập — không lưu, không tính điểm. */
export async function runExerciseCode(input: {
  exerciseId: string;
  language: string;
  code: string;
  customInput?: string;
}): Promise<Result<SampleRun[]>> {
  const loaded = await loadExerciseForViewer(input.exerciseId, input.language, input.code);
  if ('error' in loaded) return { ok: false, error: loaded.error! };
  const wait = runCooldown.take(`run:${loaded.viewer.id}`);
  if (wait > 0) return { ok: false, error: `Chờ ${Math.ceil(wait / 1000)} giây rồi chạy lại.` };
  if (input.customInput !== undefined && input.customInput.length > 64 * 1024)
    return { ok: false, error: 'Input quá dài.' };

  try {
    const results = await runSamples({
      runner: judgeRunner,
      exercise: loaded.exercise,
      tests: loaded.exercise.testCases.filter((test) => test.isSample),
      language: loaded.language,
      code: input.code,
      customInput: input.customInput,
    });
    return { ok: true, data: results };
  } catch (error) {
    console.error('Run code failed:', error);
    return { ok: false, error: 'Máy chấm đang bận hoặc gặp sự cố. Vui lòng thử lại sau ít phút.' };
  }
}

export interface SubmitResult {
  submissionId: string;
  result: GradeResult;
  /** Bài học vừa hoàn thành nhờ bài nộp này. */
  lessonCompleted: boolean;
}

/** Nộp bài: chấm với toàn bộ test, lưu bài nộp, đủ bài tập đúng thì hoàn thành bài học. */
export async function submitExerciseCode(input: {
  exerciseId: string;
  language: string;
  code: string;
}): Promise<Result<SubmitResult>> {
  const loaded = await loadExerciseForViewer(input.exerciseId, input.language, input.code);
  if ('error' in loaded) return { ok: false, error: loaded.error! };
  const { viewer, exercise, language } = loaded;
  const wait = submitCooldown.take(`submit:${viewer.id}`);
  if (wait > 0) return { ok: false, error: `Chờ ${Math.ceil(wait / 1000)} giây rồi nộp lại.` };

  const result = await gradeSubmission({
    runner: judgeRunner,
    exercise,
    tests: exercise.testCases,
    language,
    code: input.code,
  });
  // Lỗi máy chấm không phải lỗi của học viên — không lưu, không tính lượt.
  if (result.verdict === 'SYSTEM_ERROR') return { ok: false, error: result.message! };

  const submission = await db.submission.create({
    data: {
      exerciseId: exercise.id,
      userId: viewer.id,
      language,
      code: input.code,
      verdict: result.verdict,
      passed: result.passed,
      total: result.total,
      details: JSON.parse(JSON.stringify(result.details)),
      message: result.message,
    },
  });

  let lessonCompleted = false;
  if (result.verdict === 'ACCEPTED')
    lessonCompleted = await markLessonIfSolved(exercise.lessonId, viewer.id);
  return { ok: true, data: { submissionId: submission.id, result, lessonCompleted } };
}

/** Ghi hoàn thành bài học khi mọi bài tập đều đã có bài nộp đúng. Trả về true nếu vừa ghi. */
async function markLessonIfSolved(lessonId: string, userId: string) {
  const [exercises, solved, existing] = await Promise.all([
    db.exercise.findMany({ where: { lessonId }, select: { id: true } }),
    db.submission.findMany({
      where: { userId, verdict: 'ACCEPTED', exercise: { lessonId } },
      select: { exerciseId: true },
      distinct: ['exerciseId'],
    }),
    db.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } }),
  ]);
  if (existing) return false;
  const done = allExercisesSolved(
    exercises.map((e) => e.id),
    new Set(solved.map((s) => s.exerciseId)),
  );
  if (!done) return false;
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId },
    update: {},
  });
  await revalidateLesson(lessonId);
  return true;
}

/** Bài không có bài tập: học viên tự bấm "Hoàn thành bài học". */
export async function completeLesson(lessonId: string): Promise<Result<null>> {
  const viewer = await getViewer();
  const access = await checkLessonAccess(lessonId, viewer);
  if (!access.ok) return { ok: false, error: ACCESS_MESSAGES[access.reason] };
  const exercises = await db.exercise.count({ where: { lessonId } });
  if (exercises > 0) return { ok: false, error: 'Làm đúng hết bài tập để hoàn thành bài này.' };
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: viewer!.id, lessonId } },
    create: { userId: viewer!.id, lessonId },
    update: {},
  });
  await revalidateLesson(lessonId);
  return { ok: true, data: null };
}

async function revalidateLesson(lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { course: { select: { slug: true } } },
  });
  if (lesson) revalidatePath(`/courses/${lesson.course.slug}`, 'layout');
}
