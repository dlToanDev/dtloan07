import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { CourseInfoForm } from '@/components/admin/courses/course-info-form';
import { COURSE_STATUS } from '@/components/admin/courses/course-status';
import { LessonsManager } from '@/components/admin/courses/lessons-manager';
import { EnrollmentManager } from '@/components/admin/courses/enrollment-manager';
import { loadCourseStats } from '@/lib/courses/admin-stats';

export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'info', label: 'Thông tin' },
  { key: 'lessons', label: 'Bài học' },
  { key: 'students', label: 'Học viên' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default async function AdminCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  const course = await db.course.findUnique({
    where: { id },
    include: {
      lessons: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          videoUrl: true,
          videoKey: true,
          slideKey: true,
          _count: { select: { exercises: true } },
        },
      },
      enrollments: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });
  if (!course) notFound();

  // Khóa mới (chưa có bài) mở tab Thông tin trước; khóa đã có bài mở tab Bài học.
  const tab: Tab = TABS.some((t) => t.key === rawTab)
    ? (rawTab as Tab)
    : course.lessons.length === 0
      ? 'info'
      : 'lessons';
  const counts: Record<Tab, number | null> = {
    info: null,
    lessons: course.lessons.length,
    students: course.enrollments.length,
  };
  const status = COURSE_STATUS[course.status];

  const stats = tab === 'students' ? (await loadCourseStats([id])).get(id) : undefined;
  const enrollmentByUser = new Map(course.enrollments.map((e) => [e.user.id, e.id]));
  const published = course.lessons.filter((lesson) => lesson.status === 'PUBLISHED').length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Link href="/admin/courses" className="text-muted-foreground text-sm hover:underline">
          ← Khóa học
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
            ● {status.label}
          </span>
          <span className="text-muted-foreground text-sm">
            {published}/{course.plannedLessons ?? '?'} bài ·{' '}
            {course.contentCompletedAt ? (
              <span className="text-emerald-600">✓ đã soạn xong</span>
            ) : (
              <span className="text-amber-600">✎ đang soạn</span>
            )}
          </span>
          <Link
            href={`/courses/${course.slug}`}
            target="_blank"
            className="text-primary ml-auto text-sm hover:underline"
          >
            Xem trang khóa học ↗
          </Link>
        </div>
      </div>

      <nav className="border-border flex gap-1 border-b" aria-label="Quản lý khóa học">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/admin/courses/${id}?tab=${item.key}`}
            scroll={false}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === item.key
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            {item.label}
            {counts[item.key] !== null && (
              <span className="bg-muted ml-1.5 rounded-full px-1.5 py-0.5 text-xs">
                {counts[item.key]}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {tab === 'info' && (
        <CourseInfoForm
          course={{
            id: course.id,
            title: course.title,
            slug: course.slug,
            description: course.description,
            coverUrl: course.coverUrl ?? '',
            level: course.level,
            duration: course.duration ?? '',
            priceVnd: String(course.priceVnd),
            compareAtVnd: course.compareAtVnd === null ? '' : String(course.compareAtVnd),
            status: course.status,
            learnUrl: course.learnUrl ?? '',
            plannedLessons: course.plannedLessons === null ? '' : String(course.plannedLessons),
            contentComplete: Boolean(course.contentCompletedAt),
            publishedLessons: published,
          }}
        />
      )}

      {tab === 'lessons' && (
        <LessonsManager
          courseId={course.id}
          courseSlug={course.slug}
          initial={course.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            slug: lesson.slug,
            status: lesson.status,
            exerciseCount: lesson._count.exercises,
            hasVideo: Boolean(lesson.videoUrl || lesson.videoKey),
            hasSlide: Boolean(lesson.slideKey),
          }))}
        />
      )}

      {tab === 'students' && (
        <EnrollmentManager
          key={course.enrollments.map((e) => e.id).join()}
          courseId={course.id}
          courseTitle={course.title}
          initial={(stats?.students ?? []).map((student) => ({
            ...student,
            enrollmentId: enrollmentByUser.get(student.userId)!,
            enrolledAt: student.enrolledAt.toISOString(),
            lastActiveAt: student.lastActiveAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
