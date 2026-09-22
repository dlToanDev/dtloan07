'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Key, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface OrderItemInfo {
  id: string;
  productName: string;
  qty: number;
  unitPriceVnd: number;
  license: {
    id: string;
    key: string;
    downloadCount: number;
    maxDownloads: number;
    remainingDownloads: number;
    isRevoked: boolean;
    downloadUrl: string;
  } | null;
}

interface OrderInfo {
  id: string;
  orderCode: string;
  email: string;
  status: string;
  subtotalVnd: number;
  discountVnd: number;
  totalVnd: number;
  createdAt: string;
  paidAt?: string | null;
  items: OrderItemInfo[];
}

export default function OrderLookupPage() {
  const [orderCode, setOrderCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderInfo | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCode.trim() || !email.trim()) {
      setError('Vui lòng nhập đầy đủ mã đơn hàng và địa chỉ email.');
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode, email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không tìm thấy đơn hàng tương ứng.');
      }

      setOrder(data.order);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tra cứu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Tra cứu đơn hàng & Bản quyền</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Dành cho khách hàng mua nhanh không cần đăng nhập tài khoản. Nhập mã đơn và email nhận
          hàng để lấy mã license và liên kết tải file.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nhập thông tin tra cứu</CardTitle>
          <CardDescription>
            Mã đơn hàng được gửi trong email xác nhận thanh toán (ví dụ: DH-1726451234)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label htmlFor="orderCode" className="text-sm font-medium">
                Mã đơn hàng
              </label>
              <Input
                id="orderCode"
                placeholder="DH-1726451234 hoặc 1726451234"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                required
                className="mt-1 font-mono"
              />
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email đặt hàng
              </label>
              <Input
                id="email"
                type="email"
                placeholder="ten-ban@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              <Search className="mr-2 h-4 w-4" />
              {loading ? 'Đang tìm kiếm...' : 'Tra cứu ngay'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Kết quả tra cứu */}
      {order && (
        <div className="mt-8 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-xl">Đơn hàng {order.orderCode}</CardTitle>
                <CardDescription>
                  Tạo lúc {new Date(order.createdAt).toLocaleString('vi-VN')}
                </CardDescription>
              </div>
              <Badge
                variant={order.status === 'PAID' ? 'default' : 'outline'}
                className="px-3 py-1"
              >
                {order.status === 'PAID' ? (
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Clock className="mr-1 h-3.5 w-3.5" />
                )}
                {order.status}
              </Badge>
            </CardHeader>
            <CardContent className="divide-border divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="text-foreground font-medium">{item.productName}</div>
                    <div className="text-foreground font-bold">
                      {(item.unitPriceVnd * item.qty).toLocaleString('vi-VN')} đ
                    </div>
                  </div>

                  {item.license ? (
                    <div className="bg-muted/40 border-border space-y-3 rounded-lg border p-4">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2">
                          <Key className="text-primary h-4 w-4" />
                          <span className="text-muted-foreground text-xs font-medium uppercase">
                            License Key:
                          </span>
                          <code className="bg-background border-border text-foreground rounded border px-2 py-0.5 font-mono text-sm font-bold">
                            {item.license.key}
                          </code>
                        </div>
                        <Badge
                          variant={item.license.remainingDownloads > 0 ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          Còn {item.license.remainingDownloads}/{item.license.maxDownloads} lượt tải
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-muted-foreground text-xs">
                          {item.license.isRevoked ? 'Đã bị thu hồi' : 'Có giá trị vĩnh viễn'}
                        </span>

                        {!item.license.isRevoked && item.license.remainingDownloads > 0 && (
                          <Link
                            href={item.license.downloadUrl}
                            className={buttonStyles({ variant: 'primary', size: 'sm' })}
                          >
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Tải tệp đính kèm
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs italic">
                      {order.status === 'PAID'
                        ? 'Đang khởi tạo mã bản quyền...'
                        : 'Vui lòng hoàn tất thanh toán để nhận mã bản quyền.'}
                    </p>
                  )}
                </div>
              ))}

              <div className="flex justify-between pt-4 text-base font-bold">
                <span>Tổng tiền</span>
                <span className="text-primary">{order.totalVnd.toLocaleString('vi-VN')} đ</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
