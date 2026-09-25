import { ProductDescription } from '@/components/shop/product-description';
import { buttonStyles } from '@/components/ui/button';
import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AddToCartButton } from '@/components/shop/add-to-cart-button';
import { ShieldCheck, FileArchive, CheckCircle2, Clock, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { ProductCover } from '@/components/shop/product-cover';

interface Props {
  kind: 'SOURCE_CODE' | 'SHOP';
  params: Promise<{
    slug: string;
  }>;
}

export async function productMetadata({ params, kind }: Props): Promise<Metadata> {
  const { slug } = await params;
  let product = null;
  try {
    product = await db.product.findUnique({
      where: { slug },
    });
  } catch {
    return {};
  }

  if (!product || product.kind !== kind || product.status !== 'ACTIVE') return {};

  return buildMetadata({
    title: product.name,
    description: product.shortDesc,
    pathname: `/${kind === 'SOURCE_CODE' ? 'source-code' : 'shop'}/${slug}`,
  });
}

export async function ProductDetailPage({ params, kind }: Props) {
  const { slug } = await params;
  let product = null;
  try {
    product = await db.product.findUnique({
      where: { slug },
      include: { files: true },
    });
  } catch (err) {
    console.warn('Cảnh báo: Không thể tải sản phẩm lúc build:', err);
  }

  if (!product || product.kind !== kind || product.status !== 'ACTIVE') {
    notFound();
  }

  const catalogHref = product.kind === 'SOURCE_CODE' ? '/source-code' : '/shop';
  const catalogLabel = product.kind === 'SOURCE_CODE' ? 'Source Code' : 'Shop';

  const mode = product.saleMode || (product.priceVnd === 0 ? 'FREE' : 'PAID');
  const discountPercent =
    mode === 'PAID' && product.compareAtVnd && product.compareAtVnd > product.priceVnd
      ? Math.round(((product.compareAtVnd - product.priceVnd) / product.compareAtVnd) * 100)
      : null;

  return (
    <Container className="py-12 sm:py-16">
      {/* Breadcrumb */}
      <nav className="text-muted-foreground mb-8 flex items-center gap-2 text-xs">
        <Link href="/" className="hover:text-foreground">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href={catalogHref} className="hover:text-foreground">
          {catalogLabel}
        </Link>
        <span>/</span>
        <span className="text-foreground max-w-xs truncate font-medium">{product.name}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-3">
        {/* Cột trái: Nội dung chi tiết */}
        <div className="space-y-8 lg:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                Phiên bản {product.version}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {product.kind === 'SOURCE_CODE' ? 'Source Code chính chủ' : 'Sản phẩm chính chủ'}
              </Badge>
            </div>
            <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
              {product.name}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">{product.shortDesc}</p>
          </div>

          <ProductCover
            name={product.name}
            slug={product.slug}
            coverUrl={product.coverUrl}
            kind={product.kind}
            version={product.version}
            className="border-border rounded-xl border"
          />

          {/* Khung mô tả chi tiết */}
          <div className="border-border bg-card space-y-6 rounded-xl border p-6 sm:p-8">
            <h2 className="text-foreground text-xl font-bold">Mô tả sản phẩm & Hướng dẫn</h2>
            <ProductDescription source={product.description} />
          </div>

          {/* Danh sách tệp đính kèm */}
          <div className="space-y-4">
            <h2 className="text-foreground text-lg font-bold">Gói tài liệu đính kèm</h2>
            <div className="divide-border border-border bg-card divide-y rounded-xl border p-4">
              {product.files.map((file) => {
                const sizeKb = Number(file.sizeBytes) / 1024;
                const sizeStr =
                  sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.round(sizeKb)} KB`;

                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                        <FileArchive className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-foreground text-sm font-semibold">{file.label}</div>
                        <div className="text-muted-foreground text-xs">
                          Phiên bản {file.version} &bull; {sizeStr}
                        </div>
                      </div>
                    </div>
                    {mode === 'FREE' ? (
                      <a
                        className={buttonStyles({ size: 'sm' })}
                        href={`/api/products/${product.id}/download?fileId=${file.id}`}
                      >
                        Tải miễn phí
                      </a>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {mode === 'CONTACT' ? 'Liên hệ để nhận file' : 'Tải sau thanh toán'}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cột phải: Khung mua hàng (Sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card className="border-primary/20 shadow-lg">
              <CardContent className="space-y-6 p-6">
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Giá sở hữu vĩnh viễn
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-foreground text-3xl font-extrabold">
                      {mode === 'FREE'
                        ? 'Miễn phí'
                        : mode === 'CONTACT'
                          ? 'Liên hệ báo giá'
                          : `${product.priceVnd.toLocaleString('vi-VN')} đ`}
                    </span>
                    {mode === 'PAID' &&
                      product.compareAtVnd &&
                      product.compareAtVnd > product.priceVnd && (
                        <span className="text-muted-foreground text-base line-through">
                          {product.compareAtVnd.toLocaleString('vi-VN')} đ
                        </span>
                      )}
                    {discountPercent && (
                      <Badge variant="destructive" className="text-xs font-bold">
                        -{discountPercent}%
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="border-border text-muted-foreground space-y-3 border-t pt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>
                      {mode === 'FREE'
                        ? 'Tải miễn phí, không cần thanh toán'
                        : mode === 'CONTACT'
                          ? 'Liên hệ để trao đổi giá và bàn giao'
                          : `Quyền tải xuống: tối đa ${product.maxDownloads} lượt tải`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Liên kết tải file có thời hạn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Thông tin phiên bản và file đính kèm rõ ràng</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Hỗ trợ kỹ thuật triển khai trực tiếp</span>
                  </div>
                </div>

                <div className="pt-2">
                  {mode === 'PAID' ? (
                    <AddToCartButton productId={product.id} />
                  ) : mode === 'CONTACT' ? (
                    <Link href="/about#lien-he" className={buttonStyles({ className: 'w-full' })}>
                      Liên hệ báo giá
                    </Link>
                  ) : product.files.length > 0 ? (
                    <a
                      href={`/api/products/${product.id}/download`}
                      className={buttonStyles({ className: 'w-full' })}
                    >
                      Tải miễn phí
                    </a>
                  ) : (
                    <p>Chưa có file để tải.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Container>
  );
}
