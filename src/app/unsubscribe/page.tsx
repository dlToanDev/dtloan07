'use client';

import { useState } from 'react';
import { Container } from '@/components/layout/container';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonStyles } from '@/components/ui/button';
import Link from 'next/link';

export default function UnsubscribePage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUnsubscribe(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Đã huỷ đăng ký thành công.');
      } else {
        setError(data.error || 'Có lỗi xảy ra.');
      }
    } catch {
      setError('Lỗi kết nối tới máy chủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle as="h1" className="text-2xl font-bold">
            Huỷ đăng ký nhận tin
          </CardTitle>
          <CardDescription>
            Nhập địa chỉ email của bạn để ngừng nhận bản tin và thông báo bài viết mới.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {message ? (
            <div className="rounded-lg bg-emerald-500/10 p-4 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {message}
            </div>
          ) : (
            <form onSubmit={handleUnsubscribe} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
                  {error}
                </div>
              )}

              <Button type="submit" variant="destructive" className="w-full" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Xác nhận huỷ đăng ký'}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center">
          <Link href="/" className={buttonStyles({ variant: 'ghost' })}>
            Quay về trang chủ
          </Link>
        </CardFooter>
      </Card>
    </Container>
  );
}
