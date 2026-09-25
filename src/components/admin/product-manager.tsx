import { requireProductAdmin } from '@/server/actions/product';
import { db } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export async function ProductManager({ kind }: { kind: 'SOURCE_CODE' | 'SHOP' }) {
  const basePath = kind === 'SOURCE_CODE' ? '/admin/source-code' : '/admin/shop';
  const label = kind === 'SOURCE_CODE' ? 'Source Code / App / Tool' : 'Shop';
  let products: Awaited<
    ReturnType<
      typeof db.product.findMany<{
        include: {
          files: true;
          _count: { select: { orderItems: true; licenses: true } };
        };
      }>
    >
  > = [];

  try {
    products = await db.product.findMany({
      where: { kind },
      include: {
        files: true,
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

  async function toggleStatus(productId: string) {
    'use server';
    await requireProductAdmin();
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { files: true },
    });
    if (
      !product ||
      product.kind !== kind ||
      (product.status !== 'ACTIVE' && product.saleMode !== 'CONTACT' && !product.files.length)
    )
      throw new Error('Cần đính kèm file trước khi công khai.');
    const newStatus = product.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    await db.product.update({
      where: { id: productId },
      data: { status: newStatus as 'ACTIVE' | 'DRAFT' },
    });
    revalidatePath('/products/[slug]', 'page');
    revalidatePath('/admin/source-code');
    revalidatePath('/admin/shop');
    revalidatePath('/source-code/[slug]', 'page');
    revalidatePath('/shop/[slug]', 'page');
    revalidatePath('/source-code');
    revalidatePath('/shop');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">
            Quản lý {label} ({products.length})
          </h2>
          <p className="text-muted-foreground text-sm">
            {kind === 'SOURCE_CODE'
              ? 'Đăng mã nguồn app, tool và template: miễn phí, liên hệ hoặc đặt giá bán.'
              : 'Đăng và quản lý các sản phẩm trong Shop của bạn.'}
          </p>
        </div>
      </div>

      <Link href={`${basePath}/new`} className={buttonStyles({})}>
        + {kind === 'SOURCE_CODE' ? 'Đăng bán source code' : 'Đăng bán sản phẩm'}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Danh mục sản phẩm</CardTitle>
          <CardDescription>
            {kind === 'SOURCE_CODE'
              ? 'Danh sách mã nguồn app/tool hiển thị tại Source Code.'
              : 'Danh sách sản phẩm hiển thị tại Shop.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-border text-muted-foreground border-b text-xs uppercase">
                  <th className="px-2 py-3">Tên sản phẩm</th>
                  <th className="px-2 py-3">Phiên bản</th>
                  <th className="px-2 py-3 text-right">Giá bán</th>
                  <th className="px-2 py-3 text-center">Tệp đính kèm</th>
                  <th className="px-2 py-3 text-center">Đã bán</th>
                  <th className="px-2 py-3 text-center">Trạng thái</th>
                  <th className="px-2 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-2 py-3">
                      <div className="text-foreground font-semibold">{p.name}</div>
                      <div className="text-muted-foreground font-mono text-xs">/{p.slug}</div>
                      <Link
                        href={`${basePath}/${p.id}/edit`}
                        className="text-primary mt-2 inline-block text-sm hover:underline"
                      >
                        Chỉnh sửa
                      </Link>
                    </td>
                    <td className="px-2 py-3 font-mono text-xs">v{p.version}</td>
                    <td className="px-2 py-3 text-right font-medium">
                      {p.saleMode === 'FREE'
                        ? 'Miễn phí'
                        : p.saleMode === 'CONTACT'
                          ? 'Liên hệ'
                          : `${p.priceVnd.toLocaleString('vi-VN')} đ`}
                    </td>
                    <td className="px-2 py-3 text-center text-xs">
                      {p.files.length > 0 ? (
                        <span className="font-medium text-green-600">{p.files.length} tệp</span>
                      ) : (
                        <span className="font-medium text-rose-500">Chưa có tệp</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center font-mono">{p._count.licenses} license</td>
                    <td className="px-2 py-3 text-center">
                      <Badge
                        variant={p.status === 'ACTIVE' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="space-x-2 px-2 py-3 text-right">
                      <Link
                        href={`/${kind === 'SOURCE_CODE' ? 'source-code' : 'shop'}/${p.slug}`}
                        target="_blank"
                        className={buttonStyles({
                          variant: 'outline',
                          size: 'sm',
                          className: 'text-xs',
                        })}
                      >
                        Xem sản phẩm
                      </Link>

                      <form action={toggleStatus.bind(null, p.id)} className="inline-block">
                        <Button
                          variant={p.status === 'ACTIVE' ? 'destructive' : 'secondary'}
                          size="sm"
                          type="submit"
                          className="text-xs"
                        >
                          {p.status === 'ACTIVE' ? 'Hạ xuống Draft' : 'Kích hoạt bán'}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
