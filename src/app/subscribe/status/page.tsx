import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Container } from '@/components/layout/container';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  searchParams: Promise<{
    status?: string;
    source?: string;
  }>;
}

export default async function SubscribeStatusPage({ searchParams }: Props) {
  const { status, source } = await searchParams;
  const isSuccess = status === 'success';

  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="flex flex-col items-center">
          {isSuccess ? (
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          ) : (
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              <AlertCircle className="h-10 w-10" />
            </div>
          )}
          <CardTitle as="h1" className="text-2xl font-bold">
            {isSuccess ? 'Xác nhận thành công!' : 'Không thể xác nhận'}
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            {isSuccess
              ? 'Email của bạn đã được kích hoạt trong danh sách nhận bài viết và tài liệu công nghệ độc quyền.'
              : 'Liên kết xác thực không hợp lệ hoặc đã hết hạn. Vui lòng đăng ký lại.'}
          </CardDescription>
        </CardHeader>

        {isSuccess && source && (
          <CardContent className="space-y-4">
            <div className="border-border bg-muted/50 text-muted-foreground rounded-lg border p-4 text-sm">
              Tài liệu đính kèm: <strong>{source}</strong>
            </div>
          </CardContent>
        )}

        <CardFooter className="flex justify-center gap-3">
          <Link href="/blog" className={buttonStyles()}>
            Khám phá bài viết
          </Link>
          <Link href="/" className={buttonStyles({ variant: 'outline' })}>
            Trang chủ
          </Link>
        </CardFooter>
      </Card>
    </Container>
  );
}
