import { db } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Users, Mail, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    userCount,
    subscriberCount,
    orders,
    paidOrdersAggregate,
    monthlyRevenueAggregate,
    products,
  ] = await Promise.all([
    db.user.count(),
    db.subscriber.count({ where: { status: 'CONFIRMED' } }),
    db.order.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    }),
    db.order.aggregate({
      _sum: { totalVnd: true },
      where: { status: 'PAID' },
    }),
    db.order.aggregate({
      _sum: { totalVnd: true },
      where: {
        status: 'PAID',
        paidAt: { gte: startOfMonth },
      },
    }),
    db.product.findMany({
      include: {
        _count: {
          select: { licenses: true },
        },
      },
      orderBy: { licenses: { _count: 'desc' } },
      take: 5,
    }),
  ]);

  const totalRevenue = paidOrdersAggregate._sum.totalVnd || 0;
  const monthlyRevenue = monthlyRevenueAggregate._sum.totalVnd || 0;

  return (
    <div className="space-y-8">
      {/* Tiêu đề trang Tổng quan */}
      <div className="border-border flex flex-col gap-1 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Tổng quan hệ sinh thái
          </h1>
          <p className="text-muted-foreground text-sm">
            Thống kê doanh thu, đơn hàng và tình trạng tăng trưởng người dùng thời gian thực.
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 sm:mt-0">
          <Badge variant="outline" className="bg-muted/40 text-xs">
            Cập nhật tự động
          </Badge>
        </div>
      </div>

      {/* 4 Thẻ chỉ số tổng quan */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng người dùng</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
            <p className="text-muted-foreground text-xs">Tài khoản đã đăng ký trong DB</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subscribers (Confirmed)</CardTitle>
            <Mail className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriberCount}</div>
            <p className="text-muted-foreground text-xs">Email sẵn sàng nhận tin & ưu đãi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu tháng này</CardTitle>
            <TrendingUp className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-primary text-2xl font-bold">
              {monthlyRevenue.toLocaleString('vi-VN')} đ
            </div>
            <p className="text-muted-foreground text-xs">
              Tháng {now.getMonth() + 1}/{now.getFullYear()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu luỹ kế</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalRevenue.toLocaleString('vi-VN')} đ
            </div>
            <p className="text-muted-foreground text-xs">Toàn bộ giao dịch PAID</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Cột trái: Đơn hàng mới phát sinh */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Đơn hàng mới nhất</CardTitle>
              <CardDescription>Nhật ký giao dịch gần đây</CardDescription>
            </div>
            <Link
              href="/admin/orders"
              className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'text-xs' })}
            >
              Xem tất cả <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Chưa có giao dịch phát sinh.
              </p>
            ) : (
              <div className="divide-border divide-y">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <span className="font-mono font-semibold">{order.orderCode}</span>
                      <span className="text-muted-foreground ml-2">({order.email})</span>
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        {new Date(order.createdAt).toLocaleString('vi-VN')} &bull; {order.provider}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{order.totalVnd.toLocaleString('vi-VN')} đ</div>
                      <Badge
                        variant={order.status === 'PAID' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cột phải: Sản phẩm bán chạy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Sản phẩm nổi bật</CardTitle>
              <CardDescription>Xếp theo số lượng giấy phép bản quyền đã cấp</CardDescription>
            </div>
            <Link
              href="/admin/source-code"
              className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'text-xs' })}
            >
              Source Code <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
            <Link href="/admin/shop" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
              Shop
            </Link>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Chưa có sản phẩm nào.
              </p>
            ) : (
              <div className="divide-border divide-y">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-muted-foreground font-mono text-xs">v{p.version}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{p.priceVnd.toLocaleString('vi-VN')} đ</div>
                      <div className="text-muted-foreground text-xs">
                        {p._count.licenses} lượt mua
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
