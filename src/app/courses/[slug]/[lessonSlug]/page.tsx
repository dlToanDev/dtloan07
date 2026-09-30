import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft, ChevronRight, Download, FileText, Lock } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { buttonStyles } from '@/components/ui/button';
import { EditorContent } from '@/components/mdx/editor-content';
import { CompleteLessonButton } from '@/components/courses/course-actions';
import { ExerciseWorkspace, type ExerciseView } from '@/components/courses/exercise-workspace';
import { LessonList } from '@/components/courses/lesson-list';
import {
  ACCESS_MESSAGES,
  checkLessonAccess,
  getViewer,
  loadCourseOutline,
} from '@/lib/courses/access';
import { parseVideoEmbed } from '@/lib/courses/video';
import { isLanguageKey, type LanguageKey } from '@/lib/judge/languages';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string; lessonSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lessonSlug } = await params;
  const lesson = await db.lesson
    .findFirst({
      where: { slug: lessonSlug, course: { slug } },
      select: { title: true, course: { select: { title: true } } },
    })
    .catch(() => null);
  return lesson
    ? { title: `${lesson.title} · ${lesson.course.title}`, robots: { index: false } }
    : {};
}

const formatSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

export default async function LessonPage({ params }: Props) {
  const { slug, lessonSlug } = await params;
  const viewer = await getViewer();
  const outline = await loadCourseOutline(slug, viewer);
  if (!outline) notFound();
  const index = outline.lessons.findIndex((lesson) => lesson.slug === lessonSlug);
  if (index < 0) notFound();
  const summary = outline.lessons[index]!;

  const access = await checkLessonAccess(summary.id, viewer);
  if (!access.ok) {
    if (access.reason === 'login')
      redirect(`/login?callbackUrl=${encodeURIComponent(`/courses/${slug}/${lessonSlug}`)}`);
    if (access.reason === 'not-enrolled' || access.reason === 'upcoming')
      redirect(`/courses/${slug}`);
    if (access.reason === 'not-found') notFound();
    return (
      <Container className="max-w-xl space-y-4 py-24 text-center">
        <Lock className="text-muted-foreground mx-auto size-10" />
        <h1 className="text-xl font-bold">{summary.title}</h1>
        <p className="text-muted-foreground">{ACCESS_MESSAGES[access.reason]}</p>
        <Link href={`/courses/${slug}`} className={buttonStyles({ variant: 'outline' })}>
          Về danh sách bài
        </Link>
      </Container>
    );
  }

  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: summary.id },
    include: {
      attachments: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      exercises: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          testCases: {
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            select: { input: true, expectedOutput: true, isSample: true },
          },
        },
      },
    },
  });

  const exerciseIds = lesson.exercises.map((exercise) => exercise.id);
  const [solvedRows, latest] = await Promise.all([
    db.submission.findMany({
      where: { userId: viewer!.id, verdict: 'ACCEPTED', exerciseId: { in: exerciseIds } },
      select: { exerciseId: true },
      distinct: ['exerciseId'],
    }),
    db.submission.findMany({
      where: { userId: viewer!.id, exerciseId: { in: exerciseIds } },
      orderBy: { createdAt: 'desc' },
      distinct: ['exerciseId'],
      select: { exerciseId: true, language: true, code: true },
    }),
  ]);
  const solved = new Set(solvedRows.map((row) => row.exerciseId));
  const lastByExercise = new Map(latest.map((row) => [row.exerciseId, row]));

  const video = parseVideoEmbed(lesson.videoUrl);
  const state = outline.states.get(lesson.id);
  const prev = outline.lessons[index - 1];
  const next = outline.lessons[index + 1];
  const nextHref = next ? `/courses/${slug}/${next.slug}` : undefined;
  const allSolved = exerciseIds.length > 0 && exerciseIds.every((id) => solved.has(id));

  return (
    <Container className="grid gap-8 py-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="order-2 space-y-3 lg:sticky lg:top-24 lg:order-1 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
        <Link href={`/courses/${slug}`} className="block text-sm font-semibold hover:underline">
          {outline.course.title}
        </Link>
        <p className="text-muted-foreground text-xs">
          Đã xong {outline.completedCount}/{outline.lessons.length} bài
        </p>
        <LessonList
          compact
          courseSlug={slug}
          canOpen={outline.enrolled}
          currentId={lesson.id}
          lessons={outline.lessons.map((item) => ({
            id: item.id,
            slug: item.slug,
            title: item.title,
            status: item.status,
            exerciseCount: item._count.exercises,
            hasVideo: Boolean(item.videoUrl || item.videoKey),
            state: outline.states.get(item.id) ?? 'locked',
          }))}
        />
      </aside>

      <article className="order-1 min-w-0 space-y-8 lg:order-2">
        <header className="space-y-1">
          <p className="text-muted-foreground text-sm">Bài {index + 1}</p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{lesson.title}</h1>
          {lesson.status === 'DRAFT' && (
            <p className="text-sm text-amber-600">Bản nháp — chỉ admin nhìn thấy.</p>
          )}
        </header>

        {lesson.videoKey ? (
          <video
            controls
            controlsList="nodownload"
            preload="metadata"
            playsInline
            src={`/api/courses/files/video/${lesson.id}`}
            className="aspect-video w-full rounded-xl bg-black"
          />
        ) : (
          video && (
            <div className="aspect-video overflow-hidden rounded-xl bg-black">
              <iframe
                src={video.embedUrl}
                title={lesson.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )
        )}

        {lesson.content.trim() && <EditorContent source={lesson.content} />}

        {lesson.slideKey && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Slide bài giảng</h2>
              <a
                href={`/api/courses/files/slide/${lesson.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary text-sm hover:underline"
              >
                Mở toàn màn hình ↗
              </a>
            </div>
            <iframe
              src={`/api/courses/files/slide/${lesson.id}`}
              title="Slide bài giảng"
              className="border-border h-[70vh] w-full rounded-xl border"
            />
          </section>
        )}

        {lesson.attachments.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Tài liệu buổi học</h2>
            <ul className="border-border divide-border divide-y rounded-xl border">
              {lesson.attachments.map((file) => (
                <li key={file.id}>
                  <a
                    href={`/api/courses/files/attachment/${file.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 text-sm"
                  >
                    <FileText className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-medium">{file.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatSize(file.sizeBytes)}
                    </span>
                    <Download className="text-primary size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {lesson.exercises.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">Bài tập cuối bài</h2>
              <p className="text-muted-foreground text-sm">
                Làm đúng cả {lesson.exercises.length} bài tập để{' '}
                {next ? 'mở bài tiếp theo' : 'hoàn thành khóa học'}.
              </p>
            </div>
            {lesson.exercises.map((exercise, i) => {
              const languages = exercise.languages.filter(isLanguageKey);
              if (languages.length === 0) return null;
              const view: ExerciseView = {
                id: exercise.id,
                title: exercise.title,
                languages,
                starterCode: (exercise.starterCode ?? {}) as Partial<Record<LanguageKey, string>>,
                timeLimitMs: exercise.timeLimitMs,
                memoryLimitMb: exercise.memoryLimitMb,
                samples: exercise.testCases
                  .filter((test) => test.isSample)
                  .map(({ input, expectedOutput }) => ({ input, expectedOutput })),
                totalTests: exercise.testCases.length,
              };
              const last = lastByExercise.get(exercise.id);
              return (
                <ExerciseWorkspace
                  key={exercise.id}
                  exercise={view}
                  index={i + 1}
                  solved={solved.has(exercise.id)}
                  lastSubmission={
                    last && isLanguageKey(last.language)
                      ? { language: last.language, code: last.code }
                      : undefined
                  }
                  statement={
                    exercise.statement.trim() ? (
                      <EditorContent source={exercise.statement} className="text-sm" />
                    ) : null
                  }
                />
              );
            })}
          </section>
        )}

        <footer className="border-border flex flex-wrap items-center justify-between gap-4 border-t pt-6">
          {prev ? (
            <Link
              href={`/courses/${slug}/${prev.slug}`}
              className={buttonStyles({ variant: 'outline' })}
            >
              <ChevronLeft className="size-4" /> Bài trước
            </Link>
          ) : (
            <span />
          )}
          {state === 'completed' || allSolved ? (
            nextHref ? (
              <Link href={nextHref} className={buttonStyles()}>
                Bài tiếp theo <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className="font-semibold text-emerald-600">🎉 Bạn đã hoàn thành khóa học!</span>
            )
          ) : lesson.exercises.length === 0 ? (
            <CompleteLessonButton lessonId={lesson.id} nextHref={nextHref} />
          ) : (
            <span className="text-muted-foreground text-sm">
              Làm đúng hết bài tập để mở bài tiếp theo.
            </span>
          )}
        </footer>
      </article>
    </Container>
  );
}
