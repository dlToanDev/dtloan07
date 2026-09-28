import { db } from '@/lib/db';
import { computeCourseStats, type CourseStats } from '@/lib/courses/stats';

/**
 * Thống kê học viên cho nhiều khóa cùng lúc (bảng danh sách khóa + tab học viên).
 * Chỉ tính bài đã xuất bản và bài tập thuộc các bài đó.
 */
export async function loadCourseStats(courseIds: string[]): Promise<Map<string, CourseStats>> {
  if (courseIds.length === 0) return new Map();
  const [courses, progress, solved, lastSubs] = await Promise.all([
    db.course.findMany({
      where: { id: { in: courseIds } },
      select: {
        id: true,
        lessons: {
          where: { status: 'PUBLISHED' },
          select: { id: true, exercises: { select: { id: true } } },
        },
        enrollments: {
          select: { createdAt: true, user: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    db.lessonProgress.findMany({
      where: { lesson: { courseId: { in: courseIds } } },
      select: {
        userId: true,
        lessonId: true,
        completedAt: true,
        lesson: { select: { courseId: true } },
      },
    }),
    db.submission.findMany({
      where: { verdict: 'ACCEPTED', exercise: { lesson: { courseId: { in: courseIds } } } },
      distinct: ['userId', 'exerciseId'],
      select: {
        userId: true,
        exerciseId: true,
        exercise: { select: { lesson: { select: { courseId: true } } } },
      },
    }),
    db.submission.groupBy({
      by: ['userId', 'exerciseId'],
      where: { exercise: { lesson: { courseId: { in: courseIds } } } },
      _max: { createdAt: true },
    }),
  ]);

  // exerciseId → courseId để gom "lần nộp gần nhất" theo khóa.
  const exerciseCourse = new Map<string, string>();
  for (const course of courses)
    for (const lesson of course.lessons)
      for (const exercise of lesson.exercises) exerciseCourse.set(exercise.id, course.id);

  const result = new Map<string, CourseStats>();
  for (const course of courses) {
    const lastByUser = new Map<string, Date>();
    for (const row of lastSubs) {
      if (exerciseCourse.get(row.exerciseId) !== course.id || !row._max.createdAt) continue;
      const prev = lastByUser.get(row.userId);
      if (!prev || row._max.createdAt > prev) lastByUser.set(row.userId, row._max.createdAt);
    }
    result.set(
      course.id,
      computeCourseStats({
        lessonIds: course.lessons.map((lesson) => lesson.id),
        exerciseIds: course.lessons.flatMap((lesson) => lesson.exercises.map((e) => e.id)),
        students: course.enrollments.map((enrollment) => ({
          userId: enrollment.user.id,
          email: enrollment.user.email,
          name: enrollment.user.name,
          enrolledAt: enrollment.createdAt,
        })),
        progress: progress.filter((row) => row.lesson.courseId === course.id),
        solved: solved.filter((row) => row.exercise.lesson.courseId === course.id),
        lastSubmissionAt: [...lastByUser].map(([userId, at]) => ({ userId, at })),
      }),
    );
  }
  return result;
}
