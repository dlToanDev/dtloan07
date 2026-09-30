import Link from 'next/link';
import type { Metadata } from 'next';
import { CourseInfoForm, EMPTY_COURSE } from '@/components/admin/courses/course-info-form';

export const metadata: Metadata = { title: 'Thêm khóa học - Admin' };

export default function NewCoursePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <Link href="/admin/courses" className="text-muted-foreground text-sm hover:underline">
          ← Khóa học
        </Link>
        <h1 className="text-2xl font-bold">Thêm khóa học</h1>
        <p className="text-muted-foreground text-sm">
          Điền thông tin khóa học; tạo xong sẽ chuyển sang phần thêm bài học.
        </p>
      </div>
      <CourseInfoForm course={EMPTY_COURSE} />
    </div>
  );
}
