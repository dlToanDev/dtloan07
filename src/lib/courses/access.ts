import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { lessonStates, type LessonState } from '@/lib/courses/progress';

export interface Viewer {
  id: string;
  isAdmin: boolean;
}

export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, isAdmin: session.user.role === 'ADMIN' };
}

/**
 * Khóa học + danh sách bài + trạng thái mở khóa theo người xem. Admin thấy cả bài nháp và không
 * bị khóa; học viên chỉ thấy bài đã xuất bản. Trả về null nếu khóa không tồn tại / chưa mở.
 */
export async function loadCourseOutline(slug: string, viewer: Viewer | null) {
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      lessons: {
        where: viewer?.isAdmin ? {} : { status: 'PUBLISHED' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          isPreview: true,
          videoUrl: true,
          videoKey: true,
          _count: { select: { exercises: true } },
        },
      },
    },
  });
  if (!course) return null;
  if (!viewer?.isAdmin && course.status !== 'ACTIVE' && course.status !== 'UPCOMING') return null;

  const [enrollment, progress] = viewer
    ? await Promise.all([
        db.enrollment.findUnique({
          where: { userId_courseId: { userId: viewer.id, courseId: course.id } },
        }),
        db.lessonProgress.findMany({
          where: { userId: viewer.id, lesson: { courseId: course.id } },
          select: { lessonId: true },
        }),
      ])
    : [null, []];

  const completed = new Set(progress.map((p) => p.lessonId));
  const ids = course.lessons.map((lesson) => lesson.id);
  const states = lessonStates(ids, completed, Boolean(viewer?.isAdmin));
  return {
    course,
    lessons: course.lessons,
    enrolled: Boolean(enrollment) || Boolean(viewer?.isAdmin),
    completedCount: course.lessons.filter((lesson) => completed.has(lesson.id)).length,
    states,
  };
}

export type CourseOutline = NonNullable<Awaited<ReturnType<typeof loadCourseOutline>>>;

export type LessonAccessDenied = 'login' | 'not-found' | 'not-enrolled' | 'locked' | 'upcoming';

/**
 * Người xem có được học bài này không (dùng cho trang học, chạy / nộp code, tải tài liệu).
 * Luật: admin luôn được; học viên cần đăng nhập, khóa đang mở, bài đã xuất bản, đã ghi danh và
 * bài không bị khóa (bài trước đã hoàn thành).
 */
export async function checkLessonAccess(
  lessonId: string,
  viewer: Viewer | null,
): Promise<
  | { ok: true; lesson: { id: string; courseId: string; slug: string }; state: LessonState }
  | { ok: false; reason: LessonAccessDenied }
> {
  if (!viewer) return { ok: false, reason: 'login' };
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      slug: true,
      courseId: true,
      status: true,
      course: { select: { slug: true } },
    },
  });
  if (!lesson) return { ok: false, reason: 'not-found' };
  if (viewer.isAdmin) return { ok: true, lesson, state: 'available' };
  if (lesson.status !== 'PUBLISHED') return { ok: false, reason: 'not-found' };

  const outline = await loadCourseOutline(lesson.course.slug, viewer);
  if (!outline) return { ok: false, reason: 'not-found' };
  if (outline.course.status === 'UPCOMING') return { ok: false, reason: 'upcoming' };
  if (!outline.enrolled) return { ok: false, reason: 'not-enrolled' };
  const state = outline.states.get(lesson.id);
  if (!state || state === 'locked') return { ok: false, reason: 'locked' };
  return { ok: true, lesson, state };
}

export const ACCESS_MESSAGES: Record<LessonAccessDenied, string> = {
  login: 'Vui lòng đăng nhập để học.',
  'not-found': 'Không tìm thấy bài học.',
  'not-enrolled': 'Bạn chưa đăng ký khóa học này.',
  locked: 'Hoàn thành bài trước để mở bài này.',
  upcoming: 'Khóa học sắp mở, vui lòng quay lại sau.',
};
