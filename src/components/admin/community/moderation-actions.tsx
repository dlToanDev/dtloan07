'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { safeAction } from '@/lib/courses/safe-action';
import {
  removePostWithWarning,
  restoreCommunityPost,
  setCommunityPostIndexable,
  unlockUser,
} from '@/server/actions/community-moderation';

type Outcome = { ok: true } | { ok: false; error: string };

function useRun() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (call: () => Promise<Outcome>, onDone?: () => void) =>
    startTransition(async () => {
      const result = await safeAction(call);
      if (!result.ok) return window.alert(result.error);
      onDone?.();
      router.refresh();
    });
  return { pending, run };
}

/** Gỡ bài + cảnh báo tác giả (đủ 3 cảnh báo tự khóa), bật index, khôi phục. */
export function PostModerationActions({
  postId,
  status,
  indexable,
  authorWarnings,
}: {
  postId: string;
  status: 'PUBLISHED' | 'REMOVED';
  indexable: boolean;
  authorWarnings: number;
}) {
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [warn, setWarn] = useState(true);

  if (status === 'REMOVED')
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-xs"
        disabled={pending}
        onClick={() => run(() => restoreCommunityPost(postId))}
      >
        Khôi phục
      </Button>
    );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap justify-end gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-xs"
          disabled={pending}
          onClick={() => run(() => setCommunityPostIndexable(postId, !indexable))}
        >
          {indexable ? 'Tắt index' : 'Cho Google index'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="text-xs"
          disabled={pending}
          onClick={() => setOpen((value) => !value)}
        >
          Xóa & cảnh báo
        </Button>
      </div>
      {open && (
        <div className="space-y-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-left text-sm">
          <textarea
            className="border-border bg-background w-full rounded-lg border px-3 py-2 text-sm"
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Lý do (gửi email cho người viết), vd. Spam link quảng cáo"
            maxLength={500}
          />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={warn} onChange={(e) => setWarn(e.target.checked)} />
            Tính 1 cảnh báo (tác giả đang có {authorWarnings}/3
            {authorWarnings >= 2 ? ' — lần này sẽ khóa tài khoản' : ''})
          </label>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              run(
                async () => {
                  const result = await removePostWithWarning({ postId, reason, warn });
                  if (result.ok && result.data.locked)
                    window.alert('Tác giả đã đủ 3 cảnh báo — tài khoản đã bị khóa.');
                  return result;
                },
                () => setOpen(false),
              )
            }
          >
            Xác nhận gỡ bài
          </Button>
        </div>
      )}
    </div>
  );
}

export function UnlockUserButton({ userId }: { userId: string }) {
  const { pending, run } = useRun();
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-xs"
        disabled={pending}
        onClick={() => run(() => unlockUser(userId, false))}
      >
        Mở khóa
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-xs"
        disabled={pending}
        onClick={() => {
          if (window.confirm('Mở khóa và xóa toàn bộ cảnh báo của tài khoản này?'))
            run(() => unlockUser(userId, true));
        }}
      >
        Mở khóa + xóa cảnh báo
      </Button>
    </div>
  );
}
