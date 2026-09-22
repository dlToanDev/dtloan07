import { db } from '@/lib/db';
import { CourseManager } from '@/components/admin/course-manager';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý Khóa học - Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage() {
  let courses: Awaited<ReturnType<typeof db.course.findMany>> = [];
  try {
    courses = await db.course.findMany({
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.warn('Lỗi tải danh sách khóa học:', err);
  }

  return (
    <div className="space-y-6">
      <CourseManager initialCourses={courses} />
    </div>
  );
}
