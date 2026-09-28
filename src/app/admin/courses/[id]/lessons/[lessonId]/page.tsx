import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { LessonEditor } from '@/components/admin/courses/lesson-editor';
import { ExerciseList } from '@/components/admin/courses/exercise-editor';
import { isLanguageKey, type LanguageKey } from '@/lib/judge/languages';

export const dynamic = 'force-dynamic';

export default async function AdminLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      course: { select: { id: true, slug: true, title: true } },
      attachments: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      exercises: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: { testCases: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
      },
    },
  });
  if (!lesson || lesson.courseId !== id) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-1">
        <Link
          href={`/admin/courses/${id}?tab=lessons`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← {lesson.course.title}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          <Link
            href={`/courses/${lesson.course.slug}/${lesson.slug}`}
            target="_blank"
            className="text-primary text-sm hover:underline"
          >
            Xem như học viên ↗
          </Link>
        </div>
      </div>

      <LessonEditor
        courseSlug={lesson.course.slug}
        lesson={{
          id: lesson.id,
          title: lesson.title,
          slug: lesson.slug,
          status: lesson.status,
          isPreview: lesson.isPreview,
          content: lesson.content,
          videoUrl: lesson.videoUrl ?? '',
          videoFile: lesson.videoKey
            ? { name: lesson.videoName ?? 'video', size: Number(lesson.videoSize ?? 0) }
            : null,
          slideName: lesson.slideName,
          attachments: lesson.attachments.map(({ id: fileId, label, filename, sizeBytes }) => ({
            id: fileId,
            label,
            filename,
            sizeBytes,
          })),
        }}
      />

      <ExerciseList
        lessonId={lesson.id}
        initial={lesson.exercises.map((exercise) => ({
          id: exercise.id,
          title: exercise.title,
          statement: exercise.statement,
          languages: exercise.languages.filter(isLanguageKey),
          starterCode: (exercise.starterCode ?? {}) as Partial<Record<LanguageKey, string>>,
          timeLimitMs: exercise.timeLimitMs,
          memoryLimitMb: exercise.memoryLimitMb,
          testCases: exercise.testCases.map(({ input, expectedOutput, isSample }) => ({
            input,
            expectedOutput,
            isSample,
          })),
        }))}
      />
    </div>
  );
}
