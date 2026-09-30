'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { Button, buttonStyles } from '@/components/ui/button';
import { ImagePicker } from '@/components/admin/shop/image-picker';
import { MoneyInput } from '@/components/admin/shop/money-input';
import { COURSE_STATUS } from '@/components/admin/courses/course-status';
import { createCourse, deleteCourse, saveCourse } from '@/server/actions/course';
import { safeAction } from '@/lib/courses/safe-action';

const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2 text-sm';
const LEVELS = ['Cơ bản', 'Trung cấp', 'Nâng cao', 'Cơ bản đến Nâng cao'];

export interface CourseInfoValue {
  /** Không có id = trang "Thêm khóa học". */
  id?: string;
  title: string;
  slug: string;
  description: string;
  coverUrl: string;
  level: string;
  duration: string;
  priceVnd: string;
  compareAtVnd: string;
  status: keyof typeof COURSE_STATUS;
  learnUrl: string;
  /** '' = chưa xác định. */
  plannedLessons: string;
  contentComplete: boolean;
  /** Số bài đã xuất bản (để hiện "5/12 bài"). */
  publishedLessons: number;
}

export const EMPTY_COURSE: CourseInfoValue = {
  title: '',
  slug: '',
  description: '',
  coverUrl: '',
  level: 'Cơ bản',
  duration: '',
  priceVnd: '0',
  compareAtVnd: '',
  status: 'DRAFT',
  learnUrl: '',
  plannedLessons: '',
  contentComplete: false,
  publishedLessons: 0,
};

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

function Choice({
  active,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-lg border p-3 text-left text-sm transition ${
        active
          ? 'border-primary bg-primary/5 ring-primary ring-1'
          : 'border-border hover:bg-muted/40'
      }`}
    >
      <span className="block font-semibold">{title}</span>
      <span className="text-muted-foreground text-xs">{hint}</span>
    </button>
  );
}

export function CourseInfoForm({ course }: { course: CourseInfoValue }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const creating = !course.id;
  const [value, setValue] = useState(course);
  const [planKnown, setPlanKnown] = useState(course.plannedLessons !== '');
  const [uploads, setUploads] = useState(0);
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const patch = (next: Partial<CourseInfoValue>) => setValue((prev) => ({ ...prev, ...next }));
  const busy = pending || uploads > 0;

  const save = () =>
    startTransition(async () => {
      // Ảnh bìa nằm trong input ẩn của ImagePicker.
      const coverUrl = String(new FormData(formRef.current!).get('coverUrl') ?? '');
      const input = {
        title: value.title,
        slug: value.slug,
        description: value.description,
        coverUrl,
        level: value.level,
        duration: value.duration,
        priceVnd: Number(value.priceVnd || 0),
        compareAtVnd: value.compareAtVnd === '' ? ('' as const) : Number(value.compareAtVnd),
        status: value.status,
        learnUrl: value.learnUrl,
        plannedLessons:
          planKnown && value.plannedLessons !== '' ? Number(value.plannedLessons) : ('' as const),
        contentComplete: value.contentComplete,
      };
      if (creating) {
        const result = await safeAction(() => createCourse(input));
        if (!result.ok) return setMessage({ tone: 'bad', text: result.error });
        router.push(`/admin/courses/${result.data.id}?tab=lessons`);
        return;
      }
      const result = await safeAction(() => saveCourse(course.id!, input));
      if (!result.ok) return setMessage({ tone: 'bad', text: result.error });
      setMessage({ tone: 'ok', text: 'Đã lưu thông tin khóa học.' });
      router.refresh();
    });

  const remove = () => {
    const typed = window.prompt(
      `Xóa khóa "${course.title}" cùng toàn bộ bài học, bài tập, bài nộp và video/tài liệu? Gõ XOA để xác nhận.`,
    );
    if (typed?.trim().toUpperCase() !== 'XOA') return;
    startTransition(async () => {
      const result = await safeAction(() => deleteCourse(course.id!));
      if (!result.ok) return setMessage({ tone: 'bad', text: result.error });
      router.replace('/admin/courses');
      router.refresh();
    });
  };

  const planned = planKnown && value.plannedLessons ? Number(value.plannedLessons) : null;

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="space-y-6"
    >
      <Card
        title="Giới thiệu khóa học"
        hint="Hiện ở trang giới thiệu khóa học và danh sách khóa học."
      >
        <label className="block space-y-1.5 text-sm font-medium">
          Tên khóa học
          <input
            className={`${inputClass} text-base font-semibold`}
            value={value.title}
            maxLength={200}
            required
            autoFocus={creating}
            placeholder="Ví dụ: Lập trình C++ cơ bản"
            onChange={(event) => patch({ title: event.target.value })}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          Đường dẫn <span className="text-muted-foreground">(để trống = tự tạo từ tên)</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground shrink-0 text-xs">/courses/</span>
            <input
              className={inputClass}
              value={value.slug}
              placeholder="lap-trinh-cpp-co-ban"
              onChange={(event) => patch({ slug: event.target.value })}
            />
          </div>
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Mô tả
          <textarea
            className={`${inputClass} font-normal`}
            rows={5}
            maxLength={5000}
            value={value.description}
            placeholder="Khóa học dành cho ai, học xong làm được gì, cần chuẩn bị gì…"
            onChange={(event) => patch({ description: event.target.value })}
          />
        </label>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Ảnh bìa</p>
          <ImagePicker
            defaultCover={course.coverUrl}
            defaultGallery={[]}
            max={1}
            onUploadStart={() => setUploads((n) => n + 1)}
            onUploadEnd={() => setUploads((n) => Math.max(0, n - 1))}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm">
            Trình độ
            <input
              className={inputClass}
              list="course-levels"
              value={value.level}
              onChange={(event) => patch({ level: event.target.value })}
            />
            <datalist id="course-levels">
              {LEVELS.map((level) => (
                <option key={level} value={level} />
              ))}
            </datalist>
          </label>
          <label className="block space-y-1.5 text-sm">
            Thời lượng <span className="text-muted-foreground">(tùy chọn)</span>
            <input
              className={inputClass}
              value={value.duration}
              placeholder="Ví dụ: 12 giờ video"
              onChange={(event) => patch({ duration: event.target.value })}
            />
          </label>
        </div>
      </Card>

      <Card title="Học phí">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium">
            Học phí
            <MoneyInput
              value={value.priceVnd}
              onChange={(priceVnd) => patch({ priceVnd })}
              placeholder="0 = Miễn phí"
              label="Học phí"
            />
            <span className="text-muted-foreground text-xs font-normal">
              {value.priceVnd === '' || value.priceVnd === '0'
                ? 'Miễn phí — học viên đăng nhập là tự đăng ký học được.'
                : 'Trả phí — cấp quyền học cho học viên ở tab “Học viên”.'}
            </span>
          </label>
          <label className="block space-y-1.5 text-sm">
            Giá gốc <span className="text-muted-foreground">(gạch ngang, tùy chọn)</span>
            <MoneyInput
              value={value.compareAtVnd}
              onChange={(compareAtVnd) => patch({ compareAtVnd })}
              placeholder="Không bắt buộc"
              label="Giá gốc"
            />
          </label>
        </div>
      </Card>

      <Card
        title="Lộ trình"
        hint="Dự kiến khóa học có bao nhiêu bài. Học viên thấy khóa đang cập nhật tới đâu."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice
            active={planKnown}
            title="Đã có lộ trình"
            hint="Biết trước số bài, ví dụ 12 bài."
            onClick={() => setPlanKnown(true)}
          />
          <Choice
            active={!planKnown}
            title="Chưa xác định"
            hint="Chưa ước tính được — vừa soạn vừa bổ sung."
            onClick={() => setPlanKnown(false)}
          />
        </div>
        {planKnown && (
          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
            Dự kiến
            <input
              type="number"
              min={1}
              max={500}
              className="border-border bg-background w-24 rounded-lg border px-3 py-2 text-sm"
              value={value.plannedLessons}
              placeholder="12"
              onChange={(event) => patch({ plannedLessons: event.target.value })}
            />
            bài
          </label>
        )}
        {!creating && (
          <div className="bg-muted/40 flex flex-wrap items-center gap-3 rounded-lg p-3 text-sm">
            <span className="min-w-0 flex-1">
              Đã xuất bản <b>{value.publishedLessons}</b>
              {planned ? ` / ${planned}` : ''} bài ·{' '}
              {value.contentComplete ? (
                <span className="font-medium text-emerald-600">✓ Đã soạn xong</span>
              ) : (
                <span className="font-medium text-amber-600">✎ Đang soạn</span>
              )}
            </span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-primary size-4"
                checked={value.contentComplete}
                onChange={(event) => patch({ contentComplete: event.target.checked })}
              />
              Đánh dấu đã soạn xong khóa học
            </label>
          </div>
        )}
      </Card>

      <Card title="Trạng thái">
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(COURSE_STATUS) as (keyof typeof COURSE_STATUS)[]).map((status) => (
            <Choice
              key={status}
              active={value.status === status}
              title={COURSE_STATUS[status].label}
              hint={COURSE_STATUS[status].hint}
              onClick={() => patch({ status })}
            />
          ))}
        </div>
        {value.status === 'ACTIVE' && value.publishedLessons === 0 && !value.learnUrl && (
          <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700">
            Khóa học chưa có bài học nào được xuất bản — thêm bài ở tab “Bài học” trước khi mở cho
            học viên.
          </p>
        )}
      </Card>

      <details className="border-border bg-card rounded-xl border p-5">
        <summary className="cursor-pointer font-semibold">Nâng cao</summary>
        <label className="mt-4 block space-y-1.5 text-sm">
          Link học ngoài <span className="text-muted-foreground">(tùy chọn)</span>
          <input
            className={inputClass}
            value={value.learnUrl}
            placeholder="https://… (YouTube playlist, Google Drive…)"
            onChange={(event) => patch({ learnUrl: event.target.value })}
          />
          <span className="text-muted-foreground text-xs">
            Chỉ dùng khi khóa học chưa có bài học trên web — nút “Xem khóa học” sẽ mở link này.
          </span>
        </label>
        {!creating && (
          <div className="border-border mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="text-sm">
              <p className="font-medium text-red-600">Xóa khóa học</p>
              <p className="text-muted-foreground text-xs">
                Xóa vĩnh viễn bài học, bài tập, bài nộp, tiến độ học viên và video / tài liệu trên
                R2.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={remove}
              disabled={busy}
              className="text-red-600"
            >
              <Trash2 className="size-4" /> Xóa khóa học
            </Button>
          </div>
        )}
      </details>

      <div className="border-border bg-background/95 sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-t-xl sm:border-x">
        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            message?.tone === 'bad' ? 'text-red-600' : 'text-muted-foreground'
          }`}
        >
          {busy ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-4 animate-spin" /> Đang xử lý…
            </span>
          ) : (
            (message?.text ??
            (creating
              ? 'Tạo xong sẽ chuyển sang phần thêm bài học.'
              : `Trạng thái: ${COURSE_STATUS[value.status].label}`))
          )}
        </span>
        {creating ? (
          <Link href="/admin/courses" className={buttonStyles({ variant: 'ghost' })}>
            Hủy
          </Link>
        ) : (
          <Link
            href={`/courses/${course.slug}`}
            target="_blank"
            className={buttonStyles({ variant: 'ghost' })}
          >
            Xem trang ↗
          </Link>
        )}
        <Button
          type="submit"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={busy}
        >
          {creating ? 'Tạo khóa học' : 'Lưu thông tin'}
        </Button>
      </div>
    </form>
  );
}
