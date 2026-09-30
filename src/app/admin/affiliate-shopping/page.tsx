import { db } from '@/lib/db';
import { serverEnv } from '@/config/env';
import { ShoppingAffiliateManager } from '@/components/admin/affiliate-shopping-manager';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Affiliate TikTok & Shopee - Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminShoppingAffiliatePage() {
  let items: Awaited<ReturnType<typeof db.affiliateItem.findMany>> = [];
  try {
    items = await db.affiliateItem.findMany({
      where: {
        category: {
          in: ['SHOPPING', 'SHOPEE', 'TIKTOK'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.warn('Lỗi tải sản phẩm Shopee/TikTok:', err);
  }

  return (
    <div className="space-y-6">
      <ShoppingAffiliateManager
        initialItems={items}
        shortenerConfigured={Boolean(serverEnv.SHORTENER_API_URL && serverEnv.SHORTENER_API_KEY)}
      />
    </div>
  );
}
