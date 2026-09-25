import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireProductAdmin } from '@/server/actions/product';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CancelOrderButton, FulfillmentActions } from '@/components/admin/order-actions';
import { provinceName } from '@/config/provinces';

export const dynamic = 'force-dynamic';

const FULFILLMENT_LABEL: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

const money = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProductAdmin();
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, coupon: true },
  });

  if (!order) notFound();

  const address = [order.shipAddress, provinceName(order.shipProvince)].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/admin/orders" className="text-muted-foreground text-sm hover:underline">
          ← Quay lại danh sách đơn
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-bold">{order.orderCode}</h1>
          <Badge variant={order.status === 'PAID' ? 'default' : 'outline'}>{order.status}</Badge>
          {order.fulfillmentStatus && (
            <Badge variant="secondary">{FULFILLMENT_LABEL[order.fulfillmentStatus]}</Badge>
          )}
          <Badge variant="outline">
            {order.paymentMethod === 'COD' ? 'COD khi nhận hàng' : 'PayOS'}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Tạo lúc {new Date(order.createdAt).toLocaleString('vi-VN')}
          {order.paidAt && ` · Thanh toán ${new Date(order.paidAt).toLocaleString('vi-VN')}`}
          {order.cancelledAt && ` · Hủy ${new Date(order.cancelledAt).toLocaleString('vi-VN')}`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sản phẩm</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-border divide-y">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 py-3 text-sm">
                    <div>
                      <div className="font-medium">{item.productNameSnapshot}</div>
                      {item.variantNameSnapshot && (
                        <div className="text-muted-foreground text-xs">
                          {item.variantNameSnapshot}
                        </div>
                      )}
                      <div className="text-muted-foreground text-xs">
                        {money(item.unitPriceVnd)} × {item.qty} ·{' '}
                        {item.productTypeSnapshot === 'PHYSICAL'
                          ? 'Đồ vật lý'
                          : item.productTypeSnapshot === 'ACCOUNT'
                            ? 'Tài khoản số'
                            : 'File tải về'}
                      </div>
                    </div>
                    <div className="font-semibold">{money(item.unitPriceVnd * item.qty)}</div>
                  </div>
                ))}
              </div>

              <div className="border-border mt-4 space-y-1 border-t pt-4 text-sm">
                <div className="text-muted-foreground flex justify-between">
                  <span>Tạm tính</span>
                  <span>{money(order.subtotalVnd)}</span>
                </div>
                {order.discountVnd > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Giảm giá{order.coupon ? ` (${order.coupon.code})` : ''}</span>
                    <span>-{money(order.discountVnd)}</span>
                  </div>
                )}
                {order.fulfillmentStatus && (
                  <div className="text-muted-foreground flex justify-between">
                    <span>Phí vận chuyển</span>
                    <span>
                      {order.shippingFeeVnd > 0 ? money(order.shippingFeeVnd) : 'Miễn phí'}
                    </span>
                  </div>
                )}
                <div className="border-border flex justify-between border-t pt-2 text-base font-bold">
                  <span>Tổng cộng</span>
                  <span className="text-primary">{money(order.totalVnd)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.fulfillmentStatus && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Xử lý giao hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FulfillmentActions
                  orderId={order.id}
                  fulfillmentStatus={order.fulfillmentStatus}
                  paymentMethod={order.paymentMethod}
                  trackingCode={order.trackingCode}
                />
                {order.trackingCode && (
                  <p className="text-muted-foreground text-sm">
                    Mã vận đơn: <span className="font-mono">{order.trackingCode}</span>
                  </p>
                )}
                {order.fulfillmentStatus !== 'DELIVERED' &&
                  order.fulfillmentStatus !== 'CANCELLED' && (
                    <div className="border-border border-t pt-4">
                      <CancelOrderButton orderId={order.id} />
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Khách hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs uppercase">Người nhận</div>
              <div className="font-medium">{order.customerName || '—'}</div>
              <div className="text-muted-foreground">{order.phone || '—'}</div>
              <div className="text-muted-foreground break-all">{order.email}</div>
            </div>

            {address && (
              <div>
                <div className="text-muted-foreground text-xs uppercase">Địa chỉ giao</div>
                <p>{address}</p>
                {order.shipNote && (
                  <p className="text-muted-foreground mt-1 text-xs">Ghi chú: {order.shipNote}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
