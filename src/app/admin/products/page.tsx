import { db } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
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

  async function toggleStatus(productId: string, currentStatus: string) {
    'use server';
    const newStatus = currentStatus === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    await db.product.update({
      where: { id: productId },
      data: { status: newStatus as 'ACTIVE' | 'DRAFT' },
    });
    revalidatePath('/admin/products');
    revalidatePath('/products');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Quản lý sản phẩm số ({products.length})</h2>
          <p className="text-muted-foreground text-sm">
            Bật/tắt trạng thái hiển thị, kiểm tra tệp đính kèm và số lượng đã bán.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh mục sản phẩm</CardTitle>
          <CardDescription>
            Sản phẩm ở trạng thái ACTIVE mới hiển thị trên trang bán hàng (/products).
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
                    </td>
                    <td className="px-2 py-3 font-mono text-xs">v{p.version}</td>
                    <td className="px-2 py-3 text-right font-medium">
                      {p.priceVnd.toLocaleString('vi-VN')} đ
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
                        href={`/products/${p.slug}`}
                        target="_blank"
                        className={buttonStyles({
                          variant: 'outline',
                          size: 'sm',
                          className: 'text-xs',
                        })}
                      >
                        Xem bài
                      </Link>

                      <form
                        action={toggleStatus.bind(null, p.id, p.status)}
                        className="inline-block"
                      >
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
