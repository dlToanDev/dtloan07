import { Container } from '@/components/layout/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function AffiliateLoading() {
  return (
    <Container className="space-y-10 py-12 sm:py-16">
      {/* Hero Header */}
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-6 w-52 rounded-full" />
        <Skeleton className="h-10 w-3/4 sm:h-12" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>

      {/* Box thông báo */}
      <Skeleton className="h-24 w-full rounded-xl" />

      {/* Tabs skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>

      {/* Grid deals skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-border/80 flex flex-col gap-4 rounded-xl border p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="border-border/60 mt-2 flex items-center justify-between border-t pt-3">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
