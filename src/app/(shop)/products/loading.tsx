import { Container } from '@/components/layout/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductsLoading() {
  return (
    <Container className="space-y-12 py-12 sm:py-16">
      {/* Hero Header */}
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-10 w-3/4 sm:h-12" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
      </div>

      {/* Grid sản phẩm skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-border/80 flex flex-col gap-4 rounded-xl border p-5 shadow-sm"
          >
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="border-border/60 mt-4 flex items-center justify-between border-t pt-4">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
