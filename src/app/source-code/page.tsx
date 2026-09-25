import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { ProductCard } from '@/components/shop/product-card';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { ShieldCheck, Zap, RefreshCw, FileCode } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: 'Source Code — App & Tool',
  description:
    'Mã nguồn ứng dụng, tool, template và script do dltoan07 phát triển, hỗ trợ tải trực tiếp hoặc liên hệ đặt theo yêu cầu.',
  pathname: '/source-code',
});

export const revalidate = 3600; // ISR 1 giờ

export default async function SourceCodePage() {
  let products: Awaited<ReturnType<typeof db.product.findMany>> = [];
  try {
    products = await db.product.findMany({
      where: { status: 'ACTIVE', kind: 'SOURCE_CODE' },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.warn('Cảnh báo: Không thể tải danh sách source code lúc build:', err);
  }

  return (
    <Container className="space-y-12 py-12 sm:py-16">
      {/* Hero Header */}
      <div className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Source Code — App & Tool
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Mã nguồn app, tool và template do mình phát triển. Tải bản miễn phí, mua bản đặt giá để
          nhận file sau thanh toán, hoặc liên hệ báo giá cho source theo yêu cầu.
        </p>
      </div>

      {/* Grid sản phẩm */}
      {products.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-12 text-center">
          <p>Hiện chưa có source code nào đang mở bán. Vui lòng quay lại sau.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} catalog="source-code" />
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
            <h3 className="text-sm font-semibold">Tải ngay lập tức</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Nhận bản quyền và liên kết tải file bảo mật ngay sau khi hoàn tất thanh toán.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Bảo mật chuẩn A+</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Áp dụng các tiêu chuẩn bảo mật khắt khe nhất cho hạ tầng VPS và web server.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <FileCode className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Mã nguồn minh bạch</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              File cấu hình và scripts sạch sẽ, kèm hướng dẫn chi tiết từng dòng lệnh.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Cập nhật phiên bản</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Tải lại các bản vá lỗi và nâng cấp tương thích trong suốt vòng đời sản phẩm.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
