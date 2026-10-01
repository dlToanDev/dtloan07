import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireProductAdmin } from '@/server/actions/product';
import { listCategories } from '@/lib/shop/categories';
import { FormSection } from '@/components/admin/shop/form-section';
import { VoucherForm } from '@/components/admin/vouchers/voucher-form';
import { GrantManager } from '@/components/admin/vouchers/grant-manager';
import { paymentStatusLabel } from '@/lib/shop/labels';

export const dynamic = 'force-dynamic';

export default async function EditVoucherPage({ params }: { params: Promise<{ id: string }> }) {
  await requireProductAdmin();
  const { id } = await params;
  const [voucher, categories] = await Promise.all([
    db.coupon.findUnique({
      where: { id },
      include: {
        categories: { select: { id: true } },
        grants: {
          orderBy: { createdAt: 'desc' },
          take: 200,
          include: { user: { select: { email: true } } },
        },
        redemptions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { order: { select: { orderCode: true, status: true } } },
        },
      },
    }),
    listCategories(),
  ]);
  const proCount = await db.user.count({ where: { proUntil: { gt: new Date() } } });
  if (!voucher) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <Link href="/admin/vouchers" className="text-muted-foreground text-sm hover:underline">
          ← Voucher
        </Link>
        <h1 className="text-2xl font-bold">{voucher.name || voucher.code || 'Voucher'}</h1>
        <p className="text-muted-foreground text-sm">
          Đã dùng {voucher.usedCount}
          {voucher.maxUses !== null ? `/${voucher.maxUses}` : ''} lượt (gồm đơn đang chờ thanh
          toán).
        </p>
      </div>

      <VoucherForm
        key={voucher.updatedAt.toISOString()}
        categories={categories.map(({ id: categoryId, name }) => ({ id: categoryId, name }))}
        initial={{
          id: voucher.id,
          name: voucher.name,
          code: voucher.code ?? '',
          type: voucher.type,
          value: voucher.value,
          maxDiscountVnd: voucher.maxDiscountVnd,
          minOrderVnd: voucher.minOrderVnd,
          scope: voucher.scope,
          categoryIds: voucher.categories.map((category) => category.id),
          maxUses: voucher.maxUses,
          perUserLimit: voucher.perUserLimit,
          startsAt: voucher.startsAt?.toISOString() ?? null,
          endsAt: voucher.endsAt?.toISOString() ?? null,
          active: voucher.active,
          proOnly: voucher.proOnly,
        }}
      />

      <FormSection
        title="Mã riêng đã phát"
        hint="Tặng mã dùng một lần cho một tài khoản. Khách xem mã trong Tài khoản → Mã của tôi."
      >
        <GrantManager
          couponId={voucher.id}
          proCount={proCount}
          initial={voucher.grants.map((grant) => ({
            id: grant.id,
            code: grant.code,
            email: grant.user.email ?? '',
            source: grant.source,
            note: grant.note,
            usedAt: grant.usedAt?.toISOString() ?? null,
            createdAt: grant.createdAt.toISOString(),
          }))}
        />
      </FormSection>

      <FormSection title="Đơn dùng voucher gần đây">
        {voucher.redemptions.length === 0 ? (
          <p className="text-muted-foreground text-sm">Chưa có đơn nào.</p>
        ) : (
          <ul className="border-border divide-border divide-y rounded-lg border text-sm">
            {voucher.redemptions.map((redemption) => (
              <li key={redemption.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <Link
                  href={`/admin/orders/${redemption.orderId}`}
                  className="font-mono font-semibold hover:underline"
                >
                  {redemption.order.orderCode}
                </Link>
                <span className="text-muted-foreground min-w-0 flex-1 truncate">
                  {redemption.email} · {paymentStatusLabel(redemption.order.status)}
                </span>
                <span className="font-medium text-emerald-600">
                  -{redemption.discountVnd.toLocaleString('vi-VN')} đ
                </span>
              </li>
            ))}
          </ul>
        )}
      </FormSection>
    </div>
  );
}
