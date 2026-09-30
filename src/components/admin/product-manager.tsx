import { requireProductAdmin } from '@/server/actions/product';
import { db } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import {
  Package,
  KeyRound,
  FileCode,
  Bot,
  Globe,
  Plus,
  ExternalLink,
  Edit3,
  Search,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Trash2,
  Layers,
} from 'lucide-react';
import type { ProductType, ProductStatus } from '@prisma/client';

interface ProductManagerProps {
  basePath?: string;
  searchParams?: {
    type?: string;
    status?: string;
    q?: string;
  };
}

export async function ProductManager({
  basePath = '/admin/products',
  searchParams,
}: ProductManagerProps) {
  const currentQuery = searchParams?.q?.trim() || '';
  const currentType = searchParams?.type || 'ALL';
  const currentStatus = searchParams?.status || 'ALL';

  let rawProducts: Awaited<
    ReturnType<
      typeof db.product.findMany<{
        include: {
          category: { select: { id: true; name: true } };
          files: { select: { id: true; label: true; version: true; filename: true } };
          variants: {
            select: {
              id: true;
              name: true;
              priceVnd: true;
              compareAtVnd: true;
              stock: true;
              active: true;
              accountStock: {
                where: { status: 'AVAILABLE' };
                select: { id: true };
              };
            };
          };
          _count: { select: { orderItems: true; licenses: true } };
        };
      }>
    >
  > = [];

  try {
    rawProducts = await db.product.findMany({
      include: {
        category: { select: { id: true, name: true } },
        files: { select: { id: true, label: true, version: true, filename: true } },
        variants: {
          select: {
            id: true,
            name: true,
            priceVnd: true,
            compareAtVnd: true,
            stock: true,
            active: true,
            accountStock: {
              where: { status: 'AVAILABLE' },
              select: { id: true },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
        _count: {
          select: {
            orderItems: true,
            licenses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.warn('Lỗi tải sản phẩm trong admin:', err);
  }

  // 1. Thống kê tổng quan
  const totalProducts = rawProducts.length;
  const activeCount = rawProducts.filter((p) => p.status === 'ACTIVE').length;
  const draftCount = rawProducts.filter((p) => p.status === 'DRAFT').length;

  const accountProducts = rawProducts.filter((p) => p.type === 'ACCOUNT');
  const totalAvailableAccounts = rawProducts.reduce(
    (sum, p) =>
      sum + p.variants.reduce((vSum, v) => vSum + (v.accountStock ? v.accountStock.length : 0), 0),
    0,
  );

  const downloadProducts = rawProducts.filter((p) => p.type === 'DOWNLOAD');
  const telegramReadyProducts = rawProducts.filter(
    (p) => p.status === 'ACTIVE' && (p.type === 'ACCOUNT' || p.type === 'DOWNLOAD'),
  );

  // 2. Lọc sản phẩm theo điều kiện
  const filteredProducts = rawProducts.filter((p) => {
    if (currentQuery) {
      const q = currentQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSlug = p.slug.toLowerCase().includes(q);
      if (!matchName && !matchSlug) return false;
    }
    if (currentType !== 'ALL' && p.type !== currentType) {
      return false;
    }
    if (currentStatus !== 'ALL' && p.status !== currentStatus) {
      return false;
    }
    return true;
  });

  // Server action: Đổi trạng thái hiển thị
  async function toggleStatus(productId: string) {
    'use server';
    await requireProductAdmin();
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { files: true },
    });
    if (!product) throw new Error('Không tìm thấy sản phẩm.');

    // Chỉ bắt buộc tệp nếu là loại DOWNLOAD và không phải dạng liên hệ
    if (
      product.type === 'DOWNLOAD' &&
      product.status !== 'ACTIVE' &&
      product.saleMode !== 'CONTACT' &&
      !product.files.length
    ) {
      throw new Error('Sản phẩm mã nguồn cần đính kèm tệp trước khi kích hoạt bán.');
    }

    const newStatus = product.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    await db.product.update({
      where: { id: productId },
      data: { status: newStatus as ProductStatus },
    });

    revalidatePath('/admin/products');
    revalidatePath('/admin/shop');
    revalidatePath(`${siteConfig.shopPath}/[slug]`, 'page');
    revalidatePath(siteConfig.shopPath);
    revalidatePath('/');
  }

  // Server action: Xóa sản phẩm
  async function deleteProduct(productId: string) {
    'use server';
    await requireProductAdmin();
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!product) return;
    if (product._count.orderItems > 0) {
      throw new Error(
        'Không thể xóa sản phẩm đã có đơn hàng. Vui lòng chuyển trạng thái sang DRAFT.',
      );
    }
    await db.product.delete({ where: { id: productId } });
    revalidatePath('/admin/products');
    revalidatePath('/admin/shop');
    revalidatePath(siteConfig.shopPath);
    revalidatePath('/');
  }

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Nút thao tác nhanh */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <Package className="text-primary size-7" />
            Quản lý Sản phẩm ({totalProducts})
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Quản lý kho tài khoản số, mã nguồn và sản phẩm. Tự động đồng bộ với Website và Bot
            Telegram.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/shop/categories"
            className={buttonStyles({ variant: 'outline', size: 'sm' })}
          >
            Danh mục shop
          </Link>
          <Link
            href="/admin/shop/shipping"
            className={buttonStyles({ variant: 'outline', size: 'sm' })}
          >
            Phí ship
          </Link>
          <Link
            href={`${basePath}/new`}
            className={buttonStyles({ size: 'sm', className: 'gap-1.5' })}
          >
            <Plus className="size-4" />+ Đăng bán sản phẩm mới
          </Link>
        </div>
      </div>

      {/* Thẻ chỉ số tổng quan (Metrics Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Tổng sản phẩm */}
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                Tổng sản phẩm
              </span>
              <Boxes className="size-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">{totalProducts}</div>
            <div className="text-muted-foreground mt-1 text-xs">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {activeCount} Đang bán
              </span>{' '}
              · <span>{draftCount} Bản nháp</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Tài khoản số & Tồn kho */}
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                Tài khoản số
              </span>
              <KeyRound className="size-4 text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">{accountProducts.length} mặt hàng</div>
            <div className="mt-1 text-xs">
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {totalAvailableAccounts} tài khoản sẵn có
              </span>{' '}
              trong kho
            </div>
          </CardContent>
        </Card>

        {/* Card 3: File Code / Mã nguồn */}
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                File Code & Dự án
              </span>
              <FileCode className="size-4 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">{downloadProducts.length} sản phẩm</div>
            <div className="text-muted-foreground mt-1 text-xs">
              Giao link tải & License Key tự động
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Sẵn sàng trên Bot Telegram */}
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                Bán trên Telegram Bot
              </span>
              <Bot className="size-4 text-cyan-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">
              {telegramReadyProducts.length} / {totalProducts}
            </div>
            <div className="mt-1 text-xs text-cyan-600 dark:text-cyan-400">
              Kênh bot @dltoan07_bot
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Thanh bộ lọc & Tìm kiếm */}
      <Card>
        <CardContent className="p-4">
          <form method="GET" action={basePath} className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
              <Input
                name="q"
                defaultValue={currentQuery}
                placeholder="Tìm kiếm sản phẩm theo tên hoặc slug..."
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                name="type"
                defaultValue={currentType}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none"
              >
                <option value="ALL">Tất cả loại sản phẩm</option>
                <option value="ACCOUNT">🔐 Tài khoản số (Account)</option>
                <option value="DOWNLOAD">📁 File Code / Mã nguồn</option>
                <option value="PHYSICAL">📦 Hàng vật lý</option>
              </select>

              <select
                name="status"
                defaultValue={currentStatus}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">🟢 Đang mở bán (ACTIVE)</option>
                <option value="DRAFT">⚪ Bản nháp (DRAFT)</option>
              </select>

              <Button type="submit" size="sm" variant="secondary">
                Lọc
              </Button>

              {(currentQuery || currentType !== 'ALL' || currentStatus !== 'ALL') && (
                <Link
                  href={basePath}
                  className={buttonStyles({
                    variant: 'ghost',
                    size: 'sm',
                    className: 'text-xs',
                  })}
                >
                  Xóa lọc
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danh sách bảng sản phẩm */}
      <Card>
        <CardHeader className="border-border/50 border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Danh sách sản phẩm</CardTitle>
              <CardDescription>
                Hiển thị {filteredProducts.length} / {totalProducts} sản phẩm.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-border text-muted-foreground border-b text-xs font-semibold uppercase">
                  <th className="px-4 py-3.5">Sản phẩm</th>
                  <th className="px-4 py-3.5">Phân loại</th>
                  <th className="px-4 py-3.5 text-right">Giá bán</th>
                  <th className="px-4 py-3.5 text-center">Tồn kho / Tệp</th>
                  <th className="px-4 py-3.5 text-center">Kênh bán</th>
                  <th className="px-4 py-3.5 text-center">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-muted-foreground px-4 py-8 text-center text-sm">
                      Không tìm thấy sản phẩm nào phù hợp với điều kiện tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const availableAccounts = p.variants.reduce(
                      (sum, v) => sum + (v.accountStock ? v.accountStock.length : 0),
                      0,
                    );
                    const isTelegramEligible =
                      p.status === 'ACTIVE' && (p.type === 'ACCOUNT' || p.type === 'DOWNLOAD');

                    return (
                      <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                        {/* Cột 1: Tên & Slug */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="bg-muted/60 text-muted-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
                              {p.coverUrl ? (
                                <img
                                  src={p.coverUrl}
                                  alt={p.name}
                                  className="size-full object-cover"
                                />
                              ) : p.type === 'ACCOUNT' ? (
                                <KeyRound className="size-5 text-purple-500" />
                              ) : p.type === 'DOWNLOAD' ? (
                                <FileCode className="size-5 text-indigo-500" />
                              ) : (
                                <Package className="size-5 text-amber-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-foreground max-w-[220px] truncate font-semibold">
                                {p.name}
                              </div>
                              <div className="text-muted-foreground max-w-[220px] truncate font-mono text-xs">
                                /{p.slug}
                              </div>
                              <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-[11px]">
                                <span>v{p.version}</span>
                                {p.category && (
                                  <>
                                    <span>•</span>
                                    <span>{p.category.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Phân loại */}
                        <td className="px-4 py-3.5">
                          {p.type === 'ACCOUNT' ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-purple-500/30 bg-purple-500/10 text-xs text-purple-700 dark:text-purple-300"
                            >
                              <KeyRound className="size-3" />
                              Tài khoản số
                            </Badge>
                          ) : p.type === 'DOWNLOAD' ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-700 dark:text-indigo-300"
                            >
                              <FileCode className="size-3" />
                              Mã nguồn / File
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="gap-1 border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300"
                            >
                              <Package className="size-3" />
                              Hàng vật lý
                            </Badge>
                          )}
                        </td>

                        {/* Cột 3: Giá bán */}
                        <td className="px-4 py-3.5 text-right font-medium">
                          {p.saleMode === 'FREE' ? (
                            <span className="font-semibold text-emerald-600">Miễn phí</span>
                          ) : p.saleMode === 'CONTACT' ? (
                            <span className="text-muted-foreground">Liên hệ</span>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-foreground font-semibold">
                                {p.priceVnd.toLocaleString('vi-VN')} đ
                              </span>
                              {p.variants.length > 1 && (
                                <span className="text-muted-foreground text-[11px]">
                                  {p.variants.length} phân loại
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Cột 4: Tồn kho / Tệp đính kèm */}
                        <td className="px-4 py-3.5 text-center text-xs">
                          {p.type === 'ACCOUNT' ? (
                            <div>
                              {availableAccounts > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-300"
                                >
                                  {availableAccounts} khả dụng
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-rose-500/30 bg-rose-500/10 font-medium text-rose-600"
                                >
                                  Hết kho
                                </Badge>
                              )}
                              <div className="mt-1">
                                <Link
                                  href={`${basePath}/${p.id}/edit`}
                                  className="text-primary text-[11px] hover:underline"
                                >
                                  Nạp kho →
                                </Link>
                              </div>
                            </div>
                          ) : p.type === 'DOWNLOAD' ? (
                            p.files.length > 0 ? (
                              <span className="font-medium text-emerald-600">
                                {p.files.length} tệp tải
                              </span>
                            ) : (
                              <span className="font-medium text-rose-500">Chưa có tệp</span>
                            )
                          ) : (
                            <span className="text-muted-foreground">
                              {p.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)} tồn kho
                            </span>
                          )}
                        </td>

                        {/* Cột 5: Kênh bán */}
                        <td className="px-4 py-3.5 text-center text-xs">
                          {isTelegramEligible ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 border-cyan-500/20 bg-cyan-500/10 text-[11px] text-cyan-700 dark:text-cyan-300"
                            >
                              <Bot className="size-3" />
                              Bot + Web
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-muted-foreground gap-1 text-[11px]"
                            >
                              <Globe className="size-3" />
                              Chỉ Web
                            </Badge>
                          )}
                        </td>

                        {/* Cột 6: Trạng thái */}
                        <td className="px-4 py-3.5 text-center">
                          <Badge
                            variant={p.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {p.status}
                          </Badge>
                        </td>

                        {/* Cột 7: Thao tác */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`${basePath}/${p.id}/edit`}
                              className={buttonStyles({
                                variant: 'outline',
                                size: 'sm',
                                className: 'h-8 px-2 text-xs',
                              })}
                              title="Chỉnh sửa sản phẩm"
                            >
                              <Edit3 className="size-3.5" />
                              <span className="ml-1 hidden sm:inline">Sửa</span>
                            </Link>

                            <Link
                              href={`/shop/${p.slug}`}
                              target="_blank"
                              className={buttonStyles({
                                variant: 'ghost',
                                size: 'sm',
                                className: 'h-8 px-2 text-xs',
                              })}
                              title="Xem sản phẩm trên Website"
                            >
                              <ExternalLink className="size-3.5" />
                            </Link>

                            <form action={toggleStatus.bind(null, p.id)} className="inline-block">
                              <Button
                                variant={p.status === 'ACTIVE' ? 'outline' : 'secondary'}
                                size="sm"
                                type="submit"
                                className="h-8 px-2 text-xs"
                                title={
                                  p.status === 'ACTIVE'
                                    ? 'Hạ xuống Bản nháp'
                                    : 'Kích hoạt mở bán ngay'
                                }
                              >
                                {p.status === 'ACTIVE' ? 'Ẩn' : 'Bán'}
                              </Button>
                            </form>

                            {p._count.orderItems === 0 && (
                              <form
                                action={deleteProduct.bind(null, p.id)}
                                className="inline-block"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  type="submit"
                                  className="h-8 px-2 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                                  title="Xóa sản phẩm (chưa có đơn hàng)"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
