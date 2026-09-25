import { Container } from '@/components/layout/container';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';
import { XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutCancelPage() {
  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-12">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader className="flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <XCircle className="h-10 w-10" />
          </div>
          <CardTitle as="h1" className="text-2xl font-bold">
            Giao dịch đã bị huỷ
          </CardTitle>
          <CardDescription className="mt-2 text-sm">
            Bạn đã huỷ giao dịch chuyển khoản VietQR hoặc phiên thanh toán đã hết hạn. Đơn hàng chưa
            bị trừ tiền.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center gap-3">
          <Link href="/checkout" className={buttonStyles()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Thử thanh toán lại
          </Link>
          <Link href="/shop" className={buttonStyles({ variant: 'outline' })}>
            Quay lại cửa hàng
          </Link>
        </CardFooter>
      </Card>
    </Container>
  );
}
