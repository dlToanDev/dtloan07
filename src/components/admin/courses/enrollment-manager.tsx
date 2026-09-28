'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { grantEnrollment, revokeEnrollment } from '@/server/actions/course-lessons';
import { safeAction } from '@/lib/courses/safe-action';
import { studentsToCsv, type StudentStats } from '@/lib/courses/stats';

export interface StudentRow extends Omit<StudentStats, 'enrolledAt' | 'lastActiveAt'> {
  enrollmentId: string;
  enrolledAt: string;
  lastActiveAt: string;
}

const date = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

function relative(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'hôm nay';
  if (days === 1) return 'hôm qua';
  if (days < 30) return `${days} ngày trước`;
  return date(iso);
}

function Progress({
  done,
  total,
  percent,
}: {
  done: number;
  total: number;
  percent: number | null;
}) {
  if (percent === null) return <span className="text-muted-foreground">–</span>;
  const tone = percent >= 70 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex min-w-32 items-center gap-2">
      <span className="w-12 tabular-nums">
        {done}/{total}
      </span>
      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
        <div className={`h-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="w-9 text-right tabular-nums">{percent}%</span>
    </div>
  );
}

/** Bảng học viên của khóa: tiến độ, bài tập đạt, cấp / thu quyền, xuất CSV mở bằng Excel. */
export function EnrollmentManager({
  courseId,
  courseTitle,
  initial,
}: {
  courseId: string;
  courseTitle: string;
  initial: StudentRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const grant = () =>
    startTransition(async () => {
      const result = await safeAction(() => grantEnrollment(courseId, email));
      if (!result.ok) return setError(result.error);
      setError('');
      setEmail('');
      // Lấy lại số liệu từ server; trang cha đặt key theo số học viên nên bảng dựng lại.
      router.refresh();
    });

  const revoke = (row: StudentRow) => {
    if (!window.confirm(`Thu quyền học của ${row.email}? Tiến độ và bài nộp vẫn được giữ.`)) return;
    startTransition(async () => {
      const result = await safeAction(() => revokeEnrollment(row.enrollmentId));
      if (!result.ok) return setError(result.error);
      setRows((prev) => prev.filter((item) => item.enrollmentId !== row.enrollmentId));
    });
  };

  const exportCsv = () => {
    const csv = studentsToCsv(
      courseTitle,
      rows.map((row) => ({
        ...row,
        enrolledAt: new Date(row.enrolledAt),
        lastActiveAt: new Date(row.lastActiveAt),
      })),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `hoc-vien-${courseTitle.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      <div className="border-border bg-card space-y-3 rounded-xl border p-4">
        <p className="text-sm">
          <span className="font-medium">Thêm học viên</span>{' '}
          <span className="text-muted-foreground">
            — khóa miễn phí học viên tự bấm “Bắt đầu học”; khóa trả phí nhập email tài khoản đã đăng
            ký trên web.
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            className="border-border bg-background max-w-sm flex-1 rounded-lg border px-3 py-2 text-sm"
            placeholder="email@hocvien.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') grant();
            }}
          />
          <Button type="button" onClick={grant} disabled={pending}>
            <UserPlus className="size-4" /> Cấp quyền học
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Học viên ({rows.length})</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={rows.length === 0}
        >
          <Download className="size-4" /> Tải CSV (mở bằng Excel)
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          Chưa có học viên nào.
        </p>
      ) : (
        <div className="border-border bg-card overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left text-xs font-medium">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:whitespace-nowrap">
                <th>Học viên</th>
                <th>Ngày vào học</th>
                <th>Bài học</th>
                <th>Bài tập đạt</th>
                <th>Hoạt động gần nhất</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((row) => (
                <tr key={row.enrollmentId} className="hover:bg-muted/30 [&>td]:px-4 [&>td]:py-2.5">
                  <td>
                    <p className="font-medium">{row.name || row.email}</p>
                    {row.name && <p className="text-muted-foreground text-xs">{row.email}</p>}
                  </td>
                  <td className="whitespace-nowrap tabular-nums">{date(row.enrolledAt)}</td>
                  <td>
                    <Progress
                      done={row.lessonsDone}
                      total={row.lessonsTotal}
                      percent={row.lessonsTotal ? row.lessonPercent : null}
                    />
                  </td>
                  <td>
                    <Progress
                      done={row.exercisesSolved}
                      total={row.exercisesTotal}
                      percent={row.exercisePercent}
                    />
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap">
                    {relative(row.lastActiveAt)}
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => revoke(row)}
                      className="text-muted-foreground hover:text-destructive rounded p-1.5"
                      title="Thu quyền học"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
