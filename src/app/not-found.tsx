import { buttonStyles } from '@/components/ui/button';
import { Container } from '@/components/layout/container';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-primary font-mono text-sm">404</p>
      <h1 className="text-3xl font-bold tracking-tight">Không tìm thấy trang</h1>
      <p className="text-muted-foreground max-w-md">
        Trang bạn tìm không tồn tại hoặc đã được chuyển đi nơi khác.
      </p>
      <Link href="/" className={buttonStyles({ className: 'mt-2' })}>
        Về trang chủ
      </Link>
    </Container>
  );
}
