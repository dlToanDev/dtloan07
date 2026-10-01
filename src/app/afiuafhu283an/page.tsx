import Link from 'next/link';
import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { ShopProductList } from '@/components/shop/shop-product-list';
import { buildMetadata } from '@/lib/seo';
import { buildShopWhere, parseShopFilters, type ShopFilters } from '@/lib/shop/filters';
import { CONDITION_OPTIONS } from '@/lib/shop/labels';
import { summarizeVariants } from '@/lib/shop/variants';
import type { Metadata } from 'next';
import { ShieldCheck, Zap, RefreshCw, FileCode } from 'lucide-react';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = buildMetadata({
  title: 'Shop sản phẩm của dltoan07',
  description:
    'Cửa hàng sản phẩm chính chủ của dltoan07, gồm source code, tài khoản số và đồ vật lý — tách biệt với sản phẩm affiliate.',
  pathname: siteConfig.shopPath,
  noIndex: true,
});

/** Query có filter nên trang chạy động, không ISR. */
function loadProducts() {
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
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [categoriesResult, productsResult] = await Promise.allSettled([
    db.productCategory.findMany({
      where: { products: { some: { status: 'ACTIVE' } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, hasCondition: true },
    }),
    loadProducts(),
  ]);

  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const products = productsResult.status === 'fulfilled' ? productsResult.value : [];

  const params = await searchParams;
  const initialCategorySlug = typeof params.c === 'string' ? params.c : 'all';

  return (
    <Container className="space-y-12 py-12 sm:py-16">
      {/* Hero Header */}
      <div className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Shop của dltoan07</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Nơi bán các sản phẩm chính chủ của mình. Sản phẩm tại đây có giá, giỏ hàng và thanh toán
          riêng, không trộn lẫn với các liên kết affiliate.
        </p>
      </div>

      {/* Danh sách, Bộ lọc đa tiêu chí, Tìm kiếm & Phân trang sản phẩm */}
      <ShopProductList
        products={products}
        categories={categories}
        initialCategorySlug={initialCategorySlug}
      />

      {/* Cam kết chất lượng */}
      <div className="border-border grid gap-6 border-t pt-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Sản phẩm chính chủ</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Sản phẩm do dltoan07 trực tiếp cung cấp, không phải liên kết affiliate.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Thanh toán rõ ràng</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Giá bán được công khai và đơn hàng được xác nhận trong hệ thống.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <FileCode className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Không qua trung gian</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Shop riêng được tách hoàn toàn khỏi các sản phẩm giới thiệu Affiliate.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Hỗ trợ sau mua</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Có kênh hỗ trợ riêng khi bạn cần tư vấn hoặc xử lý vấn đề đơn hàng.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
