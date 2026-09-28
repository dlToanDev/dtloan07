import Link from 'next/link';
import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { ProductCard } from '@/components/shop/product-card';
import { buildMetadata } from '@/lib/seo';
import { buildShopWhere, parseShopFilters, type ShopFilters } from '@/lib/shop/filters';
import { CONDITION_OPTIONS } from '@/lib/shop/labels';
import { summarizeVariants } from '@/lib/shop/variants';
import type { Metadata } from 'next';
import { ShieldCheck, Zap, RefreshCw, FileCode } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: 'Shop sản phẩm của dltoan07',
  description:
    'Cửa hàng sản phẩm chính chủ của dltoan07, gồm source code, tài khoản số và đồ vật lý — tách biệt với sản phẩm affiliate.',
  pathname: '/shop',
});

/** Query có filter nên trang chạy động, không ISR. */
function loadProducts(filters: ShopFilters) {
  return db.product.findMany({
    where: buildShopWhere(filters),
    include: {
      variants: {
        include: { _count: { select: { accountStock: { where: { status: 'AVAILABLE' } } } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

function tabClass(active: boolean, small = false) {
  return `rounded-full border font-medium transition ${small ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'} ${
    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
  }`;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let categories: { id: string; name: string; slug: string; hasCondition: boolean }[] = [];
  try {
    // Chỉ hiện danh mục đang có sản phẩm bán, theo thứ tự admin sắp xếp.
    categories = await db.productCategory.findMany({
      where: { products: { some: { status: 'ACTIVE' } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, hasCondition: true },
    });
  } catch (err) {
    console.warn('Cảnh báo: Không thể tải danh mục shop:', err);
  }
  const filters = parseShopFilters(await searchParams, categories);
  let products: Awaited<ReturnType<typeof loadProducts>> = [];
  try {
    products = await loadProducts(filters);
  } catch (err) {
    console.warn('Cảnh báo: Không thể tải danh sách sản phẩm shop lúc build:', err);
  }

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

      {/* Lọc theo danh mục */}
      <div className="space-y-3">
        <nav className="flex flex-wrap gap-2" aria-label="Lọc danh mục">
          <Link href="/shop" className={tabClass(!filters.categoryId)}>
            Tất cả
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop?c=${category.slug}`}
              className={tabClass(filters.categoryId === category.id)}
            >
              {category.name}
            </Link>
          ))}
        </nav>
        {filters.hasCondition && (
          <nav className="flex flex-wrap gap-2" aria-label="Lọc tình trạng">
            <Link
              href={`/shop?c=${filters.categorySlug}`}
              className={tabClass(!filters.condition, true)}
            >
              Mọi tình trạng
            </Link>
            {CONDITION_OPTIONS.map((option) => (
              <Link
                key={option.slug}
                href={`/shop?c=${filters.categorySlug}&cond=${option.slug}`}
                className={tabClass(filters.condition === option.value, true)}
              >
                {option.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Grid sản phẩm */}
      {products.length === 0 ? (
        <div className="border-border text-muted-foreground space-y-2 rounded-xl border border-dashed p-12 text-center">
          {filters.categoryId ? (
            <>
              <p>Chưa có sản phẩm trong danh mục này.</p>
              <Link href="/shop" className="text-primary text-sm hover:underline">
                Xem tất cả sản phẩm
              </Link>
            </>
          ) : (
            <p>Shop đang được cập nhật sản phẩm mới. Vui lòng quay lại sau.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              shop={{
                type: product.type,
                condition: product.condition,
                summary: summarizeVariants(
                  product.variants.map((variant) => ({
                    ...variant,
                    // Tài khoản tự động: tồn kho là số dòng kho còn trống.
                    stock:
                      product.type === 'ACCOUNT' && product.deliveryMode === 'AUTO'
                        ? variant._count.accountStock
                        : variant.stock,
                  })),
                ),
              }}
            />
          ))}
        </div>
      )}

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
