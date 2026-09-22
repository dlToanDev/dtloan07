import { Container } from '@/components/layout/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoryLoading() {
  return (
    <Container className="py-12">
      {/* Header skeleton */}
      <header className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-60" />
        <Skeleton className="h-5 w-24" />
      </header>

      {/* Post cards list skeleton */}
      <div className="mt-8 flex flex-col gap-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-border/60 flex flex-col gap-5 border-b pb-8 sm:flex-row sm:items-start sm:gap-6"
          >
            <Skeleton className="aspect-[16/9] w-full shrink-0 rounded-xl sm:w-64 md:w-72" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-7 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="mt-2 flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
