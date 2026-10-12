'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { togglePostPublish } from '@/server/actions/post';
import { CheckCircle2, Send } from 'lucide-react';

interface PostPublishButtonProps {
  slug: string;
  initialDraft: boolean;
}

export function PostPublishButton({ slug, initialDraft }: PostPublishButtonProps) {
  const [isDraft, setIsDraft] = useState(initialDraft);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await togglePostPublish(slug);
      if (res.success && typeof res.isDraft === 'boolean') {
        setIsDraft(res.isDraft);
        router.refresh();
      }
    } catch (error) {
      console.error('Lỗi khi đổi trạng thái bài viết:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isDraft) {
    return (
      <Button
        variant="success"
        size="sm"
        onClick={handleToggle}
        loading={loading}
        loadingText="Đang xử lý..."
        className="h-7 gap-1.5 px-3 text-xs font-semibold"
        title="Bấm để xuất bản bài viết này lên website"
      >
        <Send className="size-3" />
        Xuất bản ngay
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="hover:bg-muted/80 border-info/20 bg-info/10 text-info inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition"
      title="Bài viết đã công khai. Bấm để thu hồi về Bản nháp"
    >
      <CheckCircle2 className="text-info size-3" />
      <span>Đã xuất bản</span>
      {loading && <span className="text-muted-foreground animate-pulse text-[10px]">...</span>}
    </button>
  );
}
