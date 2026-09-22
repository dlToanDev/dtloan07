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

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  try {
    const products = await db.product.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true },
    });
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let product = null;
  try {
    product = await db.product.findUnique({
      where: { slug },
    });
  } catch {
    return {};
  }

  if (!product) return {};

  return buildMetadata({
    title: product.name,
    description: product.shortDesc,
    pathname: `/products/${slug}`,
  });
}

export default async function ProductDetailPage({ params }: Props) {
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

  if (!product || product.status !== 'ACTIVE') {
    notFound();
  }

  const discountPercent =
    product.compareAtVnd && product.compareAtVnd > product.priceVnd
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
        <Link href="/products" className="hover:text-foreground">
          Sản phẩm
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
                Sản phẩm số
              </Badge>
            </div>
            <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
              {product.name}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">{product.shortDesc}</p>
          </div>

          {/* Khung mô tả chi tiết */}
          <div className="border-border bg-card space-y-6 rounded-xl border p-6 sm:p-8">
            <h2 className="text-foreground text-xl font-bold">Mô tả sản phẩm & Hướng dẫn</h2>
            <div className="prose dark:prose-invert text-muted-foreground max-w-none text-sm leading-relaxed whitespace-pre-line sm:text-base">
              {product.description}
            </div>
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
                    <Badge variant="outline" className="text-xs">
                      Tải bảo mật
                    </Badge>
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
                      {product.priceVnd.toLocaleString('vi-VN')} đ
                    </span>
                    {product.compareAtVnd && product.compareAtVnd > product.priceVnd && (
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
                    <span>Quyền tải xuống: tối đa {product.maxDownloads} lượt tải</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Pre-signed URL bảo mật qua Cloudflare R2</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Cấp mã License cá nhân cho từng đơn hàng</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Hỗ trợ kỹ thuật triển khai trực tiếp</span>
                  </div>
                </div>

                <div className="pt-2">
                  <AddToCartButton productId={product.id} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Container>
  );
}
