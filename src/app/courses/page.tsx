import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { CourseList } from '@/components/courses/course-list';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = buildMetadata({
  title: 'Khóa học thực chiến',
  description:
    'Các khóa học lập trình, Next.js, DevOps và quản trị máy chủ do dltoan07 xây dựng theo lộ trình riêng.',
  pathname: '/courses',
});

import { unstable_cache } from 'next/cache';

export const revalidate = 300;

async function fetchCourses() {
  return db.course.findMany({
    where: { status: { in: ['ACTIVE', 'UPCOMING'] } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

const getCoursesCached = unstable_cache(fetchCourses, ['active-courses-list-v2'], {
  revalidate: 300,
  tags: ['courses'],
});

async function getCourses() {
  if (process.env.NODE_ENV === 'development') {
    return fetchCourses();
  }
  return getCoursesCached();
}

import Link from 'next/link';
import { Sparkles, Code2, ArrowRight } from 'lucide-react';

export default async function CoursesPage() {
  let courses: Awaited<ReturnType<typeof getCourses>> = [];

  try {
    courses = await getCourses();
  } catch (error) {
    console.warn('Cảnh báo: Không thể tải danh sách khóa học:', error);
  }

  return (
    <Container className="py-8 sm:py-10">
      {/* BANNER LUYỆN ĐỀ & KHO BÀI TẬP MỞ MIỄN PHÍ */}
      <div className="border-primary/20 from-primary/10 via-primary/5 relative mb-8 overflow-hidden rounded-3xl border bg-gradient-to-r to-transparent p-6 shadow-xs sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl space-y-2.5">
            <div className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold">
              <Sparkles className="size-3.5" />
              <span>100% Miễn phí cho mọi khách & học viên</span>
            </div>
            <h2 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
              Kho Luyện Đề & Bài Tập Thực Hành Trực Tuyến
            </h2>
            <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
              Luyện giải bài tập lập trình (chấm test cases tự động) và đề thi trắc nghiệm có đầy đủ
              kho học liệu đa phương tiện: đoạn văn bản đọc hiểu, file âm thanh nghe (Listening) và
              video bài tập trực quan.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Link
              href="/courses/practice"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-md transition active:scale-95"
            >
              <Code2 className="size-4" />
              <span>Vào Luyện Đề Ngay</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Danh sách & Phân trang khóa học */}
      <CourseList courses={courses} />
    </Container>
  );
}
