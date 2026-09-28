import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Clock3, GraduationCap, MessageCircle, PlayCircle } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { EnrollButton } from '@/components/courses/course-actions';
import { LessonList } from '@/components/courses/lesson-list';
import { getViewer, loadCourseOutline } from '@/lib/courses/access';
import { nextLessonId } from '@/lib/courses/progress';
import { buildMetadata } from '@/lib/seo';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await db.course
    .findUnique({ where: { slug }, select: { title: true, description: true } })
    .catch(() => null);
  if (!course) return {};
  return buildMetadata({
    title: course.title,
    description: course.description.slice(0, 160),
    pathname: `/courses/${slug}`,
  });
}

const formatVnd = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const viewer = await getViewer();
  const outline = await loadCourseOutline(slug, viewer);
  if (!outline) notFound();
  const { course, lessons, enrolled, completedCount, states } = outline;

  const upcoming = course.status === 'UPCOMING';
  const ids = lessons.map((lesson) => lesson.id);
  const next = lessons.find((lesson) => lesson.id === nextLessonId(ids, states));
  const firstHref = lessons[0] ? `/courses/${slug}/${lessons[0].slug}` : undefined;
  const percent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

  let cta: React.ReactNode;
  if (upcoming) {
    cta = <Badge variant="secondary">Sắp mở — quay lại sau nhé</Badge>;
  } else if (lessons.length === 0 && course.learnUrl) {
    cta = (
      <a
        href={course.learnUrl}
        target="_blank"
        rel="noreferrer"
        className={buttonStyles({ size: 'lg' })}
      >
        <PlayCircle className="size-4" /> Xem khóa học
      </a>
    );
  } else if (enrolled && next) {
    cta = (
      <Link href={`/courses/${slug}/${next.slug}`} className={buttonStyles({ size: 'lg' })}>
        <PlayCircle className="size-4" />
        {completedCount === 0 ? 'Vào học bài 1' : `Học tiếp: ${next.title}`}
      </Link>
    );
  } else if (!viewer) {
    cta = (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(`/courses/${slug}`)}`}
        className={buttonStyles({ size: 'lg' })}
      >
        Đăng nhập để học
      </Link>
    );
  } else if (course.priceVnd === 0) {
    cta = <EnrollButton courseId={course.id} firstLessonHref={firstHref} />;
  } else {
    cta = (
      <Link href="/about#lien-he" className={buttonStyles({ size: 'lg' })}>
        <MessageCircle className="size-4" /> Liên hệ đăng ký
      </Link>
    );
  }

  return (
    <Container className="grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-8">
        <div className="space-y-4">
          <Link href="/courses" className="text-muted-foreground text-sm hover:underline">
            ← Khóa học
          </Link>
          {course.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.coverUrl}
              alt={course.title}
              className="border-border aspect-video w-full rounded-xl border object-cover"
            />
          )}
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{course.title}</h1>
          <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="size-4" /> {course.level}
            </span>
            {course.duration && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4" /> {course.duration}
              </span>
            )}
            {(lessons.length > 0 || course.plannedLessons) && (
              <span>
                {course.contentCompletedAt
                  ? `${lessons.length} bài học · đã hoàn thành`
                  : `${lessons.length}${course.plannedLessons ? `/${course.plannedLessons}` : ''} bài học · đang cập nhật`}
              </span>
            )}
          </div>
          {course.description && (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {course.description}
            </p>
          )}
        </div>

        {lessons.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold">Nội dung khóa học</h2>
            <LessonList
              courseSlug={slug}
              canOpen={enrolled}
              lessons={lessons.map((lesson) => ({
                id: lesson.id,
                slug: lesson.slug,
                title: lesson.title,
                status: lesson.status,
                exerciseCount: lesson._count.exercises,
                hasVideo: Boolean(lesson.videoUrl || lesson.videoKey),
                state: states.get(lesson.id) ?? 'locked',
              }))}
            />
            <p className="text-muted-foreground text-xs">
              Làm đúng hết bài tập cuối mỗi bài để mở bài tiếp theo.
            </p>
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border-border bg-card space-y-4 rounded-xl border p-5">
          <div className="text-2xl font-extrabold">
            {course.priceVnd === 0 ? 'Miễn phí' : formatVnd(course.priceVnd)}
            {course.compareAtVnd && course.compareAtVnd > course.priceVnd && (
              <span className="text-muted-foreground ml-2 text-base font-normal line-through">
                {formatVnd(course.compareAtVnd)}
              </span>
            )}
          </div>
          {enrolled && lessons.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>Tiến độ</span>
                <span className="font-medium">
                  {completedCount}/{lessons.length} bài
                </span>
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} />
              </div>
            </div>
          )}
          {cta}
        </div>
      </aside>
    </Container>
  );
}
