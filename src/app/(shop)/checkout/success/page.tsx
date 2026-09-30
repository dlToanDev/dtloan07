import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Key, Download, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { provinceName } from '@/config/provinces';

interface Props {
  searchParams: Promise<{
    orderCode?: string;
    cod?: string;
  }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { orderCode, cod } = await searchParams;
  const isCOD = cod === '1';

  let order = null;

  if (orderCode) {
    const codeVariant = orderCode.startsWith('DH-') ? orderCode : `DH-${orderCode}`;
    order = await db.order.findFirst({
      where: {
        OR: [{ orderCode }, { orderCode: codeVariant }],
      },
      include: {
        items: {
          include: {
            license: true,
          },
        },
      },
    });
  }

  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-xl border-emerald-500/20 text-center shadow-xl">
        <CardHeader className="flex flex-col items-center pb-2">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <CardTitle as="h1" className="text-foreground text-2xl font-extrabold">
            {isCOD ? 'Đặt hàng thành công!' : 'Thanh toán thành công!'}
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            {isCOD
              ? 'Đơn hàng đã được ghi nhận. Chúng tôi sẽ liên hệ xác nhận trước khi giao và bạn thanh toán khi nhận hàng.'
              : 'Cảm ơn bạn đã tin tưởng ủng hộ các sản phẩm số và tài liệu kỹ thuật tại website.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4 text-left">
          {order && (
            <div className="border-border bg-muted/40 space-y-3 rounded-lg border p-4">
              <div className="text-muted-foreground border-border/60 flex items-center justify-between border-b pb-2 text-xs">
                <span>
                  Mã đơn hàng: <strong className="text-foreground">{order.orderCode}</strong>
                </span>
                <Badge variant={order.status === 'PAID' ? 'default' : 'secondary'}>
                  {order.status === 'PAID'
                    ? 'Đã kích hoạt'
                    : order.paymentMethod === 'COD'
                      ? 'Chờ xác nhận'
                      : 'Đang xử lý webhook'}
                </Badge>
              </div>

              {order.shipAddress && (
                <div className="text-muted-foreground space-y-1 text-xs">
                  <div className="font-semibold uppercase">Giao tới:</div>
                  <p className="text-foreground">
                    {order.customerName} — {order.phone}
                  </p>
                  <p>
                    {order.shipAddress}, {provinceName(order.shipProvince)}
                  </p>
                  {order.shippingFeeVnd > 0 && (
                    <p>Phí vận chuyển: {order.shippingFeeVnd.toLocaleString('vi-VN')} đ</p>
                  )}
                  <p className="text-foreground font-semibold">
                    Tổng thanh toán: {order.totalVnd.toLocaleString('vi-VN')} đ
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-muted-foreground text-xs font-semibold uppercase">
                  {isCOD ? 'Sản phẩm trong đơn:' : 'Sản phẩm đã cấp bản quyền:'}
                </div>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="border-border bg-card space-y-2 rounded-md border p-3 text-sm"
                  >
                    <div className="text-foreground flex items-center gap-2 font-semibold">
                      <Key className="text-primary h-4 w-4" />
                      {item.productNameSnapshot}
                      {item.variantNameSnapshot && (
                        <span className="text-muted-foreground text-xs font-normal">
                          {item.variantNameSnapshot}
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs font-normal">
                        &times; {item.qty}
                      </span>
                    </div>

                    {item.productTypeSnapshot !== 'DOWNLOAD' ? (
                      <p className="text-muted-foreground text-xs">
                        Hàng sẽ được đóng gói và giao tới địa chỉ của bạn.
                      </p>
                    ) : item.license ? (
                      <div className="flex items-center justify-between pt-1">
                        <span className="bg-muted rounded px-2 py-1 font-mono text-xs">
                          {item.license.key}
                        </span>
                        <Link
                          href={`/api/download/${item.license.id}`}
                          className={buttonStyles({ variant: 'outline', size: 'sm' })}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Tải file (.zip)
                        </Link>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Khoá bản quyền đang được hệ thống tự động sinh và gửi qua email.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-primary/20 bg-primary/5 text-muted-foreground flex items-start gap-3 rounded-lg border p-4 text-xs">
            <Mail className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {isCOD
                ? 'Email xác nhận đơn hàng đã được gửi tới hòm thư của bạn.'
                : 'Thông tin bản quyền và đường link tải file cũng đã được gửi tới hòm thư của bạn.'}{' '}
              Vui lòng kiểm tra cả thư mục <strong>Spam / Thư rác</strong> nếu chưa thấy email đến
              ngay.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center gap-3 pt-2">
          <Link href="/account" className={buttonStyles()}>
            Xem trong Tài khoản của tôi
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href={siteConfig.shopPath} className={buttonStyles({ variant: 'outline' })}>
            Tiếp tục xem sản phẩm
          </Link>
        </CardFooter>
      </Card>
    </Container>
  );
}
