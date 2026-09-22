import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';
import { Container } from '@/components/layout/container';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';

export default function VerifyRequestPage() {
  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-12">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader className="flex flex-col items-center">
          <div className="bg-primary/10 text-primary mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <MailCheck className="h-9 w-9" />
          </div>
          <CardTitle as="h1" className="text-2xl font-bold">
            Kiểm tra hòm thư của bạn
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            Chúng tôi đã gửi một liên kết đăng nhập Magic Link đến địa chỉ email của bạn. Vui lòng
            bấm vào liên kết trong thư để hoàn tất đăng nhập.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Link href="/login" className={buttonStyles({ variant: 'outline' })}>
            Quay lại đăng nhập
          </Link>
        </CardFooter>
      </Card>
    </Container>
  );
}
