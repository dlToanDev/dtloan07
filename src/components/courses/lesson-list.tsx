import Link from 'next/link';
import { CheckCircle2, Code2, Lock, PlayCircle } from 'lucide-react';
import type { LessonState } from '@/lib/courses/progress';

export interface LessonListItem {
  id: string;
  slug: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  exerciseCount: number;
  hasVideo: boolean;
  state: LessonState;
}

/** Danh sách bài của khóa với trạng thái ✓ / đang mở / 🔒. `canOpen` = đã ghi danh. */
export function LessonList({
  courseSlug,
  lessons,
  canOpen,
  currentId,
  compact = false,
}: {
  courseSlug: string;
  lessons: LessonListItem[];
  canOpen: boolean;
  currentId?: string;
  compact?: boolean;
}) {
  return (
    <ol className="border-border divide-border divide-y overflow-hidden rounded-xl border">
      {lessons.map((lesson, index) => {
        const open = canOpen && lesson.state !== 'locked';
        const Icon =
          lesson.state === 'completed'
            ? CheckCircle2
            : lesson.state === 'locked'
              ? Lock
              : PlayCircle;
        const body = (
          <>
            <Icon
              className={`size-4 shrink-0 ${
                lesson.state === 'completed'
                  ? 'text-emerald-500'
                  : lesson.state === 'locked'
                    ? 'text-muted-foreground'
                    : 'text-primary'
              }`}
            />
            <span className="min-w-0 flex-1">
              <span className={`block truncate ${compact ? 'text-sm' : 'font-medium'}`}>
                Bài {index + 1}: {lesson.title}
                {lesson.status === 'DRAFT' && (
                  <span className="ml-2 rounded bg-amber-500/15 px-1.5 text-xs text-amber-700">
                    Nháp
                  </span>
                )}
              </span>
              {!compact && (lesson.exerciseCount > 0 || lesson.hasVideo) && (
                <span className="text-muted-foreground flex gap-3 text-xs">
                  {lesson.hasVideo && <span>Video</span>}
                  {lesson.exerciseCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Code2 className="size-3" /> {lesson.exerciseCount} bài tập
                    </span>
                  )}
                </span>
              )}
            </span>
          </>
        );
        const cls = `flex items-center gap-3 px-4 ${compact ? 'py-2.5' : 'py-3'} ${
          lesson.id === currentId ? 'bg-primary/10' : ''
        }`;
        return (
          <li key={lesson.id}>
            {open ? (
              <Link
                href={`/courses/${courseSlug}/${lesson.slug}`}
                className={`${cls} hover:bg-muted/50`}
              >
                {body}
              </Link>
            ) : (
              <div className={`${cls} ${lesson.state === 'locked' ? 'opacity-60' : ''}`}>
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
