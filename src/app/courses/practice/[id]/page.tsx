import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Code2, ListChecks, CheckCircle2 } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { EditorContent } from '@/components/mdx/editor-content';
import { ExerciseWorkspace, type ExerciseView } from '@/components/courses/exercise-workspace';
import { QuizWorkspace, type QuizExerciseView } from '@/components/courses/quiz-workspace';
import { getPracticeExerciseDetail } from '@/server/actions/practice';
import { isLanguageKey, type LanguageKey } from '@/lib/judge/languages';
import type { QuestionGradeDetail } from '@/lib/courses/quiz';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getPracticeExerciseDetail(id).catch(() => null);
  if (!data) return { title: 'Bài tập luyện đề' };
  return {
    title: `${data.exercise.title} | Luyện đề miễn phí`,
    description: `Thực hành làm bài tập ${data.exercise.title} trực tuyến miễn phí trên dltoan07.`,
  };
}

export default async function PracticeDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getPracticeExerciseDetail(id);

  if (!data) {
    notFound();
  }

  const { exercise, solved, lastSubmission } = data;
  const isCode = exercise.type === 'CODE';

  const diffColor =
    exercise.difficulty === 'EASY'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      : exercise.difficulty === 'HARD'
        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';

  const diffText =
    exercise.difficulty === 'EASY'
      ? 'Dễ (Easy)'
      : exercise.difficulty === 'HARD'
        ? 'Nâng cao (Hard)'
        : 'Trung bình (Medium)';

  return (
    <Container className="space-y-6 py-6 sm:py-8">
      {/* THANH ĐIỀU HƯỚNG & HEADER BÀI TẬP */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/courses/practice"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Quay lại Kho luyện đề mở</span>
          </Link>

          <div className="flex items-center gap-2">
            {solved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" /> Đã hoàn thành
              </span>
            )}
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Miễn phí 100%
            </span>
          </div>
        </div>

        <div className="border-border bg-card space-y-3 rounded-2xl border p-5 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                isCode
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {isCode ? (
                <>
                  <Code2 className="size-3.5" /> Bài tập Lập trình (Code)
                </>
              ) : (
                <>
                  <ListChecks className="size-3.5" /> Đề thi Trắc nghiệm & Ngữ liệu
                </>
              )}
            </span>

            <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${diffColor}`}>
              {diffText}
            </span>

            {exercise.category && (
              <span className="bg-muted text-muted-foreground rounded-lg px-2.5 py-1 text-xs font-semibold">
                Chủ đề: {exercise.category}
              </span>
            )}

            {exercise.courseTitle && (
              <span className="text-muted-foreground text-xs font-medium">
                (Từ khóa: {exercise.courseTitle})
              </span>
            )}
          </div>

          <h1 className="text-foreground text-xl font-extrabold tracking-tight sm:text-2xl md:text-3xl">
            {exercise.title}
          </h1>
        </div>
      </div>

      {/* KHÔNG GIAN LÀM BÀI TẬP */}
      <div className="space-y-6">
        {isCode ? (
          /* BÀI TẬP LẬP TRÌNH CODE */
          <ExerciseWorkspace
            key={exercise.id}
            exercise={{
              id: exercise.id,
              title: exercise.title,
              languages: exercise.languages,
              starterCode: exercise.starterCode,
              timeLimitMs: exercise.timeLimitMs,
              memoryLimitMb: exercise.memoryLimitMb,
              samples: exercise.samples,
              totalTests: exercise.totalTests,
              passage: exercise.passage,
              audioUrl: exercise.audioUrl,
              imageUrl: exercise.imageUrl,
              videoUrl: exercise.videoUrl,
            }}
            index={1}
            solved={solved}
            lastSubmission={
              lastSubmission && isLanguageKey(lastSubmission.language)
                ? { language: lastSubmission.language, code: lastSubmission.code }
                : undefined
            }
            statement={
              exercise.statement.trim() ? (
                <EditorContent source={exercise.statement} className="text-sm" />
              ) : null
            }
          />
        ) : (
          /* BÀI TẬP TRẮC NGHIỆM & NGỮ LIỆU */
          <QuizWorkspace
            key={exercise.id}
            exercise={{
              id: exercise.id,
              title: exercise.title,
              statement: exercise.statement,
              passage: exercise.passage,
              audioUrl: exercise.audioUrl,
              imageUrl: exercise.imageUrl,
              videoUrl: exercise.videoUrl,
              questions: exercise.questions,
            }}
            index={1}
            solved={solved}
            lastResult={
              lastSubmission && lastSubmission.language === 'quiz'
                ? {
                    score: lastSubmission.passed,
                    total: lastSubmission.total,
                    passed: lastSubmission.verdict === 'ACCEPTED',
                    percent:
                      lastSubmission.total > 0
                        ? Math.round((lastSubmission.passed / lastSubmission.total) * 100)
                        : 0,
                    details: Array.isArray(lastSubmission.details)
                      ? (lastSubmission.details as unknown as QuestionGradeDetail[])
                      : [],
                  }
                : null
            }
          />
        )}
      </div>
    </Container>
  );
}
