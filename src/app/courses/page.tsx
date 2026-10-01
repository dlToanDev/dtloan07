import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { CourseList } from '@/components/courses/course-list';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: 'Khóa học thực chiến',
  description:
    'Các khóa học lập trình, Next.js, DevOps và quản trị máy chủ do dltoan07 xây dựng theo lộ trình riêng.',
  pathname: '/courses',
});

import { unstable_cache } from 'next/cache';

export const revalidate = 300;

const getCoursesCached = unstable_cache(
  async () => {
    return db.course.findMany({
      where: { status: { in: ['ACTIVE', 'UPCOMING'] } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  },
  ['active-courses-list'],
  { revalidate: 300, tags: ['courses'] },
);

export default async function CoursesPage() {
  let courses: Awaited<ReturnType<typeof getCoursesCached>> = [];

  try {
    courses = await getCoursesCached();
  } catch (error) {
    console.warn('Cảnh báo: Không thể tải danh sách khóa học:', error);
  }

  return (
    <Container className="space-y-12 py-12 sm:py-16">
      <div className="max-w-3xl space-y-4">
        <div className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
          <GraduationCap className="size-3.5" /> Học theo lộ trình riêng
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Khóa học thực chiến</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Học lập trình và DevOps từ dự án thật, có lộ trình rõ ràng, tài liệu đi kèm và hỗ trợ
          trong quá trình học. Khóa học được tách riêng, không trộn với Shop hay sản phẩm Affiliate.
        </p>
      </div>

      {/* Danh sách & Phân trang khóa học */}
      <CourseList courses={courses} />
    </Container>
  );
}
