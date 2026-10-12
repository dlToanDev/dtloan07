import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Crown,
  DollarSign,
  Headphones,
  Mail,
  PackageCheck,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { paymentStatusBadgeVariant, paymentStatusLabel } from '@/lib/shop/labels';

export const dynamic = 'force-dynamic';

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sevenDayStart = new Date(now);
  sevenDayStart.setHours(0, 0, 0, 0);
  sevenDayStart.setDate(sevenDayStart.getDate() - 6);

  const [
    userCount,
    newUsers,
    proUsers,
    lockedUsers,
    subscriberCount,
    recentOrders,
    paidOrders,
    paidThisMonth,
    allOrdersThisMonth,
    pendingOrders,
    totalRevenueAggregate,
    monthlyRevenueAggregate,
    previousRevenueAggregate,
    products,
    activeProducts,
    draftProducts,
    recentUsers,
    pendingTickets,
    openTickets,
    sevenDayOrders,
    sevenDayUsers,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.user.count({ where: { proUntil: { gt: now }, lockedAt: null } }),
    db.user.count({ where: { lockedAt: { not: null } } }),
    db.subscriber.count({ where: { status: 'CONFIRMED' } }),
    db.order.findMany({ take: 6, orderBy: { createdAt: 'desc' }, include: { items: true } }),
    db.order.count({ where: { status: 'PAID' } }),
    db.order.count({ where: { status: 'PAID', paidAt: { gte: startOfMonth } } }),
    db.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.order.count({ where: { status: 'PENDING' } }),
    db.order.aggregate({ _sum: { totalVnd: true }, where: { status: 'PAID' } }),
    db.order.aggregate({
      _sum: { totalVnd: true },
      where: { status: 'PAID', paidAt: { gte: startOfMonth } },
    }),
    db.order.aggregate({
      _sum: { totalVnd: true },
      where: { status: 'PAID', paidAt: { gte: previousMonthStart, lt: startOfMonth } },
    }),
    db.product.findMany({
      include: { _count: { select: { licenses: true } } },
      orderBy: { licenses: { _count: 'desc' } },
      take: 5,
    }),
    db.product.count({ where: { status: 'ACTIVE' } }),
    db.product.count({ where: { status: 'DRAFT' } }),
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        proUntil: true,
        lockedAt: true,
        createdAt: true,
      },
    }),
    db.supportTicket.count({ where: { status: 'PENDING' } }),
    db.supportTicket.findMany({
      where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        subject: true,
        status: true,
        updatedAt: true,
        guestName: true,
        user: { select: { name: true, email: true } },
      },
    }),
    db.order.findMany({
      where: { status: 'PAID', paidAt: { gte: sevenDayStart } },
      select: { totalVnd: true, paidAt: true },
    }),
    db.user.findMany({ where: { createdAt: { gte: sevenDayStart } }, select: { createdAt: true } }),
  ]);

  const totalRevenue = totalRevenueAggregate._sum.totalVnd || 0;
  const monthlyRevenue = monthlyRevenueAggregate._sum.totalVnd || 0;
  const previousRevenue = previousRevenueAggregate._sum.totalVnd || 0;
  const revenueGrowth =
    previousRevenue > 0
      ? Math.round(((monthlyRevenue - previousRevenue) / previousRevenue) * 100)
      : monthlyRevenue > 0
        ? 100
        : 0;
  const paidRate =
    allOrdersThisMonth > 0 ? Math.round((paidThisMonth / allOrdersThisMonth) * 100) : 0;

  const dailyData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sevenDayStart);
    date.setDate(sevenDayStart.getDate() + index);
    return {
      key: dayKey(date),
      label: date.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('Th ', 'T'),
      dateLabel: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      revenue: 0,
      users: 0,
    };
  });
  const dailyMap = new Map(dailyData.map((item) => [item.key, item]));
  for (const order of sevenDayOrders) {
    if (!order.paidAt) continue;
    const item = dailyMap.get(dayKey(order.paidAt));
    if (item) item.revenue += order.totalVnd;
  }
  for (const user of sevenDayUsers) {
    const item = dailyMap.get(dayKey(user.createdAt));
    if (item) item.users += 1;
  }
  const maxDailyRevenue = Math.max(1, ...dailyData.map((item) => item.revenue));
  const sevenDayRevenue = dailyData.reduce((sum, item) => sum + item.revenue, 0);

  const cards = [
    {
      label: 'Doanh thu tháng',
      value: formatMoney(monthlyRevenue),
      detail: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth}% so với tháng trước`,
      icon: DollarSign,
      tone: 'text-success bg-success/10',
    },
    {
      label: 'Đơn đã thanh toán',
      value: paidThisMonth.toLocaleString('vi-VN'),
      detail: `${paidRate}% đơn tháng này đã thanh toán`,
      icon: PackageCheck,
      tone: 'text-primary bg-primary/10',
    },
    {
      label: 'Tổng người dùng',
      value: userCount.toLocaleString('vi-VN'),
      detail: `+${newUsers} tài khoản trong tháng`,
      icon: Users,
      tone: 'text-info bg-info/10',
    },
    {
      label: 'Cần xử lý',
      value: (pendingOrders + pendingTickets).toLocaleString('vi-VN'),
      detail: `${pendingOrders} đơn chờ · ${pendingTickets} ticket mới`,
      icon: Clock3,
      tone: 'text-warning bg-warning/10',
    },
  ] as const;

  const healthItems = [
    {
      label: 'Tài khoản Pro',
      value: proUsers,
      helper: 'đang còn hiệu lực',
      icon: Crown,
      href: '/admin/users?status=pro',
      tone: 'text-warning bg-warning/10',
    },
    {
      label: 'Sản phẩm active',
      value: activeProducts,
      helper: `${draftProducts} bản nháp`,
      icon: ShoppingBag,
      href: '/admin/products',
      tone: 'text-primary bg-primary/10',
    },
    {
      label: 'Subscribers',
      value: subscriberCount,
      helper: 'đã xác nhận email',
      icon: Mail,
      href: '/admin/subscribers',
      tone: 'text-muted-foreground bg-muted',
    },
    {
      label: 'Tài khoản khóa',
      value: lockedUsers,
      helper: 'đang bị hạn chế truy cập',
      icon: Activity,
      href: '/admin/users?status=locked',
      tone: 'text-destructive bg-destructive/10',
    },
  ] as const;

  return (
    <div className="space-y-6 pb-8">
      <section className="border-border bg-card relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-6">
        <div className="bg-primary/10 pointer-events-none absolute -top-16 -right-14 size-48 rounded-full blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <span className="bg-success mr-1.5 size-1.5 animate-pulse rounded-full" />
                Dữ liệu trực tiếp
              </Badge>
              <span className="text-muted-foreground text-xs">
                {now.toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Trung tâm điều hành</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Theo dõi doanh thu, người dùng, đơn hàng và các công việc cần xử lý trên một màn hình.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/orders" className={buttonStyles({ variant: 'outline', size: 'sm' })}>
              Đơn hàng
            </Link>
            <Link href="/admin/users" className={buttonStyles({ variant: 'outline', size: 'sm' })}>
              Người dùng
            </Link>
            <Link href="/admin/support" className={buttonStyles({ size: 'sm' })}>
              <Headphones className="size-4" />
              Hỗ trợ
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const GrowthIcon = revenueGrowth >= 0 ? TrendingUp : TrendingDown;
          return (
            <Card key={card.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
                      {card.label}
                    </p>
                    <p className="mt-2 truncate text-2xl font-bold tracking-tight">{card.value}</p>
                  </div>
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${card.tone}`}
                  >
                    <Icon className="size-4.5" />
                  </div>
                </div>
                <div className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs">
                  {card.label === 'Doanh thu tháng' && (
                    <GrowthIcon
                      className={`size-3.5 ${revenueGrowth >= 0 ? 'text-success' : 'text-destructive'}`}
                    />
                  )}
                  <span>{card.detail}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <Card>
          <CardHeader className="gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Hiệu suất 7 ngày gần nhất</CardTitle>
              <CardDescription>
                Doanh thu đã thanh toán và số tài khoản đăng ký mới.
              </CardDescription>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-muted-foreground text-xs">Doanh thu 7 ngày</p>
              <p className="font-bold">{formatMoney(sevenDayRevenue)}</p>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid h-56 grid-cols-7 gap-2 sm:gap-3">
              {dailyData.map((item) => {
                const height = Math.max(5, Math.round((item.revenue / maxDailyRevenue) * 100));
                return (
                  <div
                    key={item.key}
                    className="flex min-w-0 flex-col items-center justify-end gap-2"
                  >
                    <div className="flex w-full min-w-0 flex-1 items-end justify-center">
                      <div
                        className="group bg-primary/80 hover:bg-primary relative w-full max-w-11 rounded-t-lg transition-all"
                        style={{ height: `${height}%` }}
                        title={`${item.dateLabel}: ${formatMoney(item.revenue)}`}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100">
                          {item.revenue > 0
                            ? new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(
                                item.revenue,
                              )
                            : '0'}
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-semibold">{item.label}</p>
                      <p className="text-muted-foreground text-[10px]">+{item.users} user</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base">Tình trạng hệ thống</CardTitle>
            <CardDescription>Các chỉ số vận hành cần kiểm tra nhanh.</CardDescription>
          </CardHeader>
          <CardContent className="divide-border divide-y p-0">
            {healthItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group hover:bg-muted/30 flex items-center gap-3 px-5 py-4 transition-colors"
                >
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}
                  >
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <span className="text-lg font-bold">
                        {item.value.toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">{item.helper}</p>
                  </div>
                  <ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 border-b pb-4">
            <div>
              <CardTitle className="text-base">Đơn hàng mới nhất</CardTitle>
              <CardDescription>
                {paidOrders} đơn đã thanh toán · {formatMoney(totalRevenue)} lũy kế
              </CardDescription>
            </div>
            <Link
              href="/admin/orders"
              className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'text-xs' })}
            >
              Xem tất cả <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">Chưa có giao dịch.</p>
            ) : (
              <div className="divide-border divide-y">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 font-mono text-xs font-bold">
                          {order.orderCode}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {order.email}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {order.createdAt.toLocaleString('vi-VN')} · {order.items.length} sản phẩm
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">{formatMoney(order.totalVnd)}</p>
                      <Badge
                        variant={paymentStatusBadgeVariant(order.status)}
                        className="mt-1 text-[10px]"
                      >
                        {paymentStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 border-b pb-4">
            <div>
              <CardTitle className="text-base">Hỗ trợ đang mở</CardTitle>
              <CardDescription>{pendingTickets} ticket mới đang chờ tiếp nhận.</CardDescription>
            </div>
            <Link
              href="/admin/support"
              className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'text-xs' })}
            >
              Xử lý <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {openTickets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <CheckCircle2 className="text-success size-8" />
                <p className="text-sm font-medium">Không có ticket tồn đọng</p>
                <p className="text-muted-foreground text-xs">Mọi yêu cầu hiện đã được xử lý.</p>
              </div>
            ) : (
              <div className="divide-border divide-y">
                {openTickets.map((ticket) => (
                  <div key={ticket.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{ticket.subject}</p>
                        <p className="text-muted-foreground mt-1 truncate text-xs">
                          {ticket.user?.name || ticket.guestName || ticket.user?.email || 'Khách'}
                        </p>
                      </div>
                      <Badge
                        variant={ticket.status === 'PENDING' ? 'secondary' : 'outline'}
                        className="shrink-0 text-[10px]"
                      >
                        {ticket.status === 'PENDING' ? 'Chờ duyệt' : 'Đang xử lý'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-2 text-[10px]">
                      Cập nhật {ticket.updatedAt.toLocaleString('vi-VN')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 border-b pb-4">
            <div>
              <CardTitle className="text-base">Người dùng mới</CardTitle>
              <CardDescription>Đăng ký gần nhất trên hệ thống.</CardDescription>
            </div>
            <Link
              href="/admin/users"
              className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'text-xs' })}
            >
              Quản lý <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="divide-border divide-y p-0">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-5 py-3">
                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {(user.name || user.email)[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{user.name || 'Chưa đặt tên'}</p>
                    {user.proUntil && user.proUntil > now && (
                      <Crown className="text-warning size-3.5 shrink-0" />
                    )}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                </div>
                <Badge variant={user.lockedAt ? 'destructive' : 'outline'} className="text-[10px]">
                  {user.lockedAt ? 'Khóa' : user.role}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 border-b pb-4">
            <div>
              <CardTitle className="text-base">Sản phẩm nổi bật</CardTitle>
              <CardDescription>Xếp theo số giấy phép đã cấp.</CardDescription>
            </div>
            <Link
              href="/admin/products"
              className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'text-xs' })}
            >
              Quản lý <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product, index) => (
              <div key={product.id} className="border-border bg-muted/20 rounded-xl border p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                    {index + 1}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {product._count.licenses} lượt
                  </Badge>
                </div>
                <p className="mt-3 truncate text-sm font-semibold">{product.name}</p>
                <p className="text-muted-foreground mt-0.5 text-[10px]">
                  Phiên bản {product.version}
                </p>
                <p className="mt-3 font-bold">{formatMoney(product.priceVnd)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
