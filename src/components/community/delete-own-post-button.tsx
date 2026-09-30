'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { safeAction } from '@/lib/courses/safe-action';
import { deleteOwnCommunityPost } from '@/server/actions/community-post';

export function DeleteOwnPostButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="text-xs text-red-600"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Xóa bài "${title}"? Không khôi phục được.`)) return;
        startTransition(async () => {
          const result = await safeAction(() => deleteOwnCommunityPost(id));
          if (!result.ok) window.alert(result.error);
          router.refresh();
        });
      }}
    >
      Xóa
    </Button>
  );
}
