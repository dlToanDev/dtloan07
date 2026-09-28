import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { BookOpen, Clock3, GraduationCap, PlayCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = buildMetadata({
  title: 'Khóa học thực chiến',
  description:
    'Các khóa học lập trình, Next.js, DevOps và quản trị máy chủ do dltoan07 xây dựng theo lộ trình riêng.',
  pathname: '/courses',
});

export const revalidate = 300;

export default async function CoursesPage() {
  let courses: Awaited<ReturnType<typeof db.course.findMany>> = [];

  try {
    courses = await db.course.findMany({
      where: { status: { in: ['ACTIVE', 'UPCOMING'] } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  } catch (error) {
    console.warn('Cảnh báo: Không thể tải danh sách khóa học lúc build:', error);
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

      {courses.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-2xl border border-dashed p-12 text-center">
          <GraduationCap className="mx-auto mb-3 size-10 opacity-50" />
          <p>Chưa có khóa học nào đang mở. Vui lòng quay lại sau.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {courses.map((course) => {
            const upcoming = course.status === 'UPCOMING';
            const hasDiscount =
              course.compareAtVnd !== null && course.compareAtVnd > course.priceVnd;

            return (
              <article
                key={course.id}
                className="border-border bg-card flex h-full flex-col rounded-2xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  {course.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.coverUrl}
                      alt=""
                      className="size-12 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl">
                      <BookOpen className="size-6" />
                    </div>
                  )}
                  <Badge variant={upcoming ? 'secondary' : 'default'}>
                    {upcoming ? 'Sắp ra mắt' : 'Đang mở học'}
                  </Badge>
                </div>

                <div className="mt-5 flex-1">
                  <h2 className="text-xl font-bold tracking-tight">
                    <Link href={`/courses/${course.slug}`} className="hover:underline">
                      {course.title}
                    </Link>
                  </h2>
                  <p className="text-muted-foreground mt-3 line-clamp-4 text-sm leading-relaxed">
                    {course.description}
                  </p>
                  <div className="text-muted-foreground mt-4 flex flex-wrap gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap className="size-3.5" /> {course.level}
                    </span>
                    {course.duration && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" /> {course.duration}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-border mt-6 flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-muted-foreground text-[11px] font-semibold uppercase">
                      Học phí
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold">
                        {course.priceVnd === 0
                          ? 'Miễn phí'
                          : `${course.priceVnd.toLocaleString('vi-VN')} đ`}
                      </span>
                      {hasDiscount && (
                        <span className="text-muted-foreground text-sm line-through">
                          {course.compareAtVnd?.toLocaleString('vi-VN')} đ
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/courses/${course.slug}`}
                    className={buttonStyles({
                      variant: upcoming ? 'outline' : 'primary',
                      className: 'shrink-0',
                    })}
                  >
                    <PlayCircle className="mr-2 size-4" /> {upcoming ? 'Xem trước' : 'Xem khóa học'}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Container>
  );
}
