'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2, Pause, Play, Plus } from 'lucide-react';
import { Button, buttonStyles } from '@/components/ui/button';
import { COURSE_STATUS } from '@/components/admin/courses/course-status';
import { toggleCourseStatus } from '@/server/actions/course';

export interface CourseRow {
  id: string;
  title: string;
  slug: string;
  status: keyof typeof COURSE_STATUS;
  priceVnd: number;
  coverUrl: string | null;
  publishedLessons: number;
  totalLessons: number;
  plannedLessons: number | null;
  contentComplete: boolean;
  students: number;
  completionPercent: number | null;
  exercisePassPercent: number | null;
}

function Percent({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">–</span>;
  const tone = value >= 70 ? 'bg-success' : value >= 40 ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="flex min-w-24 items-center gap-2">
      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
        <div className={`h-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-9 text-right tabular-nums">{value}%</span>
    </div>
  );
}

/** Bảng quản lý mọi khóa học (kiểu bảng tính), hỗ trợ nút Phát hành / Tạm dừng trực tiếp. */
export function CourseTable({ courses: initialCourses }: { courses: CourseRow[] }) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggleStatus = async (
    course: CourseRow,
    targetStatus?: keyof typeof COURSE_STATUS,
  ) => {
    const nextStatus = targetStatus ?? (course.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE');
    setLoadingId(course.id);

    try {
      const res = await toggleCourseStatus(course.id, nextStatus);
      if (res.ok) {
        setCourses((prev) =>
          prev.map((c) => (c.id === course.id ? { ...c, status: res.data.status } : c)),
        );
        router.refresh();
      } else {
        alert(res.error);
      }
    } catch {
      alert('Không thể cập nhật trạng thái khóa học.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Khóa học</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý khóa học, phát hành, tạm dừng, lộ trình và tỷ lệ làm bài đạt.
          </p>
        </div>
        <Link href="/admin/courses/new" className={buttonStyles()}>
          <Plus className="size-4" /> Thêm khóa học
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Chưa có khóa học nào.{' '}
          <Link href="/admin/courses/new" className="text-primary font-medium hover:underline">
            Thêm khóa học đầu tiên
          </Link>
        </div>
      ) : (
        <div className="border-border bg-card overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[950px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left text-xs font-medium">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:whitespace-nowrap">
                <th>Khóa học</th>
                <th>Trạng thái</th>
                <th className="text-right">Học phí</th>
                <th>Lộ trình</th>
                <th className="text-right">Học viên</th>
                <th>Hoàn thành TB</th>
                <th>Bài tập đạt</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {courses.map((course) => {
                const status = COURSE_STATUS[course.status];
                const href = `/admin/courses/${course.id}`;
                const isActive = course.status === 'ACTIVE';
                const isLoading = loadingId === course.id;

                return (
                  <tr key={course.id} className="hover:bg-muted/30 [&>td]:px-4 [&>td]:py-3">
                    <td>
                      <Link href={href} className="flex items-center gap-3">
                        {course.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={course.coverUrl}
                            alt=""
                            className="size-10 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
                            <BookOpen className="text-muted-foreground size-5" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="line-clamp-2 font-medium hover:underline">
                            {course.title}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            /courses/{course.slug}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(course)}
                        disabled={isLoading}
                        className={`group inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${status.className} hover:ring-1 hover:ring-current`}
                        title={
                          isActive
                            ? 'Đang mở (học viên truy cập được). Bấm để TẠM DỪNG.'
                            : 'Đang tạm dừng / nháp. Bấm để PHÁT HÀNH (mở lại).'
                        }
                      >
                        {isLoading ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : isActive ? (
                          <span className="bg-success size-1.5 animate-pulse rounded-full" />
                        ) : (
                          <span>●</span>
                        )}
                        <span>{status.label}</span>
                      </button>
                    </td>
                    <td className="text-right whitespace-nowrap tabular-nums">
                      {course.priceVnd === 0
                        ? 'Miễn phí'
                        : `${course.priceVnd.toLocaleString('vi-VN')} đ`}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="tabular-nums">
                        {course.publishedLessons}/{course.plannedLessons ?? '?'} bài
                      </span>{' '}
                      {course.contentComplete ? (
                        <span className="text-success text-xs font-medium">✓ xong</span>
                      ) : (
                        <span className="text-warning text-xs">✎ đang soạn</span>
                      )}
                      {course.totalLessons > course.publishedLessons && (
                        <span className="text-muted-foreground block text-xs">
                          +{course.totalLessons - course.publishedLessons} bài nháp
                        </span>
                      )}
                    </td>
                    <td className="text-right tabular-nums">{course.students}</td>
                    <td>
                      <Percent value={course.completionPercent} />
                    </td>
                    <td>
                      <Percent value={course.exercisePassPercent} />
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {isActive ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(course, 'DRAFT')}
                            disabled={isLoading}
                            className="border-warning/40 bg-warning/10 text-warning hover:bg-warning/20 h-8 gap-1 px-2.5 text-xs font-medium"
                            title="Tạm dừng khóa học (học viên sẽ tạm thời không thấy khóa học trên web)"
                          >
                            {isLoading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Pause className="size-3.5" />
                            )}
                            <span>Tạm dừng</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(course, 'ACTIVE')}
                            disabled={isLoading}
                            className="border-success/40 bg-success/10 text-success hover:bg-success/20 h-8 gap-1 px-2.5 text-xs font-semibold"
                            title="Phát hành khóa học (mở công khai cho học viên vào học)"
                          >
                            {isLoading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Play className="size-3.5 fill-current" />
                            )}
                            <span>Phát hành</span>
                          </Button>
                        )}

                        <Link
                          href={href}
                          className={buttonStyles({ variant: 'outline', size: 'sm' })}
                        >
                          Quản lý
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        Hoàn thành TB = trung bình % bài học đã xong của học viên. Bài tập đạt = số bài tập học viên
        làm đúng / (số học viên × số bài tập). Chỉ tính bài đã xuất bản.
      </p>
    </div>
  );
}
