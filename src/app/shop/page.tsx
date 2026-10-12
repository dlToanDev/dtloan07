import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { ShopProductList } from '@/components/shop/shop-product-list';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = buildMetadata({
  title: 'Shop sản phẩm | dltoan07',
  description:
    'Cửa hàng sản phẩm chính chủ của dltoan07, gồm source code, tài khoản số và đồ vật lý.',
  pathname: '/shop',
});

import { unstable_cache } from 'next/cache';

/** Cache danh sách sản phẩm hiển thị trong Shop (60s), tự revalidate khi admin cập nhật */
const getShopProductsCached = unstable_cache(
  async () => {
    return db.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        category: true,
        variants: {
          include: { _count: { select: { accountStock: { where: { status: 'AVAILABLE' } } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  ['shop-active-products-catalog'],
  { revalidate: 60, tags: ['products', 'shop'] },
);

/** Cache danh sách danh mục có sản phẩm (120s) */
const getShopCategoriesCached = unstable_cache(
  async () => {
    return db.productCategory.findMany({
      where: { products: { some: { status: 'ACTIVE' } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, hasCondition: true },
    });
  },
  ['shop-active-categories-catalog'],
  { revalidate: 120, tags: ['categories', 'shop'] },
);

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [categoriesResult, productsResult] = await Promise.allSettled([
    getShopCategoriesCached(),
    getShopProductsCached(),
  ]);

  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const products = productsResult.status === 'fulfilled' ? productsResult.value : [];

  const params = await searchParams;
  const initialCategorySlug = typeof params.c === 'string' ? params.c : 'all';

  return (
    <Container className="py-8 sm:py-10">
      {/* Vào thẳng danh sách & bộ lọc sản phẩm */}
      <ShopProductList
        products={products}
        categories={categories}
        initialCategorySlug={initialCategorySlug}
      />
    </Container>
  );
}
