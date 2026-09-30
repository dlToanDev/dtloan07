import { ProductDescription } from '@/components/shop/product-description';
import { buttonStyles } from '@/components/ui/button';
import { db } from '@/lib/db';
import { Container } from '@/components/layout/container';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AddToCartButton } from '@/components/shop/add-to-cart-button';
import {
  ShieldCheck,
  FileArchive,
  Star,
  Truck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Home,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { ProductGallery } from '@/components/shop/product-gallery';
import { VariantPurchasePanel } from '@/components/shop/variant-purchase-panel';
import { ProductDetailTabs } from '@/components/shop/product-detail-tabs';
import { ProductCard } from '@/components/shop/product-card';
import { conditionLabel } from '@/lib/shop/labels';
import { pickDefaultVariant, summarizeVariants } from '@/lib/shop/variants';
import type { Prisma } from '@prisma/client';
import { siteConfig } from '@/config/site';

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

type RelatedProduct = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; name: true; slug: true } };
    variants: true;
  };
}>;

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
    pathname: `${siteConfig.shopPath}/${slug}`,
    noIndex: true,
  });
}

export async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  let product = null;
  let relatedItems: RelatedProduct[] = [];

  try {
    product = await db.product.findUnique({
      where: { slug },
      include: {
        files: true,
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: { _count: { select: { accountStock: { where: { status: 'AVAILABLE' } } } } },
        },
      },
    });

    if (product) {
      // 1. Ưu tiên lấy các sản phẩm CÙNG DANH MỤC (Cùng loại: vd Áo -> Quần/Áo thời trang)
      const sameCategory = await db.product.findMany({
        where: {
          status: 'ACTIVE',
          id: { not: product.id },
          ...(product.categoryId ? { categoryId: product.categoryId } : { type: product.type }),
        },
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: {
            where: { active: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      });

      // 2. Nếu danh mục chưa đủ 4 sản phẩm, bổ sung thêm sản phẩm cùng loại hàng
      if (sameCategory.length < 4) {
        const existingIds = [product.id, ...sameCategory.map((r) => r.id)];
        const additional = await db.product.findMany({
          where: {
            status: 'ACTIVE',
            id: { notIn: existingIds },
            type: product.type,
          },
          take: 4 - sameCategory.length,
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            variants: {
              where: { active: true },
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            },
          },
        });
        relatedItems = [...sameCategory, ...additional];
      } else {
        relatedItems = sameCategory;
      }
    }
  } catch (err) {
    console.warn('Cảnh báo: Không thể tải sản phẩm:', err);
  }

  if (!product || product.status !== 'ACTIVE') {
    notFound();
  }

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
    <Container className="max-w-7xl space-y-12 py-8 sm:py-12">
      {/* Breadcrumb điều hướng */}
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-1 text-xs"
      >
        <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
          <Home className="h-3.5 w-3.5" />
          <span>Trang chủ</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
        <Link href={siteConfig.shopPath} className="hover:text-foreground transition-colors">
          Shop
        </Link>
        {product.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
            <Link
              href={`${siteConfig.shopPath}?category=${product.category.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
        <span className="text-foreground max-w-xs truncate font-semibold sm:max-w-md">
          {product.name}
        </span>
      </nav>

      {/* BỐ CỤC 2 CỘT: Cột trái cuộn tự do, Cột phải CỐ ĐỊNH (STICKY) đứng yên một chỗ */}
      <div className="grid gap-10 lg:grid-cols-12">
        {/* CỘT TRÁI (lg:col-span-7 hoặc lg:col-span-8): Cuộn nội dung dài */}
        <div className="min-w-0 space-y-8 lg:col-span-7">
          {/* Thông tin tiêu đề & mô tả ngắn của sản phẩm */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {product.category && (
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-medium"
                >
                  {product.category.name}
                </Badge>
              )}
              {product.condition && (
                <Badge variant="outline" className="px-2.5 py-1 text-xs font-semibold">
                  {conditionLabel(product.condition)}
                </Badge>
              )}
              <Badge variant="outline" className="text-muted-foreground px-2.5 py-1 text-xs">
                {product.type === 'PHYSICAL'
                  ? 'Hàng vật lý'
                  : product.type === 'ACCOUNT'
                    ? 'Tài khoản'
                    : `Phiên bản v${product.version}`}
              </Badge>
            </div>

            <h1 className="text-foreground text-2xl leading-tight font-black tracking-tight sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>

            {/* Đánh giá sao & Lượt bán */}
            <div className="text-muted-foreground flex flex-wrap items-center gap-3 pt-1 text-xs sm:text-sm">
              <div className="flex items-center gap-1 font-bold text-amber-500">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-foreground ml-1">5.0</span>
              </div>
              <span className="text-border">|</span>
              <span>48 đánh giá</span>
              <span className="text-border">|</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Đã bán 120+
              </span>
            </div>

            <p className="text-muted-foreground pt-1 text-base leading-relaxed sm:text-lg">
              {product.shortDesc}
            </p>
          </div>

          {/* Thư viện hình ảnh sản phẩm tương tác (Chuyển ảnh mượt mà, thumbnails, phóng to) */}
          <ProductGallery
            name={product.name}
            slug={product.slug}
            type={product.type}
            coverUrl={product.coverUrl}
            gallery={product.gallery}
            version={isShopGoods ? undefined : product.version}
          />

          {/* Khối Tabs chi tiết (Mô tả, Bảng size & Thông số, Chính sách đổi trả, Đánh giá) */}
          <div className="pt-4">
            <ProductDetailTabs product={product}>
              {product.description.trim() ? (
                <ProductDescription source={product.description} />
              ) : (
                <p className="text-muted-foreground italic">
                  Đang cập nhật nội dung mô tả chi tiết cho sản phẩm này.
                </p>
              )}
            </ProductDetailTabs>
          </div>

          {/* Tệp đính kèm cho sản phẩm số nếu có */}
          {!isShopGoods && product.files.length > 0 && (
            <div className="border-border space-y-3 border-t pt-4">
              <h3 className="text-foreground text-base font-bold">
                Gói tài liệu đính kèm ({product.files.length} file)
              </h3>
              <div className="divide-border border-border bg-card divide-y rounded-xl border p-3">
                {product.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileArchive className="text-primary h-4 w-4 shrink-0" />
                      <span className="truncate font-medium">{file.label}</span>
                    </div>
                    <span className="text-muted-foreground ml-2 font-mono text-xs">
                      v{file.version}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI (lg:col-span-5): KHUNG MUA HÀNG CỐ ĐỊNH (STICKY TOP-24) LUÔN TRONG TẦM MẮT */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 z-10 space-y-4">
            <Card className="border-border/80 bg-card space-y-6 rounded-2xl border p-5 shadow-xl sm:p-6">
              {/* KHỐI MUA HÀNG VẬT LÝ / TÀI KHOẢN (VARIANT PANEL) */}
              {isShopGoods ? (
                <>
                  <VariantPurchasePanel
                    productId={product.id}
                    type={product.type}
                    deliveryMode={product.deliveryMode}
                    variants={variants}
                  />

                  {/* Cam kết giao nhận & kiểm hàng */}
                  <div className="border-border text-muted-foreground space-y-2 border-t pt-4 text-xs">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span>Phí ship tính theo tỉnh khi thanh toán</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span>Được kiểm tra hàng trước khi nhận</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 shrink-0 text-indigo-500" />
                      <span>Hỗ trợ đổi size miễn phí trong 7 ngày</span>
                    </div>
                  </div>
                </>
              ) : (
                /* KHỐI MUA SOURCE CODE / DOWNLOAD */
                <div className="space-y-6">
                  <div className="bg-muted/40 border-border/60 space-y-1.5 rounded-xl border p-4">
                    <div className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Giá sở hữu trọn đời
                    </div>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="text-foreground text-primary text-3xl font-black tracking-tight sm:text-4xl">
                        {mode === 'FREE'
                          ? 'Miễn phí'
                          : mode === 'CONTACT'
                            ? 'Liên hệ báo giá'
                            : `${product.priceVnd.toLocaleString('vi-VN')} đ`}
                      </span>
                      {mode === 'PAID' &&
                        product.compareAtVnd &&
                        product.compareAtVnd > product.priceVnd && (
                          <>
                            <span className="text-muted-foreground text-lg line-through">
                              {product.compareAtVnd.toLocaleString('vi-VN')} đ
                            </span>
                            {discountPercent && (
                              <Badge
                                variant="destructive"
                                className="px-2 py-0.5 text-xs font-bold shadow-xs"
                              >
                                -{discountPercent}%
                              </Badge>
                            )}
                          </>
                        )}
                    </div>
                    <p className="text-muted-foreground flex items-center gap-1 pt-1 text-xs">
                      <Sparkles className="text-primary h-3.5 w-3.5" />
                      Tải file ngay lập tức sau khi xác nhận thanh toán
                    </p>
                  </div>

                  {/* Nút thanh toán hoặc tải về */}
                  <div>
                    {mode === 'PAID' ? (
                      <AddToCartButton
                        productId={product.id}
                        variantId={pickDefaultVariant(variants)?.id}
                      />
                    ) : mode === 'CONTACT' ? (
                      <Link
                        href="/about#lien-he"
                        className={buttonStyles({
                          size: 'lg',
                          className: 'h-12 w-full text-sm font-semibold',
                        })}
                      >
                        Liên hệ báo giá dự án
                      </Link>
                    ) : product.files.length > 0 ? (
                      <a
                        href={`/api/products/${product.id}/download`}
                        className={buttonStyles({
                          size: 'lg',
                          className: 'h-12 w-full text-sm font-semibold',
                        })}
                      >
                        Tải source code miễn phí
                      </a>
                    ) : (
                      <p className="text-muted-foreground text-sm">Chưa có file để tải.</p>
                    )}
                  </div>

                  <div className="border-border text-muted-foreground space-y-2 border-t pt-4 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span>Tối đa {product.maxDownloads} lượt tải về an toàn</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span>Hỗ trợ kỹ thuật cấu hình trực tiếp từ tác giả</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* SẢN PHẨM CÙNG LOẠI GỢI Ý (RELATED PRODUCTS) */}
      {relatedItems.length > 0 && (
        <div className="border-border/80 space-y-6 border-t pt-12">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Tag className="text-primary h-5 w-5" />
                <h2 className="text-foreground text-2xl font-bold tracking-tight">
                  Gợi ý sản phẩm cùng loại bạn có thể thích
                </h2>
              </div>
              <p className="text-muted-foreground text-sm">
                {product.category
                  ? `Các sản phẩm thuộc nhóm "${product.category.name}" được gợi ý phù hợp nhất`
                  : 'Các sản phẩm tương tự đang bán chạy tại shop'}
              </p>
            </div>
            <Link
              href={siteConfig.shopPath}
              className="text-primary hidden items-center gap-1 text-sm font-semibold hover:underline sm:inline-flex"
            >
              Xem tất cả <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedItems.map((item) => {
              const summary = summarizeVariants(
                item.variants.map((v) => ({
                  id: v.id,
                  name: v.name,
                  priceVnd: v.priceVnd,
                  compareAtVnd: v.compareAtVnd,
                  stock: v.stock,
                  sortOrder: v.sortOrder,
                  active: v.active,
                })),
              );

              return (
                <ProductCard
                  key={item.id}
                  product={{
                    id: item.id,
                    slug: item.slug,
                    name: item.name,
                    shortDesc: item.shortDesc,
                    priceVnd: item.priceVnd,
                    saleMode: item.saleMode,
                    compareAtVnd: item.compareAtVnd,
                    coverUrl: item.coverUrl,
                    version: item.version,
                    maxDownloads: item.maxDownloads,
                  }}
                  shop={{
                    type: item.type,
                    condition: item.condition,
                    summary,
                  }}
                  variant="grid"
                />
              );
            })}
          </div>
        </div>
      )}
    </Container>
  );
}
