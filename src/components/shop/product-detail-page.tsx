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
import { ProductGallery } from '@/components/shop/product-gallery';
import { VariantPurchasePanel } from '@/components/shop/variant-purchase-panel';
import { conditionLabel } from '@/lib/shop/labels';
import { pickDefaultVariant } from '@/lib/shop/variants';

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export async function productMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let product = null;
  try {
    product = await db.product.findUnique({
      where: { slug },
    });
  } catch {
    return {};
  }

  if (!product || product.status !== 'ACTIVE') return {};

  return buildMetadata({
    title: product.name,
    description: product.shortDesc,
    pathname: `/shop/${slug}`,
  });
}

export async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  let product = null;
  try {
    product = await db.product.findUnique({
      where: { slug },
      include: {
        files: true,
        category: { select: { name: true } },
        variants: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: { _count: { select: { accountStock: { where: { status: 'AVAILABLE' } } } } },
        },
      },
    });
  } catch (err) {
    console.warn('Cảnh báo: Không thể tải sản phẩm lúc build:', err);
  }

  if (!product || product.status !== 'ACTIVE') {
    notFound();
  }

  // Hàng cần giao (đồ vật lý / tài khoản): giá và nút mua lấy theo biến thể.
  const isShopGoods = product.type !== 'DOWNLOAD';
  const variants = product.variants.map((variant) => ({
    id: variant.id,
    name: variant.name,
    priceVnd: variant.priceVnd,
    compareAtVnd: variant.compareAtVnd,
    stock: variant.stock,
    sortOrder: variant.sortOrder,
    active: variant.active,
    availableAccounts: variant._count.accountStock,
  }));

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
        <Link href="/shop" className="hover:text-foreground">
          Shop
        </Link>
        <span>/</span>
        <span className="text-foreground max-w-xs truncate font-medium">{product.name}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-3">
        {/* Cột trái: Nội dung chi tiết */}
        <div className="space-y-8 lg:col-span-2">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {isShopGoods ? (
                <>
                  {product.category && <Badge variant="secondary">{product.category.name}</Badge>}
                  {product.condition && (
                    <Badge variant="secondary">{conditionLabel(product.condition)}</Badge>
                  )}
                </>
              ) : (
                <Badge variant="secondary" className="font-mono">
                  Phiên bản {product.version}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {isShopGoods ? 'Sản phẩm chính chủ' : 'Source Code chính chủ'}
              </Badge>
            </div>
            <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
              {product.name}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">{product.shortDesc}</p>
          </div>

          <ProductGallery
            name={product.name}
            slug={product.slug}
            type={product.type}
            coverUrl={product.coverUrl}
            gallery={product.gallery}
            version={isShopGoods ? undefined : product.version}
          />

          {/* Khung mô tả chi tiết (không bắt buộc) */}
          {product.description.trim() && (
            <div className="border-border bg-card space-y-6 rounded-xl border p-6 sm:p-8">
              <h2 className="text-foreground text-xl font-bold">Mô tả sản phẩm & Hướng dẫn</h2>
              <ProductDescription source={product.description} />
            </div>
          )}

          {/* Tình trạng & bảo hành (hàng Shop) */}
          {isShopGoods && (product.conditionNote || product.warrantyNote) && (
            <div className="border-border bg-card grid gap-4 rounded-xl border p-6 sm:grid-cols-2">
              {product.conditionNote && (
                <div>
                  <h3 className="text-sm font-semibold">
                    Tình trạng: {conditionLabel(product.condition)}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm whitespace-pre-line">
                    {product.conditionNote}
                  </p>
                </div>
              )}
              {product.warrantyNote && (
                <div>
                  <h3 className="text-sm font-semibold">Bảo hành</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{product.warrantyNote}</p>
                </div>
              )}
            </div>
          )}

          {/* Danh sách tệp đính kèm */}
          {!isShopGoods && (
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
          )}
        </div>

        {/* Cột phải: Khung mua hàng (Sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card className="border-primary/20 shadow-lg">
              <CardContent className="space-y-6 p-6">
                {isShopGoods ? (
                  <>
                    <VariantPurchasePanel
                      productId={product.id}
                      type={product.type}
                      deliveryMode={product.deliveryMode}
                      variants={variants}
                    />

                    <div className="border-border text-muted-foreground space-y-3 border-t pt-4 text-xs">
                      {product.type === 'PHYSICAL' ? (
                        <>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                            <span>Phí ship tính theo tỉnh khi thanh toán</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                            <span>Kiểm tra hàng khi nhận</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0 text-emerald-500" />
                          <span>
                            {product.deliveryMode === 'AUTO'
                              ? 'Nhận thông tin tài khoản qua email ngay sau thanh toán'
                              : 'Bàn giao thủ công trong giờ làm việc'}
                          </span>
                        </div>
                      )}
                      {product.warrantyNote && (
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                          <span>{product.warrantyNote}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
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
                        <AddToCartButton
                          productId={product.id}
                          variantId={pickDefaultVariant(variants)?.id}
                        />
                      ) : mode === 'CONTACT' ? (
                        <Link
                          href="/about#lien-he"
                          className={buttonStyles({ className: 'w-full' })}
                        >
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
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Container>
  );
}
