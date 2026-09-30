import { Container } from '@/components/layout/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function PostLoading() {
  return (
    <Container className="py-10 sm:py-14">
      {/* Nút quay lại */}
      <div className="mb-6 flex items-center justify-center">
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>

      <article className="mx-auto max-w-4xl">
        <header className="flex flex-col items-center text-center">
          {/* Chuyên mục badge */}
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>

          {/* Tiêu đề bài viết */}
          <div className="mt-4 flex w-full flex-col items-center gap-2">
            <Skeleton className="h-10 w-4/5 max-w-2xl sm:h-12" />
            <Skeleton className="h-8 w-2/3 max-w-xl sm:h-10" />
          </div>

          {/* Mô tả ngắn */}
          <div className="mt-4 flex w-full flex-col items-center gap-2">
            <Skeleton className="h-5 w-3/4 max-w-xl" />
            <Skeleton className="h-5 w-1/2 max-w-md" />
          </div>

          {/* Meta row: ngày, phút đọc */}
          <div className="mt-6 flex items-center gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Banner cover 16:9 */}
          <Skeleton className="mt-8 aspect-[16/9] w-full rounded-2xl" />
        </header>

        {/* Nội dung bài viết */}
        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-6">
          {/* Mục lục skeleton */}
          <div className="border-border/70 rounded-xl border p-5">
            <Skeleton className="mb-3 h-5 w-40" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>

          {/* Paragraphs skeleton */}
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </article>
    </Container>
  );
}
