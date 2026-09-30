import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { CourseTable } from '@/components/admin/courses/course-table';
import { loadCourseStats } from '@/lib/courses/admin-stats';

export const metadata: Metadata = { title: 'Khóa học - Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage() {
  const courses = await db.course.findMany({
    orderBy: { createdAt: 'desc' },
    include: { lessons: { select: { status: true } } },
  });
  const stats = await loadCourseStats(courses.map((course) => course.id));

  return (
    <CourseTable
      courses={courses.map((course) => {
        const s = stats.get(course.id);
        return {
          id: course.id,
          title: course.title,
          slug: course.slug,
          status: course.status,
          priceVnd: course.priceVnd,
          coverUrl: course.coverUrl,
          publishedLessons: course.lessons.filter((lesson) => lesson.status === 'PUBLISHED').length,
          totalLessons: course.lessons.length,
          plannedLessons: course.plannedLessons,
          contentComplete: Boolean(course.contentCompletedAt),
          students: s?.students.length ?? 0,
          completionPercent: s?.completionPercent ?? null,
          exercisePassPercent: s?.exercisePassPercent ?? null,
        };
      })}
    />
  );
}
