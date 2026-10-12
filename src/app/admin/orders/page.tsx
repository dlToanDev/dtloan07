import { db } from '@/lib/db';
import { PRO_PLANS } from '@/lib/membership';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import {
  ORDER_PAYMENT_STATUS_LABELS,
  paymentStatusLabel,
  paymentStatusBadgeVariant,
  ORDER_FULFILLMENT_STATUS_LABELS,
} from '@/lib/shop/labels';
import { CreditCard, Truck, Globe, RotateCcw, Filter, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminOrdersPageProps {
  searchParams: Promise<{
    status?: string;
    fulfillment?: string;
    source?: string;
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
const ORDER_SOURCES = ['WEB', 'TELEGRAM'] as const;
const FULFILLMENT_LABEL = ORDER_FULFILLMENT_STATUS_LABELS;

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const { status, fulfillment, source } = await searchParams;

  const validStatus = PAYMENT_STATUSES.find((value) => value === status);
  const validFulfillment = FULFILLMENT_STATUSES.find((value) => value === fulfillment);
  const validSource = ORDER_SOURCES.find((value) => value === source);

  const where: Prisma.OrderWhereInput = {
    ...(validStatus && { status: validStatus }),
    ...(validFulfillment && { fulfillmentStatus: validFulfillment }),
    ...(validSource && { source: validSource }),
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

  const filterHref = (patch: { status?: string; fulfillment?: string; source?: string }) => {
    const params = new URLSearchParams();
    const nextStatus = patch.status !== undefined ? patch.status : validStatus || '';
    const nextFulfillment =
      patch.fulfillment !== undefined ? patch.fulfillment : validFulfillment || '';
    const nextSource = patch.source !== undefined ? patch.source : validSource || '';
    if (nextStatus) params.set('status', nextStatus);
    if (nextFulfillment) params.set('fulfillment', nextFulfillment);
    if (nextSource) params.set('source', nextSource);
    const query = params.toString();
    return query ? `/admin/orders?${query}` : '/admin/orders';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <ShoppingBag className="text-primary size-6" />
            Danh sách đơn hàng
            <span className="text-muted-foreground text-lg font-normal">({orders.length})</span>
            {todoCount > 0 && (
              <Link href={filterHref({ status: '', fulfillment: 'PENDING' })}>
                <Badge
                  variant="destructive"
                  className="ml-1 cursor-pointer transition-opacity hover:opacity-90"
                >
                  Cần xử lý: {todoCount}
                </Badge>
              </Link>
            )}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Quản lý toàn bộ lịch sử đơn hàng, thanh toán và giao hàng trên hệ thống.
          </p>
        </div>

        {(validStatus || validFulfillment || validSource) && (
          <Link
            href="/admin/orders"
            className={buttonStyles({
              variant: 'outline',
              size: 'sm',
              className: 'text-muted-foreground hover:text-foreground h-8 shrink-0 gap-1.5 text-xs',
            })}
          >
            <RotateCcw className="size-3.5" />
            Xóa bộ lọc
          </Link>
        )}
      </div>

      {/* Thanh bộ lọc đơn hàng cân đối & trực quan */}
      <div className="border-border bg-card/60 space-y-3 rounded-xl border p-4 shadow-2xs">
        <div className="border-border/40 flex items-center justify-between border-b pb-2">
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <Filter className="text-primary size-3.5" />
            <span>Bộ lọc trạng thái</span>
          </div>
          {validStatus || validFulfillment || validSource ? (
            <span className="text-muted-foreground text-[11px]">
              Đang áp dụng{' '}
              <strong className="text-primary font-semibold">
                {[validStatus, validFulfillment, validSource].filter(Boolean).length}
              </strong>{' '}
              tiêu chí
            </span>
          ) : (
            <span className="text-muted-foreground text-[11px]">Hiển thị toàn bộ</span>
          )}
        </div>

        {/* 1. Lọc theo thanh toán */}
        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:gap-3">
          <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 font-medium sm:w-24">
            <CreditCard className="size-3.5" />
            <span>Thanh toán</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={filterHref({ status: '' })}
              className={cn(
                'inline-flex cursor-pointer items-center justify-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                !validStatus
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40 border',
              )}
            >
              Tất cả
            </Link>
            {PAYMENT_STATUSES.map((value) => (
              <Link
                key={value}
                href={filterHref({ status: value })}
                className={cn(
                  'inline-flex cursor-pointer items-center justify-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                  validStatus === value
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40 border',
                )}
              >
                {ORDER_PAYMENT_STATUS_LABELS[value] || value}
              </Link>
            ))}
          </div>
        </div>

        {/* 2. Lọc theo giao hàng */}
        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:gap-3">
          <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 font-medium sm:w-24">
            <Truck className="size-3.5" />
            <span>Giao hàng</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={filterHref({ fulfillment: '' })}
              className={cn(
                'inline-flex cursor-pointer items-center justify-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                !validFulfillment
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40 border',
              )}
            >
              Tất cả
            </Link>
            {FULFILLMENT_STATUSES.map((value) => (
              <Link
                key={value}
                href={filterHref({ fulfillment: value })}
                className={cn(
                  'inline-flex cursor-pointer items-center justify-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                  validFulfillment === value
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40 border',
                )}
              >
                {FULFILLMENT_LABEL[value]}
              </Link>
            ))}
          </div>
        </div>

        {/* 3. Lọc theo nguồn đơn */}
        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:gap-3">
          <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 font-medium sm:w-24">
            <Globe className="size-3.5" />
            <span>Kênh bán</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={filterHref({ source: '' })}
              className={cn(
                'inline-flex cursor-pointer items-center justify-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                !validSource
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40 border',
              )}
            >
              Tất cả
            </Link>
            <Link
              href={filterHref({ source: 'WEB' })}
              className={cn(
                'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                validSource === 'WEB'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40 border',
              )}
            >
              🌐 Web
            </Link>
            <Link
              href={filterHref({ source: 'TELEGRAM' })}
              className={cn(
                'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                validSource === 'TELEGRAM'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40 border',
              )}
            >
              📱 Telegram
            </Link>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Chi tiết giao dịch</CardTitle>
          <CardDescription>
            {validStatus || validFulfillment || validSource
              ? `Đang lọc: ${[
                  validStatus && paymentStatusLabel(validStatus),
                  validFulfillment && (FULFILLMENT_LABEL[validFulfillment] || validFulfillment),
                  validSource === 'TELEGRAM'
                    ? '📱 Telegram Bot'
                    : validSource === 'WEB'
                      ? '🌐 Web'
                      : null,
                ]
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
                      <td className="px-2 py-3 font-mono font-medium">
                        <div>{o.orderCode}</div>
                        <div className="mt-1">
                          {o.source === 'TELEGRAM' ? (
                            <span className="bg-info/10 text-info inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium">
                              📱 Telegram{o.telegramUsername ? ` @${o.telegramUsername}` : ''}
                            </span>
                          ) : (
                            <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]">
                              🌐 Web
                            </span>
                          )}
                        </div>
                      </td>
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
                          <div className="text-warning text-xs font-medium">
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
                        <Badge variant={paymentStatusBadgeVariant(o.status)} className="text-xs">
                          {paymentStatusLabel(o.status)}
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
