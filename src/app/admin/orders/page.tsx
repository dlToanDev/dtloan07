import { db } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import Link from 'next/link';

interface AdminOrdersPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const { status } = await searchParams;

  const validStatus =
    status && ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'EXPIRED'].includes(status)
      ? (status as 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'EXPIRED')
      : undefined;

  let orders: Awaited<
    ReturnType<
      typeof db.order.findMany<{
        include: {
          items: true;
          coupon: true;
        };
      }>
    >
  > = [];

  try {
    orders = await db.order.findMany({
      where: validStatus ? { status: validStatus } : undefined,
      include: {
        items: true,
        coupon: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.warn('Lỗi tải đơn hàng trong admin:', err);
  }

  const statuses = ['ALL', 'PAID', 'PENDING', 'FAILED', 'REFUNDED', 'EXPIRED'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Danh sách đơn hàng ({orders.length})</h2>
          <p className="text-muted-foreground text-sm">
            Quản lý toàn bộ lịch sử đơn hàng và thanh toán trên hệ thống.
          </p>
        </div>

        {/* Bộ lọc trạng thái */}
        <div className="flex flex-wrap gap-1">
          {statuses.map((s) => {
            const isActive = (!validStatus && s === 'ALL') || validStatus === s;
            const href = s === 'ALL' ? '/admin/orders' : `/admin/orders?status=${s}`;
            return (
              <Link
                key={s}
                href={href}
                className={buttonStyles({
                  variant: isActive ? 'primary' : 'outline',
                  size: 'sm',
                  className: 'text-xs',
                })}
              >
                {s}
              </Link>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Chi tiết giao dịch</CardTitle>
          <CardDescription>
            {validStatus ? `Đang lọc theo trạng thái: ${validStatus}` : 'Hiển thị tất cả đơn hàng'}
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
                    <th className="px-2 py-3 text-center">Trạng thái</th>
                    <th className="px-2 py-3">Thời gian</th>
                    <th className="px-2 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30">
                      <td className="px-2 py-3 font-mono font-medium">{o.orderCode}</td>
                      <td className="px-2 py-3">
                        <div className="text-foreground font-medium">{o.email}</div>
                        <div className="text-muted-foreground text-xs">Cổng: {o.provider}</div>
                      </td>
                      <td className="px-2 py-3">
                        {o.items.map((i) => (
                          <div key={i.id} className="text-xs">
                            {i.productNameSnapshot} &times; {i.qty}
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
                      <td className="text-muted-foreground px-2 py-3 text-xs">
                        {new Date(o.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <Link
                          href={`/account/orders/${o.id}`}
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
