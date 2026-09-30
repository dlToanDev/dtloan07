import { auth } from '@/lib/auth';
import { PRO_PLANS } from '@/lib/membership';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Clock, Download, Key, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { AccountCredentialsButton } from '@/components/shop/account-credentials-button';

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const session = await auth();

  const order = await db.order.findUnique({
    where: { id },
    include: {
      coupon: true,
      items: {
        include: {
          license: true,
          product: {
            include: {
              files: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Quyền truy cập: Chỉ chủ đơn hàng hoặc Admin mới được xem
  const isOwner =
    (order.userId && order.userId === session?.user?.id) ||
    (order.email && order.email.toLowerCase() === session?.user?.email?.toLowerCase()) ||
    session?.user?.role === 'ADMIN';

  if (!isOwner) {
    notFound();
  }

  const isPaid = order.status === 'PAID';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/account"
          className={buttonStyles({
            variant: 'ghost',
            size: 'sm',
            className: 'text-muted-foreground hover:text-foreground',
          })}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Quay lại tài khoản
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chi tiết đơn hàng {order.orderCode}</h2>
          <p className="text-muted-foreground text-sm">
            Tạo lúc {new Date(order.createdAt).toLocaleString('vi-VN')} &bull; Email nhận hàng:{' '}
            <span className="text-foreground font-medium">{order.email}</span>
          </p>
        </div>
        <div>
          <Badge
            variant={isPaid ? 'default' : order.status === 'PENDING' ? 'outline' : 'secondary'}
            className="px-3 py-1 text-sm"
          >
            {isPaid ? (
              <CheckCircle2 className="mr-1.5 h-4 w-4 text-green-500" />
            ) : (
              <Clock className="mr-1.5 h-4 w-4" />
            )}
            {order.status}
          </Badge>
        </div>
      </div>

      {/* Danh sách sản phẩm & Bản quyền */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sản phẩm trong đơn hàng</CardTitle>
          <CardDescription>
            {isPaid
              ? 'Đơn hàng đã thanh toán. Bạn có thể sử dụng license key và tải file ngay dưới đây.'
              : 'Đơn hàng chưa hoàn tất thanh toán.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-border divide-y">
          {order.membershipPlan && (
            <div className="flex justify-between py-4 text-sm">
              <span className="font-semibold">👑 {PRO_PLANS[order.membershipPlan].label}</span>
              <span className="font-semibold">{order.subtotalVnd.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
          {order.items.map((item) => {
            const license = item.license;
            const remaining = license
              ? Math.max(0, license.maxDownloads - license.downloadCount)
              : 0;

            return (
              <div key={item.id} className="space-y-4 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-foreground font-semibold">{item.productNameSnapshot}</h3>
                    {item.variantNameSnapshot && (
                      <div className="text-muted-foreground text-xs">
                        {item.variantNameSnapshot}
                      </div>
                    )}
                    <div className="text-muted-foreground text-sm">
                      Số lượng: {item.qty} &times; {item.unitPriceVnd.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div className="text-foreground font-bold">
                    {(item.unitPriceVnd * item.qty).toLocaleString('vi-VN')} đ
                  </div>
                </div>

                {/* Tài khoản số đã bàn giao */}
                {isPaid && item.productTypeSnapshot === 'ACCOUNT' && (
                  <div className="bg-muted/40 border-border space-y-3 rounded-lg border p-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase">
                      <Key className="text-primary h-4 w-4" />
                      Thông tin tài khoản
                    </div>
                    <AccountCredentialsButton orderItemId={item.id} />
                  </div>
                )}

                {/* Khối giấy phép số nếu đã thanh toán */}
                {isPaid && license && (
                  <div className="bg-muted/40 border-border space-y-3 rounded-lg border p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="text-primary h-4 w-4" />
                        <span className="text-muted-foreground text-xs font-medium uppercase">
                          License Key:
                        </span>
                        <code className="bg-background border-border text-foreground rounded border px-2 py-0.5 font-mono text-sm font-bold">
                          {license.key}
                        </code>
                      </div>
                      <Badge variant={remaining > 0 ? 'default' : 'secondary'} className="text-xs">
                        Còn {remaining}/{license.maxDownloads} lượt tải
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-muted-foreground text-xs">
                        {license.revokedAt ? (
                          <span className="text-destructive flex items-center">
                            <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                            Đã bị thu hồi
                          </span>
                        ) : (
                          'Có giá trị vĩnh viễn'
                        )}
                      </span>

                      {!license.revokedAt && remaining > 0 && (
                        <Link
                          href={`/api/download/${license.id}`}
                          className={buttonStyles({ variant: 'primary', size: 'sm' })}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Tải tệp đính kèm
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Tóm tắt thanh toán */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tóm tắt thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="text-muted-foreground flex justify-between">
            <span>Tạm tính</span>
            <span>{order.subtotalVnd.toLocaleString('vi-VN')} đ</span>
          </div>

          {order.discountVnd > 0 && (
            <div className="flex justify-between font-medium text-green-600">
              <span>
                Giảm giá {order.coupon ? `(${order.coupon.code ?? order.coupon.name})` : ''}
              </span>
              <span>-{order.discountVnd.toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          {order.shippingDiscountVnd > 0 && (
            <div className="flex justify-between font-medium text-green-600">
              <span>Được miễn phí ship</span>
              <span>-{order.shippingDiscountVnd.toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          <div className="border-border text-foreground flex justify-between border-t pt-2 text-base font-bold">
            <span>Tổng thanh toán</span>
            <span className="text-primary">{order.totalVnd.toLocaleString('vi-VN')} đ</span>
          </div>

          <div className="text-muted-foreground pt-2 text-xs">
            Cổng thanh toán: <span className="text-foreground font-medium">{order.provider}</span>
            {order.paidAt && (
              <>
                {' '}
                &bull; Hoàn tất lúc:{' '}
                <span className="text-foreground font-medium">
                  {new Date(order.paidAt).toLocaleString('vi-VN')}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
