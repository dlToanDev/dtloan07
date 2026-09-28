'use client';

import { useRef, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { FileText, FileUp, Film, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadButton } from '@/components/admin/courses/direct-upload';
import {
  deleteLessonAttachment,
  importLessonContent,
  removeLessonSlide,
  removeLessonVideo,
  updateLesson,
} from '@/server/actions/course-lessons';
import { parseVideoEmbed } from '@/lib/courses/video';
import { safeAction } from '@/lib/courses/safe-action';

const RichTextEditor = dynamic(
  () => import('@/components/admin/rich-text-editor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => <p className="text-muted-foreground p-6 text-sm">Đang tải trình soạn thảo…</p>,
  },
);

const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2 text-sm';

export interface LessonEditorValue {
  id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED';
  isPreview: boolean;
  content: string;
  videoUrl: string;
  /** Video tự upload (ưu tiên hơn link). */
  videoFile: { name: string; size: number } | null;
  slideName: string | null;
  attachments: { id: string; label: string; filename: string; sizeBytes: number }[];
}

const formatSize = (bytes: number) =>
  bytes > 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(2)} GB`
    : bytes > 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.ceil(bytes / 1024)} KB`;

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-card space-y-4 rounded-xl border p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function LessonEditor({
  lesson,
  courseSlug,
}: {
  lesson: LessonEditorValue;
  courseSlug: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(lesson);
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [uploads, setUploads] = useState(0);
  const [pending, startTransition] = useTransition();
  const [fileLabel, setFileLabel] = useState('');
  const [videoMode, setVideoMode] = useState<'link' | 'file'>(lesson.videoFile ? 'file' : 'link');
  const busy = pending || uploads > 0;
  const trackUpload = (on: boolean) => setUploads((n) => Math.max(0, n + (on ? 1 : -1)));
  const fail = (text: string) => setMessage({ tone: 'bad', text });
  const importInput = useRef<HTMLInputElement>(null);

  /** Nhập nội dung từ file Word / Markdown / MDX vào trình soạn thảo (chưa lưu). */
  const importContent = (file: File) => {
    if (
      value.content.trim() &&
      !window.confirm(
        'Thay nội dung hiện tại bằng nội dung trong file? (Chưa lưu cho tới khi bấm Lưu)',
      )
    ) {
      if (importInput.current) importInput.current.value = '';
      return;
    }
    // Không dùng startTransition: nội dung editor là state "khẩn" — nếu để trong transition, React
    // có thể áp lại cập nhật này chồng lên cập nhật của editor và hai bên ghi đè nhau.
    setUploads((n) => n + 1);
    const form = new FormData();
    form.set('file', file);
    void safeAction(() => importLessonContent(form)).then((result) => {
      setUploads((n) => Math.max(0, n - 1));
      if (importInput.current) importInput.current.value = '';
      if (!result.ok) return fail(result.error);
      // Tên bài còn là tên mặc định ("Bài 3") thì lấy tiêu đề trong file.
      const useTitle = result.data.title && /^Bài \d+$/.test(value.title.trim());
      patch({ content: result.data.markdown, ...(useTitle && { title: result.data.title! }) });
      setMessage({
        tone: 'ok',
        text: `Đã nhập nội dung từ "${file.name}"${
          result.data.images ? ` (${result.data.images} ảnh)` : ''
        } — kiểm tra lại rồi bấm Lưu.`,
      });
    });
  };

  const patch = (next: Partial<LessonEditorValue>) => setValue((prev) => ({ ...prev, ...next }));
  const video = parseVideoEmbed(value.videoUrl);

  const save = (status = value.status) =>
    startTransition(async () => {
      const result = await safeAction(() =>
        updateLesson(value.id, {
          title: value.title,
          slug: value.slug,
          status,
          isPreview: value.isPreview,
          content: value.content,
          videoUrl: value.videoUrl,
        }),
      );
      if (!result.ok) return setMessage({ tone: 'bad', text: result.error });
      patch({ status });
      setMessage({ tone: 'ok', text: status === 'PUBLISHED' ? 'Đã lưu & xuất bản.' : 'Đã lưu.' });
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <Card title="Thông tin bài học">
        <label className="block space-y-1.5 text-sm font-medium">
          Tên bài
          <input
            className={`${inputClass} text-base font-semibold`}
            value={value.title}
            maxLength={200}
            onChange={(event) => patch({ title: event.target.value })}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          Đường dẫn
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground shrink-0 text-xs">/courses/{courseSlug}/</span>
            <input
              className={inputClass}
              value={value.slug}
              onChange={(event) => patch({ slug: event.target.value })}
            />
          </div>
        </label>
      </Card>

      <Card
        title="Video bài giảng"
        hint="Dán link YouTube / Vimeo, hoặc tải file video lên (chỉ học viên của khóa xem được)."
      >
        <div className="bg-muted/40 inline-flex rounded-lg p-1 text-sm">
          {(
            [
              ['link', 'Link YouTube / Vimeo'],
              ['file', 'Tải file video lên'],
            ] as const
          ).map(([mode, text]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setVideoMode(mode)}
              className={`rounded-md px-3 py-1.5 font-medium ${
                videoMode === mode ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        {videoMode === 'link' ? (
          <>
            {value.videoFile && (
              <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700">
                Bài đang có video tải lên ({value.videoFile.name}) — video tải lên được ưu tiên hiển
                thị. Gỡ video đó ở tab “Tải file video lên” nếu muốn dùng link.
              </p>
            )}
            <input
              className={inputClass}
              value={value.videoUrl}
              placeholder="https://www.youtube.com/watch?v=…"
              onChange={(event) => patch({ videoUrl: event.target.value })}
            />
            {value.videoUrl && !video && (
              <p className="text-sm text-red-600">Link chưa đúng — cần link YouTube hoặc Vimeo.</p>
            )}
            {video && (
              <div className="aspect-video max-w-xl overflow-hidden rounded-lg bg-black">
                <iframe
                  src={video.embedUrl}
                  title="Xem trước video"
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            {value.videoFile && (
              <>
                <div className="border-border flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                  <Film className="text-primary size-4" />
                  <span className="min-w-0 flex-1 truncate">{value.videoFile.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatSize(value.videoFile.size)}
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    title="Gỡ video"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm('Gỡ và xóa video này khỏi R2?')) return;
                      startTransition(async () => {
                        const result = await safeAction(() => removeLessonVideo(value.id));
                        if (!result.ok) return fail(result.error);
                        patch({ videoFile: null });
                      });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <video
                  controls
                  preload="metadata"
                  src={`/api/courses/files/video/${value.id}`}
                  className="aspect-video w-full max-w-xl rounded-lg bg-black"
                />
              </>
            )}
            <UploadButton
              lessonId={value.id}
              kind="video"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.m4v,.webm,.mov"
              label={value.videoFile ? 'Thay video khác' : 'Chọn file video (MP4, tối đa 5 GB)'}
              onBusyChange={trackUpload}
              onError={fail}
              onDone={(result) => {
                if (result.kind !== 'video') return;
                patch({ videoFile: { name: result.name, size: result.size } });
                setMessage({ tone: 'ok', text: 'Đã tải video lên.' });
              }}
            />
            <p className="text-muted-foreground text-xs">
              Nên dùng MP4 (H.264) để mọi trình duyệt phát được. Upload thẳng lên R2, có thể đóng
              tab khác nhưng giữ trang này mở tới khi xong.
            </p>
          </div>
        )}
      </Card>

      <Card
        title="Nội dung bài giảng"
        hint="Gõ trực tiếp, hoặc nhập từ file Word (.docx) / Markdown (.md, .mdx) — giữ tiêu đề, in đậm, danh sách, bảng, ảnh, code."
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={importInput}
            type="file"
            accept=".docx,.md,.markdown,.mdx"
            className="sr-only"
            onChange={(event) => event.target.files?.[0] && importContent(event.target.files[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => importInput.current?.click()}
          >
            <FileUp className="size-4" /> Nhập từ file Word / Markdown
          </Button>
          <span className="text-muted-foreground text-xs">
            File .doc cũ: mở bằng Word rồi “Lưu thành” .docx.
          </span>
        </div>
        <RichTextEditor
          value={value.content}
          onChange={(content) => patch({ content })}
          onError={(text) => setMessage({ tone: 'bad', text })}
          onUploadStart={() => setUploads((n) => n + 1)}
          onUploadEnd={() => setUploads((n) => Math.max(0, n - 1))}
        />
      </Card>

      <Card
        title="Slide & tài liệu tải về"
        hint="Slide PDF hiện ngay trong trang học (xuất từ PowerPoint / Google Slides ra PDF, tối đa 100 MB). Tài liệu là file học viên tải về (tối đa 500 MB)."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Slide (PDF)</p>
          {value.slideName && (
            <div className="border-border flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
              <FileText className="text-primary size-4" />
              <span className="min-w-0 flex-1 truncate">{value.slideName}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                title="Gỡ slide"
                disabled={busy}
                onClick={() =>
                  startTransition(async () => {
                    const result = await safeAction(() => removeLessonSlide(value.id));
                    if (!result.ok) return fail(result.error);
                    patch({ slideName: null });
                  })
                }
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          )}
          <UploadButton
            lessonId={value.id}
            kind="slide"
            accept="application/pdf,.pdf"
            label={value.slideName ? 'Đổi slide' : 'Tải slide PDF lên'}
            onBusyChange={trackUpload}
            onError={fail}
            onDone={(result) => {
              if (result.kind !== 'slide') return;
              patch({ slideName: result.name });
              setMessage({ tone: 'ok', text: 'Đã tải slide lên.' });
            }}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Tài liệu tải về</p>
          {value.attachments.length > 0 && (
            <ul className="border-border divide-border divide-y rounded-lg border text-sm">
              {value.attachments.map((file) => (
                <li key={file.id} className="flex items-center gap-3 px-3 py-2">
                  <Paperclip className="text-muted-foreground size-4" />
                  <span className="min-w-0 flex-1 truncate">
                    {file.label}
                    {file.label !== file.filename && (
                      <span className="text-muted-foreground"> · {file.filename}</span>
                    )}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatSize(file.sizeBytes)}
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    title="Xóa tài liệu"
                    disabled={busy}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await safeAction(() => deleteLessonAttachment(file.id));
                        if (!result.ok) return fail(result.error);
                        patch({
                          attachments: value.attachments.filter((item) => item.id !== file.id),
                        });
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-start gap-2">
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Tên hiển thị (tùy chọn), vd: Slide buổi 1"
              value={fileLabel}
              onChange={(event) => setFileLabel(event.target.value)}
            />
            <UploadButton
              lessonId={value.id}
              kind="attachment"
              label="Thêm tài liệu"
              fileLabel={fileLabel}
              onBusyChange={trackUpload}
              onError={fail}
              onDone={(result) => {
                if (result.kind !== 'attachment') return;
                patch({ attachments: [...value.attachments, result.attachment] });
                setFileLabel('');
              }}
            />
          </div>
        </div>
      </Card>

      <div className="border-border bg-background/95 sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-t-xl sm:border-x">
        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            message?.tone === 'bad' ? 'text-red-600' : 'text-muted-foreground'
          }`}
        >
          {pending || uploads > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-4 animate-spin" /> Đang xử lý…
            </span>
          ) : (
            (message?.text ?? (value.status === 'PUBLISHED' ? 'Đang xuất bản' : 'Bản nháp'))
          )}
        </span>
        <Button type="button" variant="outline" disabled={busy} onClick={() => save('DRAFT')}>
          {value.status === 'PUBLISHED' ? 'Chuyển về nháp' : 'Lưu nháp'}
        </Button>
        <Button
          type="button"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={busy}
          onClick={() => save('PUBLISHED')}
        >
          {value.status === 'PUBLISHED' ? 'Lưu' : 'Lưu & xuất bản'}
        </Button>
      </div>
    </div>
  );
}
