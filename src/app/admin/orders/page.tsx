import { db } from '@/lib/db';
import { PRO_PLANS } from '@/lib/membership';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';

interface AdminOrdersPageProps {
  searchParams: Promise<{
    status?: string;
    fulfillment?: string;
  }>;
}

export const dynamic = 'force-dynamic';

const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'EXPIRED'] as const;
const FULFILLMENT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
] as const;
const FULFILLMENT_LABEL: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const { status, fulfillment } = await searchParams;

  const validStatus = PAYMENT_STATUSES.find((value) => value === status);
  const validFulfillment = FULFILLMENT_STATUSES.find((value) => value === fulfillment);

  const where: Prisma.OrderWhereInput = {
    ...(validStatus && { status: validStatus }),
    ...(validFulfillment && { fulfillmentStatus: validFulfillment }),
  };

  let orders: Awaited<
    ReturnType<typeof db.order.findMany<{ include: { items: true; coupon: true } }>>
  > = [];
  let todoCount = 0;

  try {
    [orders, todoCount] = await Promise.all([
      db.order.findMany({
        where,
        include: { items: true, coupon: true },
        orderBy: { createdAt: 'desc' },
      }),
      // "Cần xử lý": đơn đã trả tiền hoặc đơn COD đang chờ đóng gói / giao.
      db.order.count({
        where: {
          fulfillmentStatus: { in: ['PENDING', 'CONFIRMED'] },
          OR: [{ status: 'PAID' }, { paymentMethod: 'COD' }],
        },
      }),
    ]);
  } catch (err) {
    console.warn('Lỗi tải đơn hàng trong admin:', err);
  }

  const filterHref = (patch: { status?: string; fulfillment?: string }) => {
    const params = new URLSearchParams();
    const nextStatus = patch.status ?? (validStatus || '');
    const nextFulfillment = patch.fulfillment ?? (validFulfillment || '');
    if (nextStatus) params.set('status', nextStatus);
    if (nextFulfillment) params.set('fulfillment', nextFulfillment);
    const query = params.toString();
    return query ? `/admin/orders?${query}` : '/admin/orders';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            Danh sách đơn hàng ({orders.length})
            {todoCount > 0 && (
              <Link href={filterHref({ status: '', fulfillment: 'PENDING' })}>
                <Badge variant="destructive">Cần xử lý: {todoCount}</Badge>
              </Link>
            )}
          </h2>
          <p className="text-muted-foreground text-sm">
            Quản lý toàn bộ lịch sử đơn hàng, thanh toán và giao hàng trên hệ thống.
          </p>
        </div>

        <div className="space-y-2">
          {/* Lọc theo thanh toán */}
          <div className="flex flex-wrap justify-end gap-1">
            <Link
              href={filterHref({ status: '' })}
              className={buttonStyles({
                variant: !validStatus ? 'primary' : 'outline',
                size: 'sm',
                className: 'text-xs',
              })}
            >
              Mọi thanh toán
            </Link>
            {PAYMENT_STATUSES.map((value) => (
              <Link
                key={value}
                href={filterHref({ status: value })}
                className={buttonStyles({
                  variant: validStatus === value ? 'primary' : 'outline',
                  size: 'sm',
                  className: 'text-xs',
                })}
              >
                {value}
              </Link>
            ))}
          </div>

          {/* Lọc theo giao hàng */}
          <div className="flex flex-wrap justify-end gap-1">
            <Link
              href={filterHref({ fulfillment: '' })}
              className={buttonStyles({
                variant: !validFulfillment ? 'primary' : 'outline',
                size: 'sm',
                className: 'text-xs',
              })}
            >
              Mọi trạng thái giao
            </Link>
            {FULFILLMENT_STATUSES.map((value) => (
              <Link
                key={value}
                href={filterHref({ fulfillment: value })}
                className={buttonStyles({
                  variant: validFulfillment === value ? 'primary' : 'outline',
                  size: 'sm',
                  className: 'text-xs',
                })}
              >
                {FULFILLMENT_LABEL[value]}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Chi tiết giao dịch</CardTitle>
          <CardDescription>
            {validStatus || validFulfillment
              ? `Đang lọc: ${[validStatus, validFulfillment && FULFILLMENT_LABEL[validFulfillment]]
                  .filter(Boolean)
                  .join(' · ')}`
              : 'Hiển thị tất cả đơn hàng'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Không có đơn hàng nào khớp với điều kiện lọc.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-border text-muted-foreground border-b text-xs uppercase">
                    <th className="px-2 py-3">Mã đơn</th>
                    <th className="px-2 py-3">Khách hàng</th>
                    <th className="px-2 py-3">Sản phẩm</th>
                    <th className="px-2 py-3 text-right">Tổng tiền</th>
                    <th className="px-2 py-3 text-center">Thanh toán</th>
                    <th className="px-2 py-3 text-center">Giao hàng</th>
                    <th className="px-2 py-3">Thời gian</th>
                    <th className="px-2 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30">
                      <td className="px-2 py-3 font-mono font-medium">{o.orderCode}</td>
                      <td className="px-2 py-3">
                        <div className="text-foreground font-medium">
                          {o.customerName || o.email}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {o.phone ? `${o.phone} · ` : ''}
                          {o.paymentMethod === 'COD' ? 'COD' : 'PayOS'}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        {o.membershipPlan && (
                          <div className="text-xs font-medium text-amber-600">
                            👑 {PRO_PLANS[o.membershipPlan].label}
                          </div>
                        )}
                        {o.items.map((i) => (
                          <div key={i.id} className="text-xs">
                            {i.productNameSnapshot}
                            {i.variantNameSnapshot
                              ? ` (${i.variantNameSnapshot})`
                              : ''} &times; {i.qty}
                          </div>
                        ))}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold">
                        {o.totalVnd.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-2 py-3 text-center">
                        <Badge
                          variant={o.status === 'PAID' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {o.status}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-center">
                        {o.fulfillmentStatus ? (
                          <Badge variant="secondary" className="text-xs">
                            {FULFILLMENT_LABEL[o.fulfillmentStatus]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="text-muted-foreground px-2 py-3 text-xs">
                        {new Date(o.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className={buttonStyles({
                            variant: 'outline',
                            size: 'sm',
                            className: 'text-xs',
                          })}
                        >
                          Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
