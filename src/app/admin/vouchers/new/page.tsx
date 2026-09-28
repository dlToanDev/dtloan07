import Link from 'next/link';
import { requireProductAdmin } from '@/server/actions/product';
import { listCategories } from '@/lib/shop/categories';
import { VoucherForm } from '@/components/admin/vouchers/voucher-form';

export const dynamic = 'force-dynamic';

export default async function NewVoucherPage() {
  await requireProductAdmin();
  const categories = await listCategories();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <Link href="/admin/vouchers" className="text-muted-foreground text-sm hover:underline">
          ← Voucher
        </Link>
        <h1 className="text-2xl font-bold">Tạo voucher</h1>
      </div>
      <VoucherForm categories={categories.map(({ id, name }) => ({ id, name }))} />
    </div>
  );
}
