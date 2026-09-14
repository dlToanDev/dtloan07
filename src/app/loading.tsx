import { Container } from '@/components/layout/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <Container className="flex flex-col gap-4 py-12">
      <Skeleton className="h-9 w-2/3 max-w-md" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <Skeleton className="h-5 w-4/5 max-w-lg" />
    </Container>
  );
}
