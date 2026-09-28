import Link from 'next/link';
import type { Metadata } from 'next';
import { CheckCircle2, Crown, Clock } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { buttonStyles } from '@/components/ui/button';
import { BuyProButton } from '@/components/pro/buy-pro-button';
import { buildMetadata } from '@/lib/seo';
import {
  isPro,
  PRO_BENEFITS,
  PRO_PLANS,
  proDaysLeft,
  type MembershipPlanValue,
} from '@/lib/membership';

export const metadata: Metadata = buildMetadata({
  title: 'Tài khoản Pro',
  description:
    'Nâng cấp tài khoản Pro: đăng bài viết, luôn miễn phí ship và nhận voucher bí mật dành riêng cho Pro.',
  pathname: '/pro',
});

export const dynamic = 'force-dynamic';

const PLAN_ORDER: MembershipPlanValue[] = ['PRO_MONTH', 'PRO_YEAR'];

export default async function ProPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; cancelled?: string }>;
}) {
  const { order: orderCode, cancelled } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;
  const [user, order] = await Promise.all([
    userId ? db.user.findUnique({ where: { id: userId }, select: { proUntil: true } }) : null,
    orderCode && userId
      ? db.order.findFirst({
          where: { orderCode, userId, membershipPlan: { not: null } },
          select: { status: true, membershipPlan: true },
        })
      : null,
  ]);
  const pro = isPro(user);
  const daysLeft = proDaysLeft(user?.proUntil ?? null);

  return (
    <Container className="space-y-10 py-12 sm:py-16">
      <div className="max-w-2xl space-y-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <Crown className="size-3.5" /> Tài khoản Pro
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Nâng cấp lên Pro</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Tài khoản thường xem bài, bình luận và mua hàng. Pro mở thêm quyền đăng bài cùng các ưu
          đãi riêng.
        </p>
      </div>

      {order?.status === 'PAID' && (
        <p
          role="status"
          className="rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400"
        >
          Thanh toán thành công — tài khoản của bạn đã được kích hoạt{' '}
          {PRO_PLANS[order.membershipPlan!].label}.
        </p>
      )}
      {order && order.status === 'PENDING' && (
        <p
          role="status"
          className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400"
        >
          Đang chờ xác nhận thanh toán. Tải lại trang sau ít phút nếu Pro chưa được kích hoạt.
        </p>
      )}
      {cancelled && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          Bạn đã hủy thanh toán. Có thể chọn lại gói bất cứ lúc nào.
        </p>
      )}

      {pro && user?.proUntil && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <Clock className="size-4 text-amber-600" />
          <span>
            Bạn đang là <strong>Pro</strong> tới{' '}
            <strong>{user.proUntil.toLocaleDateString('vi-VN')}</strong> (còn {daysLeft} ngày). Mua
            thêm sẽ cộng dồn vào hạn hiện tại.
          </span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {PLAN_ORDER.map((key) => {
          const plan = PRO_PLANS[key];
          const highlight = key === 'PRO_YEAR';
          return (
            <div
              key={key}
              className={`bg-card flex flex-col gap-5 rounded-2xl border p-6 ${
                highlight ? 'border-amber-500/50 ring-1 ring-amber-500/30' : 'border-border'
              }`}
            >
              <div className="space-y-1">
                <h2 className="text-lg font-bold">{plan.label}</h2>
                <p className="text-3xl font-extrabold">
                  {plan.priceVnd.toLocaleString('vi-VN')} đ
                  <span className="text-muted-foreground text-sm font-medium">
                    {' '}
                    / {plan.days} ngày
                  </span>
                </p>
                <p className="text-muted-foreground text-sm">{plan.hint}</p>
              </div>
              <ul className="flex-1 space-y-2 text-sm">
                {PRO_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {benefit}
                  </li>
                ))}
              </ul>
              {userId ? (
                <BuyProButton
                  plan={key}
                  highlight={highlight}
                  label={pro ? `Gia hạn ${plan.label}` : `Mua ${plan.label}`}
                />
              ) : (
                <Link
                  href="/login?callbackUrl=/pro"
                  className={buttonStyles({ variant: highlight ? 'primary' : 'outline' })}
                >
                  Đăng nhập để mua
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground text-xs">
        Thanh toán một lần qua VietQR (PayOS), không tự động trừ tiền. Hết hạn thì tài khoản trở về
        gói thường; bạn gia hạn khi cần.
      </p>
    </Container>
  );
}
