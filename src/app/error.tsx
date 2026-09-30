'use client';

import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // P11 sẽ thay bằng Sentry. Không hiển thị message gốc cho người dùng
    // vì nó có thể lộ chi tiết nội bộ.
    console.error(error);
  }, [error]);

  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Đã có lỗi xảy ra</h1>
      <p className="text-muted-foreground max-w-md">
        Vui lòng thử lại. Nếu lỗi lặp lại, hãy liên hệ với chúng tôi.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground font-mono text-xs">Mã lỗi: {error.digest}</p>
      ) : null}
      <Button className="mt-2" onClick={reset}>
        Thử lại
      </Button>
    </Container>
  );
}
