import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import { db } from '@/lib/db';
import { AdminUserActions } from '@/components/admin/user-actions';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  role?: string;
  sort?: string;
  page?: string;
}>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = (params.q || '').trim().slice(0, 120);
  const status = ['all', 'active', 'pro', 'locked', 'unverified'].includes(params.status || '')
    ? params.status!
    : 'all';
  const role = ['all', 'USER', 'ADMIN'].includes(params.role || '') ? params.role! : 'all';
  const sort = ['newest', 'oldest'].includes(params.sort || '') ? params.sort! : 'newest';
  const page = Math.max(1, Number.parseInt(params.page || '1', 10) || 1);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { id: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(role !== 'all' ? { role: role as 'USER' | 'ADMIN' } : {}),
    ...(status === 'locked'
      ? { lockedAt: { not: null } }
      : status === 'active'
        ? { lockedAt: null }
        : status === 'pro'
          ? { proUntil: { gt: now }, lockedAt: null }
          : status === 'unverified'
            ? { emailVerified: null }
            : {}),
  };

  const [
    totalUsers,
    newUsers,
    activeUsers,
    proUsers,
    lockedUsers,
    adminUsers,
    verifiedUsers,
    filteredCount,
    users,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: monthStart } } }),
    db.user.count({ where: { lockedAt: null } }),
    db.user.count({ where: { proUntil: { gt: now }, lockedAt: null } }),
    db.user.count({ where: { lockedAt: { not: null } } }),
    db.user.count({ where: { role: 'ADMIN' } }),
    db.user.count({ where: { emailVerified: { not: null } } }),
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        proUntil: true,
        lockedAt: true,
        lockReason: true,
        emailVerified: true,
        balanceVnd: true,
        balanceUsd: true,
        createdAt: true,
        updatedAt: true,
        accounts: { select: { provider: true }, take: 2 },
        _count: {
          select: {
            orders: true,
            licenses: true,
            warnings: true,
            communityPosts: true,
          },
        },
      },
    }),
  ]);

  const spendingRows = users.length
    ? await db.order.groupBy({
        by: ['userId'],
        where: { userId: { in: users.map((user) => user.id) }, status: 'PAID' },
        _sum: { totalVnd: true },
      })
    : [];
  const spending = new Map(spendingRows.map((row) => [row.userId, row._sum.totalVnd || 0]));
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const verifiedRate = totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0;

  const makeHref = (
    overrides: Partial<{ page: number; status: string; role: string; sort: string; q: string }>,
  ) => {
    const usp = new URLSearchParams();
    const nextQ = overrides.q ?? q;
    const nextStatus = overrides.status ?? status;
    const nextRole = overrides.role ?? role;
    const nextSort = overrides.sort ?? sort;
    const nextPage = overrides.page ?? page;
    if (nextQ) usp.set('q', nextQ);
    if (nextStatus !== 'all') usp.set('status', nextStatus);
    if (nextRole !== 'all') usp.set('role', nextRole);
    if (nextSort !== 'newest') usp.set('sort', nextSort);
    if (nextPage > 1) usp.set('page', String(nextPage));
    return `/admin/users${usp.toString() ? `?${usp}` : ''}`;
  };

  const stats = [
    {
      label: 'Tổng tài khoản',
      value: totalUsers,
      detail: `+${newUsers} mới trong tháng`,
      icon: Users,
      tone: 'text-info bg-info/10',
    },
    {
      label: 'Đang hoạt động',
      value: activeUsers,
      detail: `${verifiedRate}% đã xác minh email`,
      icon: UserCheck,
      tone: 'text-success bg-success/10',
    },
    {
      label: 'Pro còn hạn',
      value: proUsers,
      detail: 'Tài khoản thành viên Pro',
      icon: Crown,
      tone: 'text-warning bg-warning/10',
    },
    {
      label: 'Đang bị khóa',
      value: lockedUsers,
      detail: `${adminUsers} tài khoản quản trị`,
      icon: AlertTriangle,
      tone: 'text-destructive bg-destructive/10',
    },
  ] as const;

  const quickFilters = [
    ['all', 'Tất cả', totalUsers],
    ['active', 'Hoạt động', activeUsers],
    ['pro', 'Pro', proUsers],
    ['locked', 'Bị khóa', lockedUsers],
    ['unverified', 'Chưa xác minh', totalUsers - verifiedUsers],
  ] as const;

  return (
    <div className="space-y-6 pb-8">
      <section className="border-border bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.08em] uppercase">
              <ShieldCheck className="text-primary size-4" />
              Customer management
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quản lý người dùng</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Theo dõi tài khoản, quyền truy cập, xác minh email, gói Pro, ví, đơn hàng và trạng
              thái kiểm duyệt.
            </p>
          </div>
          <div className="border-border bg-muted/30 rounded-xl border px-4 py-3 text-sm">
            <p className="text-muted-foreground text-xs">Đang hiển thị</p>
            <p className="mt-0.5 font-bold">{filteredCount.toLocaleString('vi-VN')} tài khoản</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold">{item.value.toLocaleString('vi-VN')}</p>
                  </div>
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl ${item.tone}`}
                  >
                    <Icon className="size-4.5" />
                  </div>
                </div>
                <p className="text-muted-foreground mt-3 text-xs">{item.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/10 gap-4 border-b pb-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="text-base">Danh sách tài khoản</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Tìm kiếm, lọc và kiểm soát trạng thái tài khoản.
              </p>
            </div>
            <form action="/admin/users" className="grid gap-2 sm:grid-cols-2 xl:flex">
              <label className="border-border bg-background flex h-9 min-w-64 items-center gap-2 rounded-lg border px-3">
                <Search className="text-muted-foreground size-4" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Tên, email hoặc ID..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
              <select
                name="status"
                defaultValue={status}
                className="border-border bg-background h-9 rounded-lg border px-3 text-sm"
              >
                <option value="all">Mọi trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="pro">Đang dùng Pro</option>
                <option value="locked">Bị khóa</option>
                <option value="unverified">Chưa xác minh email</option>
              </select>
              <select
                name="role"
                defaultValue={role}
                className="border-border bg-background h-9 rounded-lg border px-3 text-sm"
              >
                <option value="all">Mọi quyền</option>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
              <select
                name="sort"
                defaultValue={sort}
                className="border-border bg-background h-9 rounded-lg border px-3 text-sm"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
              </select>
              <button className={buttonStyles({ size: 'sm' })}>Áp dụng</button>
              {(q || status !== 'all' || role !== 'all' || sort !== 'newest') && (
                <Link
                  href="/admin/users"
                  className={buttonStyles({ variant: 'ghost', size: 'sm' })}
                >
                  Xóa lọc
                </Link>
              )}
            </form>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickFilters.map(([value, label, count]) => {
              const active = status === value;
              return (
                <Link
                  key={value}
                  href={makeHref({ status: value, page: 1 })}
                  className={buttonStyles({
                    variant: active ? 'primary' : 'outline',
                    size: 'sm',
                    className: 'h-8 rounded-full text-xs',
                  })}
                >
                  {label}
                  <span className={active ? 'text-primary-foreground/75' : 'text-muted-foreground'}>
                    {count.toLocaleString('vi-VN')}
                  </span>
                </Link>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
              <Search className="text-muted-foreground size-8" />
              <p className="font-semibold">Không tìm thấy tài khoản phù hợp</p>
              <p className="text-muted-foreground text-sm">
                Thử thay đổi từ khóa hoặc bộ lọc hiện tại.
              </p>
              <Link
                href="/admin/users"
                className={buttonStyles({ variant: 'outline', size: 'sm', className: 'mt-2' })}
              >
                Xem toàn bộ người dùng
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1220px] text-left text-sm">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground border-b text-[11px] tracking-wide uppercase">
                    <th className="px-5 py-3">Người dùng</th>
                    <th className="px-3 py-3">Trạng thái</th>
                    <th className="px-3 py-3">Hoạt động</th>
                    <th className="px-3 py-3">Chi tiêu</th>
                    <th className="px-3 py-3">Số dư ví</th>
                    <th className="px-3 py-3">Tham gia</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {users.map((user) => {
                    const isPro = Boolean(user.proUntil && user.proUntil > now);
                    const initials = (user.name || user.email).slice(0, 2).toUpperCase();
                    const providers = user.accounts.map((account) => account.provider);
                    const authLabel = providers.includes('google')
                      ? 'Google'
                      : user.accounts.length
                        ? providers[0]
                        : 'Email';
                    return (
                      <tr key={user.id} className="hover:bg-muted/20 align-top transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex gap-3">
                            <div className="border-border bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs font-bold">
                              {user.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.image} alt="" className="size-full object-cover" />
                              ) : (
                                initials
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="max-w-52 truncate font-semibold">
                                  {user.name || 'Chưa đặt tên'}
                                </p>
                                {user.emailVerified && (
                                  <CheckCircle2 className="text-success size-3.5 shrink-0" />
                                )}
                              </div>
                              <p className="text-muted-foreground max-w-64 truncate text-xs">
                                {user.email}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">
                                  {authLabel}
                                </span>
                                <span
                                  className="text-muted-foreground max-w-36 truncate font-mono text-[10px]"
                                  title={user.id}
                                >
                                  {user.id}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex max-w-60 flex-wrap gap-1.5">
                            <Badge variant={user.role === 'ADMIN' ? 'default' : 'outline'}>
                              {user.role}
                            </Badge>
                            {isPro && (
                              <Badge className="bg-warning/10 text-warning border-warning/30">
                                PRO
                              </Badge>
                            )}
                            {user.lockedAt ? (
                              <Badge variant="destructive">Đã khóa</Badge>
                            ) : (
                              <Badge className="bg-success/10 text-success border-success/30">
                                Hoạt động
                              </Badge>
                            )}
                            {!user.emailVerified && (
                              <Badge variant="secondary">Chưa xác minh</Badge>
                            )}
                          </div>
                          {user.lockReason && (
                            <p className="text-destructive mt-2 max-w-60 text-[11px] leading-relaxed">
                              {user.lockReason}
                            </p>
                          )}
                          {isPro && user.proUntil && (
                            <p className="text-muted-foreground mt-2 text-[10px]">
                              Pro đến {user.proUntil.toLocaleDateString('vi-VN')}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-4 text-xs">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <span className="text-muted-foreground">Đơn</span>
                            <b>{user._count.orders}</b>
                            <span className="text-muted-foreground">License</span>
                            <b>{user._count.licenses}</b>
                            <span className="text-muted-foreground">Bài viết</span>
                            <b>{user._count.communityPosts}</b>
                            <span className="text-muted-foreground">Cảnh báo</span>
                            <b className={user._count.warnings ? 'text-destructive' : ''}>
                              {user._count.warnings}
                            </b>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <p className="font-semibold">
                            {(spending.get(user.id) || 0).toLocaleString('vi-VN')} đ
                          </p>
                          <p className="text-muted-foreground mt-1 text-[10px]">
                            Đơn đã thanh toán
                          </p>
                        </td>
                        <td className="px-3 py-4 text-xs">
                          <div className="flex items-center gap-1.5 font-medium">
                            <WalletCards className="text-muted-foreground size-3.5" />
                            {user.balanceVnd.toLocaleString('vi-VN')} đ
                          </div>
                          <p className="text-muted-foreground mt-1">
                            ${user.balanceUsd.toFixed(2)}
                          </p>
                        </td>
                        <td className="px-3 py-4 text-xs">
                          <p className="font-medium">
                            {user.createdAt.toLocaleDateString('vi-VN')}
                          </p>
                          <p className="text-muted-foreground mt-1 text-[10px]">
                            Cập nhật {user.updatedAt.toLocaleDateString('vi-VN')}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <AdminUserActions
                            userId={user.id}
                            role={user.role}
                            locked={Boolean(user.lockedAt)}
                            warningCount={user._count.warnings}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredCount > PAGE_SIZE && (
            <div className="border-border flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground text-sm">
                Trang {page}/{totalPages} · {filteredCount.toLocaleString('vi-VN')} kết quả
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={makeHref({ page: page - 1 })}
                    className={buttonStyles({ variant: 'outline', size: 'sm' })}
                  >
                    Trước
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={makeHref({ page: page + 1 })}
                    className={buttonStyles({ variant: 'outline', size: 'sm' })}
                  >
                    Sau
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
