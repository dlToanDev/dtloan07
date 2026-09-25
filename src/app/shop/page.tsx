import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { ProductCard } from '@/components/shop/product-card';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { ShieldCheck, Zap, RefreshCw, FileCode } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: 'Shop sản phẩm của dltoan07',
  description:
    'Cửa hàng sản phẩm chính chủ của dltoan07, tách biệt hoàn toàn với sản phẩm affiliate và source code.',
  pathname: '/shop',
});

export const revalidate = 3600; // ISR 1 giờ

export default async function ShopPage() {
  let products: Awaited<ReturnType<typeof db.product.findMany>> = [];
  try {
    products = await db.product.findMany({
      where: { status: 'ACTIVE', kind: 'SHOP' },
      orderBy: { createdAt: 'desc' },
    });
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

      {/* Grid sản phẩm */}
      {products.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-12 text-center">
          <p>Shop đang được cập nhật sản phẩm mới. Vui lòng quay lại sau.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
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
