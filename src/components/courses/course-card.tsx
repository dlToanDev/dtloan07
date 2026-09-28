'use client';

import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, Clock3, GraduationCap, PlayCircle } from 'lucide-react';
import Link from 'next/link';

export interface CourseCardProps {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    priceVnd: number;
    compareAtVnd?: number | null;
    level: string;
    duration?: string | null;
    status: string;
    coverUrl?: string | null;
  };
  variant?: 'grid' | 'list';
}

export function CourseCard({ course, variant = 'grid' }: CourseCardProps) {
  const upcoming = course.status === 'UPCOMING';
  const hasDiscount =
    course.compareAtVnd !== null &&
    course.compareAtVnd !== undefined &&
    course.compareAtVnd > course.priceVnd;
  const isList = variant === 'list';

  return (
    <article
      className={cn(
        'border-border bg-card overflow-hidden rounded-2xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
        isList
          ? 'flex flex-col p-5 sm:flex-row sm:items-center sm:gap-6'
          : 'flex h-full flex-col p-6',
      )}
    >
      {/* Cover / Icon */}
      <div className={cn('relative shrink-0', isList ? 'w-full sm:aspect-[4/3] sm:w-48' : 'mb-4')}>
        {course.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.coverUrl}
            alt=""
            className={cn(
              'object-cover',
              isList ? 'aspect-video w-full rounded-xl sm:aspect-[4/3]' : 'size-14 rounded-xl',
            )}
          />
        ) : (
          <div
            className={cn(
              'bg-primary/10 text-primary flex items-center justify-center rounded-xl',
              isList ? 'aspect-video w-full sm:aspect-[4/3]' : 'size-14',
            )}
          >
            <BookOpen className="size-6" />
          </div>
        )}

        {!isList && (
          <div className="absolute top-0 right-0">
            <Badge variant={upcoming ? 'secondary' : 'default'}>
              {upcoming ? 'Sắp ra mắt' : 'Đang mở học'}
            </Badge>
          </div>
        )}
      </div>

      {/* Nội dung thông tin */}
      <div className={cn('flex-1', isList ? 'mt-4 sm:mt-0' : 'mt-2')}>
        <div className="flex items-center gap-2">
          {isList && (
            <Badge variant={upcoming ? 'secondary' : 'default'}>
              {upcoming ? 'Sắp ra mắt' : 'Đang mở học'}
            </Badge>
          )}
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <GraduationCap className="size-3.5" /> {course.level}
          </span>
          {course.duration && (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Clock3 className="size-3.5" /> {course.duration}
            </span>
          )}
        </div>

        <h2 className="text-foreground mt-2 text-xl font-bold tracking-tight">
          <Link href={`/courses/${course.slug}`} className="hover:underline">
            {course.title}
          </Link>
        </h2>

        <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-relaxed">
          {course.description}
        </p>

        {!isList && (
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
        )}
      </div>

      {/* Giá & Nút CTA */}
      <div
        className={cn(
          isList
            ? 'mt-4 flex shrink-0 flex-row items-center justify-between border-t pt-4 sm:mt-0 sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6'
            : 'border-border mt-6 flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-end sm:justify-between',
        )}
      >
        <div>
          <div className="text-muted-foreground text-xs font-medium">Học phí trọn gói</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-primary text-2xl font-extrabold tracking-tight">
              {course.priceVnd === 0 ? 'Miễn phí' : `${course.priceVnd.toLocaleString('vi-VN')} đ`}
            </span>
            {hasDiscount && (
              <span className="text-muted-foreground text-sm line-through">
                {course.compareAtVnd!.toLocaleString('vi-VN')} đ
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {upcoming ? (
            <span
              className={buttonStyles({
                variant: 'outline',
                size: 'sm',
                className: 'pointer-events-none opacity-60',
              })}
            >
              Chờ ngày mở
            </span>
          ) : (
            <Link
              href={`/courses/${course.slug}`}
              className={buttonStyles({ size: 'sm', className: 'gap-1.5' })}
            >
              <PlayCircle className="size-4" /> Vào học ngay
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
