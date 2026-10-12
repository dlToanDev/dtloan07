'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, ShieldCheck, UnlockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { safeAction } from '@/lib/courses/safe-action';
import { lockManagedUser, unlockManagedUser } from '@/server/actions/admin-users';

export function AdminUserActions({
  userId,
  role,
  locked,
  warningCount,
}: {
  userId: string;
  role: 'USER' | 'ADMIN';
  locked: boolean;
  warningCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');

  const run = (
    call: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done?: () => void,
  ) => {
    startTransition(async () => {
      const result = await safeAction(call);
      if (!result.ok) return window.alert(result.error);
      done?.();
      router.refresh();
    });
  };

  if (role === 'ADMIN')
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
        <ShieldCheck className="size-3.5" />
        Được bảo vệ
      </span>
    );
  if (locked)
    return (
      <div className="flex justify-end gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => unlockManagedUser(userId, false))}
        >
          <UnlockKeyhole className="size-3.5" />
          Mở khóa
        </Button>
        {warningCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (window.confirm('Mở khóa và xóa toàn bộ cảnh báo của tài khoản này?'))
                run(() => unlockManagedUser(userId, true));
            }}
          >
            Xóa cảnh báo
          </Button>
        )}
      </div>
    );
  if (!showReason)
    return (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setShowReason(true)}>
        <LockKeyhole className="size-3.5" />
        Khóa
      </Button>
    );

  return (
    <div className="border-destructive/20 bg-destructive/5 ml-auto w-72 space-y-2 rounded-xl border p-3 text-left">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={300}
        placeholder="Lý do khóa tài khoản..."
        className="border-border bg-background w-full resize-none rounded-lg border px-2.5 py-2 text-xs outline-none"
      />
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setShowReason(false)}>
          Hủy
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={pending || reason.trim().length < 5}
          onClick={() =>
            run(
              () => lockManagedUser({ userId, reason }),
              () => {
                setReason('');
                setShowReason(false);
              },
            )
          }
        >
          Xác nhận khóa
        </Button>
      </div>
    </div>
  );
}
