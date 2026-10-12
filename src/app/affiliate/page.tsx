import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { AffiliateList } from '@/components/affiliate/affiliate-list';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Affiliate | Shopee & TikTok Shop',
  description: 'Sản phẩm chọn lọc từ Shopee, TikTok Shop và các nền tảng thương mại điện tử.',
  pathname: '/affiliate',
});

export default async function AffiliatePage() {
  let deals: Awaited<ReturnType<typeof db.affiliateItem.findMany>> = [];
  try {
    deals = await db.affiliateItem.findMany({
      where: { active: true, category: { not: 'TOOLCODE' } },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });
  } catch (err) {
    console.warn('Cảnh báo: Không thể tải danh sách affiliate lúc build/request:', err);
  }

  return (
    <Container className="py-8 sm:py-10">
      {/* Vào thẳng bộ lọc & danh sách sản phẩm */}
      <AffiliateList initialDeals={deals} />
    </Container>
  );
}
