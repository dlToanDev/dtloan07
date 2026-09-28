import Link from 'next/link';
import { db } from '@/lib/db';
import { requireProductAdmin } from '@/server/actions/product';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { VoucherRowActions } from '@/components/admin/vouchers/voucher-row-actions';
import { describeVoucher, voucherStatus } from '@/lib/coupon-labels';

export const dynamic = 'force-dynamic';

const dateVi = (date: Date | null) => (date ? date.toLocaleDateString('vi-VN') : '');

export default async function AdminVouchersPage() {
  await requireProductAdmin();
  const vouchers = await db.coupon
    .findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        categories: { select: { name: true } },
        _count: { select: { grants: true } },
      },
    })
    .catch((err) => {
      console.warn('Lỗi tải voucher:', err);
      return [];
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Voucher ({vouchers.length})</h1>
          <p className="text-muted-foreground text-sm">
            Mã giảm tiền, giảm % hoặc free ship cho Shop. Mã công khai để ghi trong bài viết, mã
            riêng để tặng từng khách.
          </p>
        </div>
        <Link href="/admin/vouchers/new" className={buttonStyles({})}>
          + Tạo voucher
        </Link>
      </div>

      {vouchers.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Chưa có voucher nào.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs uppercase">
                <th className="px-3 py-3">Voucher</th>
                <th className="px-3 py-3">Mức giảm</th>
                <th className="px-3 py-3">Áp dụng</th>
                <th className="px-3 py-3 text-center">Đã dùng</th>
                <th className="px-3 py-3">Thời gian</th>
                <th className="px-3 py-3 text-center">Trạng thái</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {vouchers.map((voucher) => {
                const status = voucherStatus(voucher);
                return (
                  <tr key={voucher.id} className="hover:bg-muted/30">
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/vouchers/${voucher.id}`}
                        className="text-foreground font-semibold hover:underline"
                      >
                        {voucher.name || voucher.code || 'Voucher'}
                      </Link>
                      <div className="text-muted-foreground font-mono text-xs">
                        {voucher.code ?? 'Chỉ mã riêng'}
                        {voucher._count.grants > 0 && ` · ${voucher._count.grants} mã riêng`}
                      </div>
                      {voucher.proOnly && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          Chỉ Pro
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs">{describeVoucher(voucher)}</td>
                    <td className="px-3 py-3 text-xs">
                      {voucher.scope === 'ALL'
                        ? 'Toàn Shop'
                        : voucher.categories.map((category) => category.name).join(', ')}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-xs">
                      {voucher.usedCount}
                      {voucher.maxUses !== null ? `/${voucher.maxUses}` : ''}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {voucher.startsAt || voucher.endsAt
                        ? `${dateVi(voucher.startsAt) || '…'} → ${dateVi(voucher.endsAt) || '…'}`
                        : 'Không giới hạn'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Badge
                        variant={status.tone === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <VoucherRowActions id={voucher.id} active={voucher.active} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
