'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  ShieldAlert,
  RotateCw,
  Ban,
  Copy,
  Check,
  Clock,
  History,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  rotateAdminTokenAction,
  revokeAdminTokenAction,
  type AdminSecurityOverviewData,
} from '@/server/actions/admin-token';

interface AdminTokenManagerProps {
  initialData: AdminSecurityOverviewData;
}

export function AdminTokenManager({ initialData }: AdminTokenManagerProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [selectedTtl, setSelectedTtl] = useState<number>(initialData.tokenInfo.ttlSeconds || 3600);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const { tokenInfo, recentLogs } = data;
  const isOnline = tokenInfo.hasActive && !tokenInfo.isExpired && !tokenInfo.isRevoked;

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRotate = () => {
    if (
      !confirm(
        'Bạn có chắc muốn xoay tua (Rotate) URL Admin? URL cũ sẽ bị vô hiệu hóa ngay lập tức.',
      )
    ) {
      return;
    }

    startTransition(async () => {
      setFeedback(null);
      const res = await rotateAdminTokenAction(selectedTtl);
      if (res.success && res.url) {
        setFeedback({
          type: 'success',
          message: 'Đã sinh URL Admin mới thành công! Đang chuyển hướng...',
        });
        setTimeout(() => {
          router.push(res.url!);
        }, 1200);
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Lỗi khi xoay tua URL Admin.',
        });
      }
    });
  };

  const handleRevoke = () => {
    if (
      !confirm(
        'Bạn có chắc muốn THU HỒI (Revoke) URL Admin? Toàn bộ token sẽ bị khóa và không ai có thể truy cập admin bằng URL cũ.',
      )
    ) {
      return;
    }

    startTransition(async () => {
      setFeedback(null);
      const res = await revokeAdminTokenAction();
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Đã thu hồi token URL Admin thành công. Hệ thống đã khóa truy cập các link cũ.',
        });
        setData((prev) => ({
          ...prev,
          tokenInfo: {
            ...prev.tokenInfo,
            hasActive: false,
            isRevoked: true,
          },
        }));
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Lỗi khi thu hồi token.',
        });
      }
    });
  };

  return (
    <Card className="border-border shadow-xs">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-500" />
              <CardTitle className="text-base font-bold">
                Bảo Mật URL Admin & Dynamic Token
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Cơ chế Signed & Expiring URL chống rò rỉ, chống brute-force và bot scanner. Token được
              băm SHA-256 trong cơ sở dữ liệu.
            </CardDescription>
          </div>

          <div>
            {isOnline ? (
              <Badge className="border-emerald-500/20 bg-emerald-500/10 font-semibold text-emerald-600 dark:text-emerald-400">
                ● Đang hoạt động (Active)
              </Badge>
            ) : tokenInfo.isRevoked ? (
              <Badge
                variant="outline"
                className="border-rose-500/20 bg-rose-500/10 font-semibold text-rose-600 dark:text-rose-400"
              >
                ● Đã thu hồi (Revoked)
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-500/20 bg-amber-500/10 font-semibold text-amber-600 dark:text-amber-400"
              >
                ● Đã hết hạn (Expired)
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {feedback && (
          <div
            className={`rounded-xl border p-3 text-xs font-medium ${
              feedback.type === 'success'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Thông số kỹ thuật Token hiện tại */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border-border/70 bg-muted/30 space-y-1 rounded-xl border p-3.5">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
              <KeyRound className="text-primary size-3.5" /> Token Prefix
            </span>
            <p className="text-foreground truncate font-mono text-xs font-bold">
              {tokenInfo.prefix || 'Chưa khởi tạo'}
            </p>
            <p className="text-muted-foreground text-[10px]">Mã hóa SHA-256 trong DB</p>
          </div>

          <div className="border-border/70 bg-muted/30 space-y-1 rounded-xl border p-3.5">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
              <Clock className="size-3.5 text-amber-500" /> Thời gian hết hạn
            </span>
            <p className="text-foreground text-xs font-bold">
              {tokenInfo.expiresAt
                ? new Date(tokenInfo.expiresAt).toLocaleString('vi-VN')
                : 'Không có'}
            </p>
            <p className="text-muted-foreground text-[10px]">
              TTL: {tokenInfo.ttlSeconds} giây ({Math.round(tokenInfo.ttlSeconds / 60)} phút)
            </p>
          </div>

          <div className="border-border/70 bg-muted/30 space-y-1 rounded-xl border p-3.5">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
              <ShieldAlert className="size-3.5 text-violet-500" /> Chính sách bảo vệ
            </span>
            <p className="text-foreground text-xs font-bold">Defense in Depth</p>
            <p className="text-muted-foreground text-[10px]">RBAC + Rate Limit + 404 Cloaking</p>
          </div>
        </div>

        {/* Các nút hành động thao tác Token */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="cursor-pointer gap-1.5 text-xs font-semibold"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span>{copied ? 'Đã sao chép link!' : 'Sao chép URL hiện tại'}</span>
          </Button>

          <div className="flex items-center gap-1.5">
            <label
              htmlFor="admin-token-ttl-select"
              className="text-muted-foreground text-xs font-medium"
            >
              Thời hạn URL:
            </label>
            <select
              id="admin-token-ttl-select"
              aria-label="Chọn thời hạn sống của URL Admin"
              value={selectedTtl}
              disabled={isPending}
              onChange={(e) => setSelectedTtl(Number(e.target.value))}
              className="border-input bg-background text-foreground focus:ring-primary h-8 rounded-lg border px-2 text-xs font-semibold focus:ring-1 focus:outline-none"
            >
              <option value={900}>15 phút (900s)</option>
              <option value={1800}>30 phút (1800s)</option>
              <option value={3600}>1 giờ (3600s)</option>
              <option value={21600}>6 giờ (21600s)</option>
              <option value={86400}>24 giờ (86400s)</option>
            </select>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isPending}
            onClick={handleRotate}
            className="cursor-pointer gap-1.5 bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCw className="size-3.5" />
            )}
            <span>Xoay tua URL mới (Rotate)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending || !tokenInfo.hasActive}
            onClick={handleRevoke}
            className="cursor-pointer gap-1.5 border-rose-500/30 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
          >
            <Ban className="size-3.5" />
            <span>Thu hồi Token (Revoke)</span>
          </Button>
        </div>

        {/* Bảng Audit Log bảo mật gần nhất */}
        <div className="border-border space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-foreground flex items-center gap-1.5 text-xs font-bold">
              <History className="text-muted-foreground size-3.5" /> Nhật ký bảo mật gần nhất (Audit
              Logs)
            </h4>
            <span className="text-muted-foreground text-[10px]">{recentLogs.length} sự kiện</span>
          </div>

          {recentLogs.length === 0 ? (
            <p className="text-muted-foreground py-2 text-xs italic">
              Chưa ghi nhận sự kiện bảo mật nào.
            </p>
          ) : (
            <div className="border-border overflow-hidden rounded-xl border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-border text-muted-foreground border-b text-[11px] font-semibold uppercase">
                    <tr>
                      <th className="px-3.5 py-2">Hành động</th>
                      <th className="px-3.5 py-2">Người thực hiện</th>
                      <th className="px-3.5 py-2">IP</th>
                      <th className="px-3.5 py-2">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/60 divide-y">
                    {recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="text-primary px-3.5 py-2 font-mono text-[11px] font-semibold">
                          {log.action}
                        </td>
                        <td className="text-foreground max-w-[150px] truncate px-3.5 py-2">
                          {log.actorEmail || log.actorId || 'Hệ thống'}
                        </td>
                        <td className="text-muted-foreground px-3.5 py-2 font-mono text-[11px]">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="text-muted-foreground px-3.5 py-2 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
