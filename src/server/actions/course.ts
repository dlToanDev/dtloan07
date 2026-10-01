'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { deleteFromStorage } from '@/lib/storage';
import { slugifyPostTitle } from '@/lib/utils';

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
  }
}

async function uniqueCourseSlug(title: string, excludeId?: string) {
  const base = slugifyPostTitle(title) || 'khoa-hoc';
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const hit = await db.course.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === excludeId) return slug;
  }
}

function revalidateCourse(slug?: string) {
  revalidatePath('/admin/courses', 'layout');
  revalidatePath('/courses');
  if (slug) revalidatePath(`/courses/${slug}`, 'layout');
  revalidateTag('courses');
}

const money = z.coerce
  .number()
  .int('Giá không hợp lệ.')
  .min(0, 'Giá không hợp lệ.')
  .max(2_147_483_647, 'Giá quá lớn.');

const courseSchema = z
  .object({
    title: z.string().trim().min(1, 'Nhập tên khóa học.').max(200, 'Tên tối đa 200 ký tự.'),
    // Để trống khi tạo mới = tự sinh từ tên.
    slug: z
      .string()
      .trim()
      .refine(
        (slug) => slug === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
        'Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang.',
      ),
    description: z.string().trim().max(5000, 'Mô tả tối đa 5000 ký tự.'),
    coverUrl: z
      .string()
      .trim()
      .max(500)
      .refine(
        (url) => !url || url.startsWith('/') || /^https?:\/\//.test(url),
        'Ảnh bìa không hợp lệ.',
      ),
    level: z.string().trim().max(100),
    duration: z.string().trim().max(100),
    priceVnd: money,
    compareAtVnd: z.union([z.literal(''), money]),
    status: z.enum(['DRAFT', 'ACTIVE', 'UPCOMING', 'ARCHIVED']),
    // Lộ trình: số bài dự kiến, '' = chưa xác định.
    plannedLessons: z.union([
      z.literal(''),
      z.coerce
        .number()
        .int('Số bài dự kiến phải là số nguyên.')
        .min(1, 'Số bài dự kiến tối thiểu 1.')
        .max(500, 'Số bài dự kiến tối đa 500.'),
    ]),
    contentComplete: z.boolean(),
    learnUrl: z
      .string()
      .trim()
      .max(500)
      .refine(
        (url) => !url || /^https?:\/\//.test(url),
        'Link học ngoài cần bắt đầu bằng http(s)://',
      ),
  })
  .refine((data) => data.compareAtVnd === '' || data.compareAtVnd > data.priceVnd, {
    message: 'Giá gốc (gạch ngang) phải lớn hơn học phí.',
  });

export type CourseInfoInput = z.input<typeof courseSchema>;

function courseData(data: z.infer<typeof courseSchema>, completedAt: Date | null) {
  return {
    title: data.title,
    description: data.description,
    coverUrl: data.coverUrl || null,
    level: data.level || 'Cơ bản đến Nâng cao',
    duration: data.duration || null,
    priceVnd: data.priceVnd,
    compareAtVnd: data.compareAtVnd === '' ? null : data.compareAtVnd,
    status: data.status,
    learnUrl: data.learnUrl || null,
    plannedLessons: data.plannedLessons === '' ? null : data.plannedLessons,
    contentCompletedAt: data.contentComplete ? (completedAt ?? new Date()) : null,
  };
}

/** Tạo khóa học từ trang "Thêm khóa học". */
export async function createCourse(input: CourseInfoInput): Promise<Result<{ id: string }>> {
  await requireAdmin();
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]!.message };
  const data = parsed.data;
  if (data.slug) {
    const clash = await db.course.findUnique({ where: { slug: data.slug }, select: { id: true } });
    if (clash) return { ok: false, error: 'Đường dẫn đã dùng cho khóa học khác.' };
  }
  const course = await db.course.create({
    data: { ...courseData(data, null), slug: data.slug || (await uniqueCourseSlug(data.title)) },
  });
  revalidateCourse(course.slug);
  return { ok: true, data: { id: course.id } };
}

export async function saveCourse(id: string, input: CourseInfoInput): Promise<Result> {
  await requireAdmin();
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]!.message };
  const data = parsed.data;
  const current = await db.course.findUnique({
    where: { id },
    select: { slug: true, contentCompletedAt: true },
  });
  if (!current) return { ok: false, error: 'Không tìm thấy khóa học.' };
  const slug = data.slug || (await uniqueCourseSlug(data.title, id));
  const clash = await db.course.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== id) return { ok: false, error: 'Đường dẫn đã dùng cho khóa học khác.' };

  await db.course.update({
    where: { id },
    data: { ...courseData(data, current.contentCompletedAt), slug },
  });
  revalidateCourse(current.slug);
  if (current.slug !== slug) revalidateCourse(slug);
  return { ok: true, data: null };
}

/** Đánh dấu nội dung khóa học đã soạn xong / quay lại "đang soạn". */
export async function setCourseContentComplete(id: string, complete: boolean): Promise<Result> {
  await requireAdmin();
  const course = await db.course
    .update({ where: { id }, data: { contentCompletedAt: complete ? new Date() : null } })
    .catch(() => null);
  if (!course) return { ok: false, error: 'Không tìm thấy khóa học.' };
  revalidateCourse(course.slug);
  return { ok: true, data: null };
}

/** Xóa khóa học cùng bài học, bài tập, bài nộp, ghi danh — và các file trên R2. */
export async function deleteCourse(id: string): Promise<Result> {
  await requireAdmin();
  const lessons = await db.lesson.findMany({
    where: { courseId: id },
    select: { videoKey: true, slideKey: true, attachments: { select: { storageKey: true } } },
  });
  const course = await db.course.delete({ where: { id } }).catch(() => null);
  if (!course) return { ok: false, error: 'Không tìm thấy khóa học.' };
  await Promise.all(
    lessons
      .flatMap((lesson) => [
        lesson.videoKey,
        lesson.slideKey,
        ...lesson.attachments.map((file) => file.storageKey),
      ])
      .map(deleteFromStorage),
  );
  revalidateCourse(course.slug);
  return { ok: true, data: null };
}
