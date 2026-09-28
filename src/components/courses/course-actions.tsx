'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { completeLesson, enrollFreeCourse } from '@/server/actions/learn';

/** "Bắt đầu học" cho khóa miễn phí: ghi danh rồi vào bài đầu tiên. */
export function EnrollButton({
  courseId,
  firstLessonHref,
}: {
  courseId: string;
  firstLessonHref?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await enrollFreeCourse(courseId);
            if (!result.ok) return setError(result.error);
            if (firstLessonHref) router.push(firstLessonHref);
            else router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
        Bắt đầu học miễn phí
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** Bài không có bài tập: học viên tự đánh dấu hoàn thành để mở bài sau. */
export function CompleteLessonButton({
  lessonId,
  nextHref,
}: {
  lessonId: string;
  nextHref?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await completeLesson(lessonId);
            if (!result.ok) return setError(result.error);
            if (nextHref) router.push(nextHref);
            router.refresh();
          })
        }
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="size-4" />
        )}
        Hoàn thành bài học{nextHref ? ' & học bài tiếp' : ''}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
