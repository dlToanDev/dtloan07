'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { safeAction } from '@/lib/courses/safe-action';
import { deleteVoucher, setVoucherActive } from '@/server/actions/voucher';

export function VoucherRowActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (call: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    startTransition(async () => {
      const result = await safeAction(call);
      if (!result.ok) window.alert(result.error);
      router.refresh();
    });

  return (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-xs"
        disabled={pending}
        onClick={() => run(() => setVoucherActive(id, !active))}
      >
        {active ? 'Tắt' : 'Bật'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-xs text-red-600"
        disabled={pending}
        onClick={() => {
          if (window.confirm('Xóa voucher này?')) run(() => deleteVoucher(id));
        }}
      >
        Xóa
      </Button>
    </div>
  );
}
