import { db } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { revalidatePath } from 'next/cache';
import { ShieldAlert, ShieldCheck, RotateCcw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminLicensesPage() {
  let licenses: Awaited<
    ReturnType<
      typeof db.license.findMany<{
        include: {
          product: true;
          orderItem: {
            include: {
              order: true;
            };
          };
        };
      }>
    >
  > = [];

  try {
    licenses = await db.license.findMany({
      include: {
        product: true,
        orderItem: {
          include: {
            order: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.warn('Lỗi tải licenses:', err);
  }

  async function toggleRevoke(licenseId: string, isCurrentlyRevoked: boolean) {
    'use server';
    await db.license.update({
      where: { id: licenseId },
      data: {
        revokedAt: isCurrentlyRevoked ? null : new Date(),
      },
    });
    revalidatePath('/admin/licenses');
  }

  async function resetDownloads(licenseId: string) {
    'use server';
    await db.license.update({
      where: { id: licenseId },
      data: {
        downloadCount: 0,
      },
    });
    revalidatePath('/admin/licenses');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">
          Quản lý Bản quyền & Thu hồi License ({licenses.length})
        </h2>
        <p className="text-muted-foreground text-sm">
          Xử lý các tình huống hoàn tiền, tranh chấp (chargeback) hoặc cấp lại số lượt tải cho khách
          hàng.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách Giấy phép đã cấp</CardTitle>
          <CardDescription>
            Bản quyền bị thu hồi sẽ bị từ chối ngay lập tức khi người dùng cố gắng tải tệp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {licenses.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Chưa có giấy phép bản quyền nào được tạo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-border text-muted-foreground border-b text-xs uppercase">
                    <th className="px-2 py-3">Mã License</th>
                    <th className="px-2 py-3">Khách hàng</th>
                    <th className="px-2 py-3">Sản phẩm</th>
                    <th className="px-2 py-3 text-center">Lượt tải</th>
                    <th className="px-2 py-3 text-center">Trạng thái</th>
                    <th className="px-2 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {licenses.map((lic) => {
                    const isRevoked = Boolean(lic.revokedAt);
                    return (
                      <tr key={lic.id} className="hover:bg-muted/30">
                        <td className="text-foreground px-2 py-3 font-mono font-bold">
                          {lic.key}
                          <div className="text-muted-foreground text-xs font-normal">
                            Đơn: {lic.orderItem.order.orderCode}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="text-foreground">{lic.email}</div>
                          <div className="text-muted-foreground text-xs">
                            {new Date(lic.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        </td>
                        <td className="px-2 py-3 font-medium">{lic.product.name}</td>
                        <td className="px-2 py-3 text-center font-mono">
                          {lic.downloadCount}/{lic.maxDownloads}
                        </td>
                        <td className="px-2 py-3 text-center">
                          {isRevoked ? (
                            <Badge variant="destructive" className="text-xs">
                              <ShieldAlert className="mr-1 h-3 w-3" />
                              Đã thu hồi
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-xs">
                              <ShieldCheck className="mr-1 h-3 w-3" />
                              Hợp lệ
                            </Badge>
                          )}
                        </td>
                        <td className="space-x-2 px-2 py-3 text-right">
                          <form action={resetDownloads.bind(null, lic.id)} className="inline-block">
                            <Button
                              variant="outline"
                              size="sm"
                              type="submit"
                              className="text-xs"
                              title="Đặt lại số lượt tải về 0"
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Reset tải
                            </Button>
                          </form>

                          <form
                            action={toggleRevoke.bind(null, lic.id, isRevoked)}
                            className="inline-block"
                          >
                            <Button
                              variant={isRevoked ? 'primary' : 'destructive'}
                              size="sm"
                              type="submit"
                              className="text-xs"
                            >
                              {isRevoked ? 'Khôi phục' : 'Thu hồi'}
                            </Button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
