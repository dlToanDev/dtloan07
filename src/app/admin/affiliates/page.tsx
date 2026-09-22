import { db } from '@/lib/db';
import { AffiliateManager } from '@/components/admin/affiliate-manager';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý Affiliate & Link Kiếm Tiền - Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminAffiliatesPage() {
  const items = await db.affiliateItem.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Quản lý Affiliate & Link Kiếm Tiền ({items.length})</h2>
        <p className="text-muted-foreground text-sm">
          Nhập link trực tiếp, tự động rút gọn link kiếm tiền (MegaURL, Ouo, Shorte.st) và theo dõi
          lượt click.
        </p>
      </div>

      <AffiliateManager initialItems={items} />
    </div>
  );
}
