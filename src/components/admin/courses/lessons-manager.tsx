'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Eye, FileUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, buttonStyles } from '@/components/ui/button';
import {
  createLesson,
  createLessonsFromFiles,
  deleteLesson,
  reorderLessons,
  toggleLessonStatus,
} from '@/server/actions/course-lessons';
import { moveItem } from '@/lib/shop/product-form';
import { safeAction } from '@/lib/courses/safe-action';

export interface AdminLessonRow {
  id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED';
  exerciseCount: number;
  hasVideo: boolean;
  hasSlide: boolean;
}

export function LessonsManager({
  courseId,
  courseSlug,
  initial,
}: {
  courseId: string;
  courseSlug: string;
  initial: AdminLessonRow[];
}) {
  const router = useRouter();
  const [lessons, setLessons] = useState(initial);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState('');
  const filesInput = useRef<HTMLInputElement>(null);

  /** Mỗi file Word / Markdown thành một bài (bản nháp), xếp theo tên file. */
  const importFiles = (files: FileList) =>
    startTransition(async () => {
      const form = new FormData();
      form.set('courseId', courseId);
      for (const file of Array.from(files)) form.append('files', file);
      const result = await safeAction(() => createLessonsFromFiles(form));
      if (filesInput.current) filesInput.current.value = '';
      if (!result.ok) return setError(result.error);
      setError(result.data.errors.join(' '));
      setLessons((prev) => [
        ...prev,
        ...result.data.created.map((lesson) => ({
          ...lesson,
          status: 'DRAFT' as const,
          exerciseCount: 0,
          hasVideo: false,
          hasSlide: false,
        })),
      ]);
      setNotice(
        result.data.created.length
          ? `Đã tạo ${result.data.created.length} bài từ file (bản nháp) — mở từng bài để kiểm tra rồi xuất bản.`
          : '',
      );
      router.refresh();
    });

  // Chưa nhập tên vẫn tạo được: "Bài 1", "Bài 2"…, đổi tên ở trang soạn bài.
  const add = () =>
    startTransition(async () => {
      const result = await safeAction(() =>
        createLesson(courseId, title.trim() || `Bài ${lessons.length + 1}`),
      );
      if (!result.ok) return setError(result.error);
      router.push(`/admin/courses/${courseId}/lessons/${result.data.id}`);
    });

  const move = (index: number, direction: -1 | 1) => {
    const next = moveItem(lessons, index, index + direction);
    setLessons(next);
    startTransition(async () => {
      const result = await safeAction(() =>
        reorderLessons(
          courseId,
          next.map((lesson) => lesson.id),
        ),
      );
      if (!result.ok) setError(result.error);
    });
  };

  const remove = (lesson: AdminLessonRow) => {
    if (!window.confirm(`Xóa "${lesson.title}" cùng toàn bộ bài tập và bài nộp của học viên?`))
      return;
    startTransition(async () => {
      const result = await safeAction(() => deleteLesson(lesson.id));
      if (!result.ok) return setError(result.error);
      setLessons((prev) => prev.filter((item) => item.id !== lesson.id));
    });
  };

  const handleToggleLessonStatus = (lesson: AdminLessonRow) => {
    startTransition(async () => {
      const result = await safeAction(() => toggleLessonStatus(lesson.id));
      if (!result.ok) return setError(result.error);
      setLessons((prev) =>
        prev.map((item) =>
          item.id === lesson.id ? { ...item, status: result.data.status } : item,
        ),
      );
      router.refresh();
    });
  };

  return (
    <section className="border-border bg-card space-y-4 rounded-xl border p-5">
      <div>
        <h2 className="font-semibold">Bài học ({lessons.length})</h2>
        <p className="text-muted-foreground text-sm">
          Học viên học lần lượt từ trên xuống; bài nháp không hiện với học viên.
        </p>
      </div>

      {lessons.length > 0 && (
        <ol className="border-border divide-border divide-y rounded-lg border">
          {lessons.map((lesson, index) => (
            <li key={lesson.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <div className="flex flex-col">
                <button
                  type="button"
                  disabled={index === 0 || pending}
                  onClick={() => move(index, -1)}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                  title="Lên trên"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === lessons.length - 1 || pending}
                  onClick={() => move(index, 1)}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                  title="Xuống dưới"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
                  className="font-medium hover:underline"
                >
                  Bài {index + 1}: {lesson.title}
                </Link>
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleLessonStatus(lesson)}
                    disabled={pending}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 font-medium transition ${
                      lesson.status === 'PUBLISHED'
                        ? 'bg-success/10 text-success hover:bg-success/20'
                        : 'bg-warning/10 text-warning hover:bg-warning/20'
                    }`}
                    title={
                      lesson.status === 'PUBLISHED'
                        ? 'Đã xuất bản (học viên học được). Bấm để chuyển về Nháp.'
                        : 'Bản nháp (học viên chưa thấy). Bấm để Xuất bản.'
                    }
                  >
                    ● {lesson.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Nháp'}
                  </button>
                  <span>·</span>
                  <span>{lesson.exerciseCount} bài tập</span>
                  {lesson.hasVideo && <span>· video</span>}
                  {lesson.hasSlide && <span>· slide</span>}
                </p>
              </div>
              <div className="flex gap-1">
                <Link
                  href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
                  className={buttonStyles({ variant: 'outline', size: 'sm' })}
                >
                  <Pencil className="size-4" /> Soạn
                </Link>
                <Link
                  href={`/courses/${courseSlug}/${lesson.slug}`}
                  target="_blank"
                  className={buttonStyles({ variant: 'ghost', size: 'sm' })}
                  title="Xem như học viên"
                >
                  <Eye className="size-4" />
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(lesson)}
                  className="hover:text-destructive"
                  title="Xóa bài"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          className="border-border bg-background max-w-md flex-1 rounded-lg border px-3 py-2 text-sm"
          placeholder={`Tên bài (để trống = "Bài ${lessons.length + 1}")`}
          value={title}
          maxLength={200}
          onChange={(event) => {
            setTitle(event.target.value);
            setError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') add();
          }}
        />
        <Button type="button" onClick={add} disabled={pending}>
          <Plus className="size-4" /> Thêm bài học
        </Button>
        <input
          ref={filesInput}
          type="file"
          multiple
          accept=".docx,.md,.markdown,.mdx"
          className="sr-only"
          onChange={(event) => event.target.files?.length && importFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => filesInput.current?.click()}
          disabled={pending}
          title="Chọn một hoặc nhiều file Word / Markdown — mỗi file thành một bài"
        >
          <FileUp className="size-4" /> {pending ? 'Đang xử lý…' : 'Tạo bài từ file'}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        “Tạo bài từ file”: chọn một hoặc nhiều file Word (.docx) / Markdown (.md, .mdx), mỗi file
        thành một bài, tên bài lấy từ tiêu đề trong file.
      </p>
      {notice && <p className="text-success text-sm">{notice}</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </section>
  );
}
