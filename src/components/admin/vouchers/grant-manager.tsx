'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { safeAction } from '@/lib/courses/safe-action';
import {
  grantVoucher,
  grantVoucherToAllPro,
  revokeGrant,
  broadcastVoucherToPro,
  type GrantView,
} from '@/server/actions/voucher';

const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2 text-sm';

const SOURCE_LABELS: Record<string, string> = {
  ADMIN: 'Admin tặng',
  SPIN: 'Vòng quay',
  TASK: 'Nhiệm vụ',
  FORM: 'Form',
  POST: 'Bài viết',
};

export function GrantManager({
  couponId,
  initial,
  proCount,
}: {
  couponId: string;
  initial: GrantView[];
  /** Số tài khoản Pro đang còn hạn. */
  proCount: number;
}) {
  const [notice, setNotice] = useState('');
  const [grants, setGrants] = useState(initial);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const give = () =>
    startTransition(async () => {
      setError('');
      const result = await safeAction(() => grantVoucher({ couponId, email, note }));
      if (!result.ok) return setError(result.error);
      setGrants((prev) => [result.data, ...prev]);
      setEmail('');
      setNote('');
    });

  const giveAllPro = () => {
    if (!window.confirm(`Tặng mỗi tài khoản Pro (${proCount}) một mã riêng của voucher này?`))
      return;
    startTransition(async () => {
      setError('');
      setNotice('');
      const result = await safeAction(() => grantVoucherToAllPro(couponId));
      if (!result.ok) return setError(result.error);
      setGrants((prev) => [...result.data, ...prev]);
      setNotice(
        result.data.length > 0
          ? `Đã tặng ${result.data.length} mã cho tài khoản Pro.`
          : 'Mọi tài khoản Pro đều đang giữ mã chưa dùng của voucher này.',
      );
    });
  };

  const broadcastToPro = () => {
    if (
      !window.confirm(
        'Gửi thông báo hệ thống chứa Voucher này tới toàn bộ tài khoản PRO (chỉ ai nâng PRO mới thấy)?',
      )
    )
      return;
    startTransition(async () => {
      setError('');
      setNotice('');
      const result = await safeAction(() => broadcastVoucherToPro(couponId));
      if (!result.ok) return setError(result.error);
      setNotice(
        'Đã gửi thông báo kèm Voucher tới chuông thông báo và banner của toàn bộ thành viên PRO!',
      );
    });
  };

  const revoke = (grant: GrantView) => {
    if (!window.confirm(`Thu hồi mã ${grant.code} của ${grant.email}?`)) return;
    startTransition(async () => {
      const result = await safeAction(() => revokeGrant(grant.id));
      if (!result.ok) return setError(result.error);
      setGrants((prev) => prev.filter((item) => item.id !== grant.id));
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
        <span>{proCount} tài khoản Pro đang còn hạn</span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={giveAllPro}
            disabled={pending || proCount === 0}
          >
            Tặng mã riêng cho tất cả Pro
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            className="flex items-center gap-1.5 bg-amber-600 font-semibold text-white hover:bg-amber-700"
            onClick={broadcastToPro}
            disabled={pending}
          >
            📢 Gửi thông báo kèm Voucher tới PRO
          </Button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          type="email"
          className={inputClass}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email tài khoản khách"
        />
        <input
          className={inputClass}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ghi chú (tùy chọn)"
          maxLength={200}
        />
        <Button type="button" onClick={give} disabled={pending || !email.trim()}>
          Tặng mã
        </Button>
      </div>

      {grants.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa phát mã riêng nào.</p>
      ) : (
        <ul className="border-border divide-border divide-y rounded-lg border">
          {grants.map((grant) => (
            <li key={grant.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="font-mono font-semibold">{grant.code}</span>
              <span className="text-muted-foreground min-w-0 flex-1 truncate">
                {grant.email}
                {grant.note ? ` · ${grant.note}` : ''}
              </span>
              <Badge variant="outline" className="text-xs">
                {SOURCE_LABELS[grant.source] ?? grant.source}
              </Badge>
              {grant.usedAt ? (
                <Badge variant="secondary" className="text-xs">
                  Đã dùng
                </Badge>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-xs text-red-600"
                  onClick={() => revoke(grant)}
                  disabled={pending}
                >
                  Thu hồi
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
