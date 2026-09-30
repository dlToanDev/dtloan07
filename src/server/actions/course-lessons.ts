'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { slugifyPostTitle } from '@/lib/utils';
import {
  abortMultipartUpload,
  completeMultipartUpload,
  deleteFromStorage,
  getObjectSize,
  isR2Configured,
  presignUploadParts,
  startMultipartUpload,
} from '@/lib/storage';
import {
  buildStorageKey,
  contentTypeFor,
  keyBelongsTo,
  PART_SIZE,
  partCount,
  UPLOAD_RULES,
  validateUpload,
  type UploadKind,
} from '@/lib/courses/uploads';
import { parseVideoEmbed } from '@/lib/courses/video';
import { importLessonFile, type ImportedLesson } from '@/lib/courses/content-import';
import { gradeSubmission, type GradeResult } from '@/lib/judge/grade';
import {
  isLanguageKey,
  MAX_CODE_BYTES,
  MAX_MEMORY_LIMIT_MB,
  MAX_TIME_LIMIT_MS,
} from '@/lib/judge/languages';
import { judgeRunner } from '@/lib/judge/runner';

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN')
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
}

async function revalidateCourse(courseId: string) {
  const course = await db.course.findUnique({ where: { id: courseId }, select: { slug: true } });
  revalidatePath(`/admin/courses/${courseId}`, 'layout');
  if (course) revalidatePath(`/courses/${course.slug}`, 'layout');
  revalidatePath('/courses');
}

async function lessonCourseId(lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true },
  });
  if (!lesson) throw new Error('Không tìm thấy bài học.');
  return lesson.courseId;
}

async function uniqueLessonSlug(courseId: string, title: string, excludeId?: string) {
  const base = slugifyPostTitle(title) || 'bai-hoc';
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const hit = await db.lesson.findUnique({
      where: { courseId_slug: { courseId, slug } },
      select: { id: true },
    });
    if (!hit || hit.id === excludeId) return slug;
  }
}

// ---------------------------------------------------------------- Bài học

export async function createLesson(
  courseId: string,
  title: string,
): Promise<Result<{ id: string }>> {
  await requireAdmin();
  const name = title.trim();
  if (!name) return { ok: false, error: 'Nhập tên bài học.' };
  const last = await db.lesson.aggregate({ where: { courseId }, _max: { sortOrder: true } });
  const lesson = await db.lesson.create({
    data: {
      courseId,
      title: name.slice(0, 200),
      slug: await uniqueLessonSlug(courseId, name),
      sortOrder: (last._max.sortOrder ?? 0) + 10,
    },
  });
  await revalidateCourse(courseId);
  return { ok: true, data: { id: lesson.id } };
}

const lessonSchema = z.object({
  title: z.string().trim().min(1, 'Nhập tên bài học.').max(200),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang.',
    ),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  isPreview: z.boolean(),
  content: z.string().max(500_000, 'Nội dung quá dài.'),
  videoUrl: z.string().trim().max(500),
});

export async function updateLesson(
  id: string,
  input: z.input<typeof lessonSchema>,
): Promise<Result> {
  await requireAdmin();
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]!.message };
  const data = parsed.data;
  if (data.videoUrl && !parseVideoEmbed(data.videoUrl))
    return { ok: false, error: 'Link video chưa đúng — dán link YouTube hoặc Vimeo.' };
  const courseId = await lessonCourseId(id);
  const clash = await db.lesson.findUnique({
    where: { courseId_slug: { courseId, slug: data.slug } },
    select: { id: true },
  });
  if (clash && clash.id !== id)
    return { ok: false, error: 'Đường dẫn đã dùng cho bài khác trong khóa.' };
  await db.lesson.update({ where: { id }, data: { ...data, videoUrl: data.videoUrl || null } });
  await revalidateCourse(courseId);
  return { ok: true, data: null };
}

export async function deleteLesson(id: string): Promise<Result> {
  await requireAdmin();
  const courseId = await lessonCourseId(id);
  const lesson = await db.lesson.delete({ where: { id }, include: { attachments: true } });
  // Xóa luôn video, slide, tài liệu của bài trên R2.
  await Promise.all(
    [lesson.videoKey, lesson.slideKey, ...lesson.attachments.map((file) => file.storageKey)].map(
      deleteFromStorage,
    ),
  );
  await revalidateCourse(courseId);
  return { ok: true, data: null };
}

export async function reorderLessons(courseId: string, ids: string[]): Promise<Result> {
  await requireAdmin();
  await db.$transaction(
    ids.map((id, index) =>
      db.lesson.update({ where: { id, courseId }, data: { sortOrder: (index + 1) * 10 } }),
    ),
  );
  await revalidateCourse(courseId);
  return { ok: true, data: null };
}

/** Đọc file Word / Markdown / MDX thành nội dung bài (chưa lưu — trình soạn thảo hiện để admin xem). */
export async function importLessonContent(form: FormData): Promise<Result<ImportedLesson>> {
  await requireAdmin();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Chưa chọn file.' };
  try {
    return { ok: true, data: await importLessonFile(file) };
  } catch (error) {
    console.error('Import lesson content failed:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Không đọc được file.' };
  }
}

/** Tạo nhiều bài học cùng lúc, mỗi file Word / Markdown một bài (bản nháp). */
export async function createLessonsFromFiles(
  form: FormData,
): Promise<Result<{ created: { id: string; title: string; slug: string }[]; errors: string[] }>> {
  await requireAdmin();
  const courseId = String(form.get('courseId') || '');
  const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (!courseId) return { ok: false, error: 'Thiếu khóa học.' };
  if (files.length === 0) return { ok: false, error: 'Chưa chọn file.' };
  if (files.length > 30) return { ok: false, error: 'Mỗi lần tối đa 30 file.' };

  const created: { id: string; title: string; slug: string }[] = [];
  const errors: string[] = [];
  // Giữ thứ tự tên file (Bai-01, Bai-02…) để bài xếp đúng lộ trình.
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
  for (const file of sorted) {
    try {
      const imported = await importLessonFile(file);
      const title = (imported.title || file.name.replace(/\.[^.]+$/, '')).slice(0, 200);
      const last = await db.lesson.aggregate({ where: { courseId }, _max: { sortOrder: true } });
      const lesson = await db.lesson.create({
        data: {
          courseId,
          title,
          slug: await uniqueLessonSlug(courseId, title),
          sortOrder: (last._max.sortOrder ?? 0) + 10,
          content: imported.markdown,
        },
      });
      created.push({ id: lesson.id, title, slug: lesson.slug });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Không đọc được "${file.name}".`);
    }
  }
  if (created.length) await revalidateCourse(courseId);
  return { ok: true, data: { created, errors } };
}

// ---------------------------------------------------------------- Video, slide & tài liệu
// Trình duyệt upload thẳng lên R2 theo từng phần: startLessonUpload cấp link ký sẵn, sau đó
// completeLessonUpload ghép file và lưu vào bài học (hoặc abortLessonUpload nếu hủy).

export async function startLessonUpload(input: {
  lessonId: string;
  kind: UploadKind;
  filename: string;
  size: number;
}): Promise<Result<{ key: string; uploadId: string; partSize: number; urls: string[] }>> {
  await requireAdmin();
  if (!(input.kind in UPLOAD_RULES)) return { ok: false, error: 'Loại file không hợp lệ.' };
  const invalid = validateUpload(input.kind, input.filename, input.size);
  if (invalid) return { ok: false, error: invalid };
  if (!isR2Configured)
    return { ok: false, error: 'Chưa cấu hình Cloudflare R2 nên chưa upload được file.' };
  const courseId = await lessonCourseId(input.lessonId);
  const key = buildStorageKey(courseId, input.lessonId, input.kind, input.filename);
  const uploadId = await startMultipartUpload(key, contentTypeFor(input.filename));
  const urls = await presignUploadParts(key, uploadId, partCount(input.size));
  return { ok: true, data: { key, uploadId, partSize: PART_SIZE, urls } };
}

export async function abortLessonUpload(input: {
  lessonId: string;
  kind: UploadKind;
  key: string;
  uploadId: string;
}): Promise<Result> {
  await requireAdmin();
  const courseId = await lessonCourseId(input.lessonId);
  if (!keyBelongsTo(input.key, courseId, input.lessonId, input.kind))
    return { ok: false, error: 'File không thuộc bài học này.' };
  await abortMultipartUpload(input.key, input.uploadId);
  return { ok: true, data: null };
}

export type CompletedUpload =
  | { kind: 'video'; name: string; size: number }
  | { kind: 'slide'; name: string }
  | {
      kind: 'attachment';
      attachment: { id: string; label: string; filename: string; sizeBytes: number };
    };

export async function completeLessonUpload(input: {
  lessonId: string;
  kind: UploadKind;
  key: string;
  uploadId: string;
  filename: string;
  label?: string;
  parts: { partNumber: number; etag: string }[];
}): Promise<Result<CompletedUpload>> {
  await requireAdmin();
  const lesson = await db.lesson.findUnique({
    where: { id: input.lessonId },
    select: { courseId: true, slideKey: true, videoKey: true },
  });
  if (!lesson) return { ok: false, error: 'Không tìm thấy bài học.' };
  if (!keyBelongsTo(input.key, lesson.courseId, input.lessonId, input.kind))
    return { ok: false, error: 'File không thuộc bài học này.' };

  try {
    await completeMultipartUpload(input.key, input.uploadId, input.parts);
  } catch (error) {
    console.error('Complete upload failed:', error);
    await abortMultipartUpload(input.key, input.uploadId);
    return { ok: false, error: 'Không ghép được file trên R2 — vui lòng upload lại.' };
  }
  // Kích thước lấy từ R2 (không tin số liệu trình duyệt gửi lên).
  const size = await getObjectSize(input.key);
  const invalid =
    size === null
      ? 'Không tìm thấy file vừa upload.'
      : validateUpload(input.kind, input.filename, size);
  if (invalid) {
    await deleteFromStorage(input.key);
    return { ok: false, error: invalid };
  }
  const name = input.filename.slice(0, 200);

  let data: CompletedUpload;
  if (input.kind === 'video') {
    await db.lesson.update({
      where: { id: input.lessonId },
      data: { videoKey: input.key, videoName: name, videoSize: BigInt(size!) },
    });
    await deleteFromStorage(lesson.videoKey);
    data = { kind: 'video', name, size: size! };
  } else if (input.kind === 'slide') {
    await db.lesson.update({
      where: { id: input.lessonId },
      data: { slideKey: input.key, slideName: name },
    });
    await deleteFromStorage(lesson.slideKey);
    data = { kind: 'slide', name };
  } else {
    const last = await db.lessonAttachment.aggregate({
      where: { lessonId: input.lessonId },
      _max: { sortOrder: true },
    });
    const attachment = await db.lessonAttachment.create({
      data: {
        lessonId: input.lessonId,
        label: (input.label?.trim() || name).slice(0, 200),
        filename: name,
        storageKey: input.key,
        sizeBytes: size!,
        sortOrder: (last._max.sortOrder ?? 0) + 10,
      },
    });
    data = {
      kind: 'attachment',
      attachment: {
        id: attachment.id,
        label: attachment.label,
        filename: attachment.filename,
        sizeBytes: attachment.sizeBytes,
      },
    };
  }
  await revalidateCourse(lesson.courseId);
  return { ok: true, data };
}

export async function removeLessonVideo(lessonId: string): Promise<Result> {
  await requireAdmin();
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { videoKey: true },
  });
  await db.lesson.update({
    where: { id: lessonId },
    data: { videoKey: null, videoName: null, videoSize: null },
  });
  await deleteFromStorage(lesson?.videoKey);
  await revalidateCourse(await lessonCourseId(lessonId));
  return { ok: true, data: null };
}

export async function removeLessonSlide(lessonId: string): Promise<Result> {
  await requireAdmin();
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { slideKey: true },
  });
  await db.lesson.update({ where: { id: lessonId }, data: { slideKey: null, slideName: null } });
  await deleteFromStorage(lesson?.slideKey);
  await revalidateCourse(await lessonCourseId(lessonId));
  return { ok: true, data: null };
}

export async function deleteLessonAttachment(id: string): Promise<Result> {
  await requireAdmin();
  const attachment = await db.lessonAttachment.delete({ where: { id } });
  await deleteFromStorage(attachment.storageKey);
  await revalidateCourse(await lessonCourseId(attachment.lessonId));
  return { ok: true, data: null };
}

// ---------------------------------------------------------------- Bài tập

export async function createExercise(lessonId: string): Promise<Result<{ id: string }>> {
  await requireAdmin();
  const count = await db.exercise.count({ where: { lessonId } });
  const exercise = await db.exercise.create({
    data: {
      lessonId,
      title: `Bài tập ${count + 1}`,
      sortOrder: (count + 1) * 10,
      languages: ['cpp', 'python'],
    },
  });
  await revalidateCourse(await lessonCourseId(lessonId));
  return { ok: true, data: { id: exercise.id } };
}

const testCaseSchema = z.object({
  input: z.string().max(1_000_000, 'Input của test quá dài (tối đa 1 MB).'),
  expectedOutput: z.string().max(1_000_000, 'Output của test quá dài (tối đa 1 MB).'),
  isSample: z.boolean(),
});

const exerciseSchema = z.object({
  title: z.string().trim().min(1, 'Nhập tên bài tập.').max(200),
  statement: z.string().max(200_000, 'Đề bài quá dài.'),
  languages: z
    .array(z.string().refine(isLanguageKey, 'Ngôn ngữ không hợp lệ.'))
    .min(1, 'Chọn ít nhất một ngôn ngữ.'),
  starterCode: z.record(z.string().max(MAX_CODE_BYTES, 'Code mẫu quá dài.')),
  timeLimitMs: z.coerce
    .number()
    .int()
    .min(100, 'Giới hạn thời gian tối thiểu 100 ms.')
    .max(MAX_TIME_LIMIT_MS, `Giới hạn thời gian tối đa ${MAX_TIME_LIMIT_MS} ms.`),
  memoryLimitMb: z.coerce
    .number()
    .int()
    .min(16, 'Giới hạn bộ nhớ tối thiểu 16 MB.')
    .max(MAX_MEMORY_LIMIT_MB, `Giới hạn bộ nhớ tối đa ${MAX_MEMORY_LIMIT_MB} MB.`),
  testCases: z.array(testCaseSchema).max(100, 'Tối đa 100 test mỗi bài.'),
});

export type ExerciseInput = z.input<typeof exerciseSchema>;

/** Lưu toàn bộ bài tập, thay danh sách test bằng danh sách mới. */
export async function saveExercise(id: string, input: ExerciseInput): Promise<Result> {
  await requireAdmin();
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]!.message };
  const { testCases, starterCode, ...data } = parsed.data;
  const exercise = await db.exercise.findUnique({ where: { id }, select: { lessonId: true } });
  if (!exercise) return { ok: false, error: 'Không tìm thấy bài tập.' };
  // Chỉ giữ code mẫu của các ngôn ngữ đang cho phép.
  const allowed = new Set<string>(data.languages);
  const starter = Object.fromEntries(
    Object.entries(starterCode).filter(([lang, code]) => allowed.has(lang) && code.trim()),
  );
  await db.$transaction([
    db.exercise.update({ where: { id }, data: { ...data, starterCode: starter } }),
    db.testCase.deleteMany({ where: { exerciseId: id } }),
    db.testCase.createMany({
      data: testCases.map((test, index) => ({ ...test, exerciseId: id, sortOrder: index })),
    }),
  ]);
  await revalidateCourse(await lessonCourseId(exercise.lessonId));
  return { ok: true, data: null };
}

export async function deleteExercise(id: string): Promise<Result> {
  await requireAdmin();
  const exercise = await db.exercise.delete({ where: { id } });
  await revalidateCourse(await lessonCourseId(exercise.lessonId));
  return { ok: true, data: null };
}

/**
 * Chạy lời giải mẫu của admin với bộ test đang soạn (chưa cần lưu) — để kiểm tra đáp án các test
 * có đúng không trước khi cho học viên làm.
 */
export async function tryReferenceSolution(input: {
  language: string;
  code: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: { input: string; expectedOutput: string; isSample: boolean }[];
}): Promise<Result<GradeResult>> {
  await requireAdmin();
  if (!isLanguageKey(input.language)) return { ok: false, error: 'Ngôn ngữ không hợp lệ.' };
  if (!input.code.trim()) return { ok: false, error: 'Dán lời giải mẫu để chạy.' };
  const result = await gradeSubmission({
    runner: judgeRunner,
    exercise: {
      timeLimitMs: Math.min(Math.max(100, input.timeLimitMs), MAX_TIME_LIMIT_MS),
      memoryLimitMb: Math.min(Math.max(16, input.memoryLimitMb), MAX_MEMORY_LIMIT_MB),
    },
    // Admin xem được hết — coi mọi test như test mẫu để có thông báo lỗi chi tiết.
    tests: input.testCases.map((test) => ({ ...test, isSample: true })),
    language: input.language,
    code: input.code,
  });
  if (result.verdict === 'SYSTEM_ERROR') return { ok: false, error: result.message! };
  return { ok: true, data: result };
}

/** Chạy lời giải mẫu với từng input để tự điền output mong đợi cho các test. */
export async function generateExpectedOutputs(input: {
  language: string;
  code: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  inputs: string[];
}): Promise<Result<{ stdout: string; error: string | null }[]>> {
  await requireAdmin();
  if (!isLanguageKey(input.language)) return { ok: false, error: 'Ngôn ngữ không hợp lệ.' };
  if (!input.code.trim()) return { ok: false, error: 'Dán lời giải mẫu để chạy.' };
  if (input.inputs.length > 100) return { ok: false, error: 'Tối đa 100 test.' };
  const language = input.language;
  const limits = {
    timeLimitMs: Math.min(Math.max(100, input.timeLimitMs), MAX_TIME_LIMIT_MS),
    memoryLimitMb: Math.min(Math.max(16, input.memoryLimitMb), MAX_MEMORY_LIMIT_MB),
  };
  try {
    const outputs = await Promise.all(
      input.inputs.map(async (stdin) => {
        const result = await judgeRunner.run({ language, code: input.code, stdin, ...limits });
        return {
          stdout: result.stdout,
          error: result.status === 'OK' ? null : `${result.status}: ${result.stderr.slice(0, 500)}`,
        };
      }),
    );
    return { ok: true, data: outputs };
  } catch (error) {
    console.error('Generate outputs failed:', error);
    return { ok: false, error: 'Máy chấm đang bận hoặc gặp sự cố. Vui lòng thử lại.' };
  }
}

// ---------------------------------------------------------------- Học viên

export async function grantEnrollment(
  courseId: string,
  email: string,
): Promise<Result<{ id: string; email: string; name: string | null; createdAt: string }>> {
  await requireAdmin();
  const user = await db.user.findFirst({
    where: { email: { equals: email.trim(), mode: 'insensitive' } },
  });
  if (!user)
    return {
      ok: false,
      error: 'Chưa có tài khoản với email này — nhờ học viên đăng ký tài khoản trên web trước.',
    };
  const enrollment = await db.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    create: { userId: user.id, courseId },
    update: {},
  });
  await revalidateCourse(courseId);
  return {
    ok: true,
    data: {
      id: enrollment.id,
      email: user.email,
      name: user.name,
      createdAt: enrollment.createdAt.toISOString(),
    },
  };
}

export async function revokeEnrollment(id: string): Promise<Result> {
  await requireAdmin();
  const enrollment = await db.enrollment.delete({ where: { id } });
  await revalidateCourse(enrollment.courseId);
  return { ok: true, data: null };
}
