import { Container } from '@/components/layout/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function BlogLoading() {
  return (
    <Container className="py-12">
      {/* Header skeleton */}
      <header className="flex flex-col gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-24" />
      </header>

      {/* Filter / Tabs skeleton */}
      <div className="border-border/60 mt-8 flex items-center justify-between gap-4 border-b pb-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Post cards list skeleton */}
      <div className="mt-8 flex flex-col gap-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-border/60 flex flex-col gap-5 border-b pb-8 sm:flex-row sm:items-start sm:gap-6"
          >
            <Skeleton className="aspect-[16/9] w-full shrink-0 rounded-xl sm:w-64 md:w-72" />
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="h-7 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
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
