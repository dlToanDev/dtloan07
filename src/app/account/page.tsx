import { auth, signOut } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button, buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, Package, LogOut, Download } from 'lucide-react';
import Link from 'next/link';

export default async function AccountPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  // Lấy danh sách License của người dùng
  const licenses = await db.license.findMany({
    where: {
      OR: [...(userId ? [{ userId }] : []), ...(userEmail ? [{ email: userEmail }] : [])],
    },
    include: {
      product: {
        include: {
          files: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Lấy lịch sử đơn hàng
  const orders = await db.order.findMany({
    where: {
      OR: [...(userId ? [{ userId }] : []), ...(userEmail ? [{ email: userEmail }] : [])],
    },
    include: {
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="grid gap-8 md:grid-cols-3">
      {/* Cột trái: Thông tin người dùng */}
      <div className="space-y-6 md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Thông tin cá nhân</CardTitle>
            <CardDescription>Chi tiết tài khoản đang đăng nhập</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-muted-foreground text-xs uppercase">Họ và tên</div>
              <div className="text-foreground font-medium">
                {session?.user?.name || 'Người dùng'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase">Email</div>
              <div className="text-foreground font-medium">{session?.user?.email}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase">Vai trò</div>
              <div className="mt-1">
                <Badge variant={session?.user?.role === 'ADMIN' ? 'default' : 'secondary'}>
                  {session?.user?.role}
                </Badge>
              </div>
            </div>

            {session?.user?.role === 'ADMIN' && (
              <div className="pt-2">
                <Link
                  href="/admin"
                  className={buttonStyles({ variant: 'outline', className: 'w-full' })}
                >
                  Khu vực quản trị (Admin)
                </Link>
              </div>
            )}

            <div className="border-border border-t pt-4">
              <form
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: '/' });
                }}
              >
                <Button variant="destructive" type="submit" className="w-full">
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cột phải: Sản phẩm đã mua & Bản quyền */}
      <div className="space-y-6 md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Key className="text-primary h-5 w-5" />
              Sản phẩm & Bản quyền sở hữu ({licenses.length})
            </CardTitle>
            <CardDescription>
              Danh sách các tài liệu số, mã nguồn và số lượt tải file còn lại.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {licenses.length === 0 ? (
              <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center">
                <p>Bạn chưa mua sản phẩm số nào.</p>
                <Link
                  href="/blog"
                  className="text-primary mt-2 inline-block text-sm hover:underline"
                >
                  Khám phá các bài viết & template
                </Link>
              </div>
            ) : (
              <div className="divide-border divide-y">
                {licenses.map((lic) => {
                  const remainingDownloads = Math.max(0, lic.maxDownloads - lic.downloadCount);
                  return (
                    <div key={lic.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-foreground text-base font-semibold">
                            {lic.product.name}
                          </h2>
                          <div className="text-muted-foreground mt-1 font-mono text-xs">
                            Mã bản quyền: <span className="text-foreground">{lic.key}</span>
                          </div>
                        </div>
                        <Badge variant={remainingDownloads > 0 ? 'default' : 'secondary'}>
                          Còn {remainingDownloads}/{lic.maxDownloads} lượt tải
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-muted-foreground text-xs">
                          Phiên bản: {lic.product.version}
                        </span>
                        <Link
                          href={`/api/download/${lic.id}`}
                          className={buttonStyles({ variant: 'outline', size: 'sm' })}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Tải file (.zip)
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lịch sử đơn hàng */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Package className="text-primary h-5 w-5" />
              Lịch sử đơn hàng ({orders.length})
            </CardTitle>
            <CardDescription>Nhật ký giao dịch và trạng thái thanh toán</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Chưa có đơn hàng nào.
              </p>
            ) : (
              <div className="divide-border divide-y text-sm">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.id}`}
                    className="flex items-center justify-between py-3 transition hover:opacity-80"
                  >
                    <div>
                      <div className="font-mono font-medium hover:underline">{order.orderCode}</div>
                      <div className="text-muted-foreground text-xs">
                        {new Date(order.createdAt).toLocaleDateString('vi-VN')} &bull; Cổng:{' '}
                        {order.provider}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {order.totalVnd.toLocaleString('vi-VN')} đ
                      </div>
                      <Badge
                        variant={order.status === 'PAID' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
