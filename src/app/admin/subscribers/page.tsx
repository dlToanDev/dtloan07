import { db } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Download } from 'lucide-react';
import Link from 'next/link';
import { subscriberStatusLabel } from '@/lib/shop/labels';

export const dynamic = 'force-dynamic';

export default async function AdminSubscribersPage() {
  let subscribers: Awaited<ReturnType<typeof db.subscriber.findMany>> = [];
  try {
    subscribers = await db.subscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.warn('Lỗi tải subscribers:', err);
  }

  const confirmedCount = subscribers.filter((s) => s.status === 'CONFIRMED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Danh sách Subscribers ({subscribers.length})</h2>
          <p className="text-muted-foreground text-sm">
            {confirmedCount} người đăng ký đã xác nhận email (Double Opt-in).
          </p>
        </div>

        <div>
          <Link
            href="/api/admin/subscribers/export"
            download
            className={buttonStyles({ variant: 'primary', size: 'sm' })}
          >
            <Download className="mr-2 h-4 w-4" />
            Xuất file CSV
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email đã thu thập</CardTitle>
          <CardDescription>
            Được thu thập qua biểu mẫu Newsletter chân trang và popup Lead Magnet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscribers.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Chưa có ai đăng ký nhận tin.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-border text-muted-foreground border-b text-xs uppercase">
                    <th className="px-2 py-3">Địa chỉ Email</th>
                    <th className="px-2 py-3">Nguồn đăng ký</th>
                    <th className="px-2 py-3 text-center">Trạng thái</th>
                    <th className="px-2 py-3">Thời gian đăng ký</th>
                    <th className="px-2 py-3">Xác nhận lúc</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {subscribers.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="text-foreground px-2 py-3 font-medium">{s.email}</td>
                      <td className="text-muted-foreground px-2 py-3 font-mono text-xs">
                        {s.source}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <Badge
                          variant={
                            s.status === 'CONFIRMED'
                              ? 'default'
                              : s.status === 'PENDING'
                                ? 'outline'
                                : 'destructive'
                          }
                          className="text-xs"
                        >
                          {subscriberStatusLabel(s.status)}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground px-2 py-3 text-xs">
                        {new Date(s.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="text-muted-foreground px-2 py-3 text-xs">
                        {s.confirmedAt ? new Date(s.confirmedAt).toLocaleString('vi-VN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
