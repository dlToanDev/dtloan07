'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommunityEditor } from '@/components/community/community-editor';
import { safeAction } from '@/lib/courses/safe-action';
import {
  createCommunityPost,
  updateCommunityPost,
  uploadCommunityImage,
} from '@/server/actions/community-post';

const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2.5 text-sm';

export interface CommunityPostFormValue {
  id: string;
  title: string;
  contentHtml: string;
  coverUrl: string | null;
  tags: string[];
}

export function CommunityPostForm({ initial }: { initial?: CommunityPostFormValue }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [contentHtml, setContentHtml] = useState(initial?.contentHtml ?? '');
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? '');
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const uploadCover = async (file: File) => {
    setCoverUploading(true);
    setError('');
    const form = new FormData();
    form.set('file', file);
    const result = await safeAction(() => uploadCommunityImage(form));
    setCoverUploading(false);
    if (!result.ok) return setError(result.error);
    setCoverUrl(result.data.url);
  };

  const submit = () =>
    startTransition(async () => {
      setError('');
      const input = {
        title,
        contentHtml,
        coverUrl: coverUrl || null,
        tags: tags.split(',').map((tag) => tag.trim()),
      };
      const result = await safeAction(() =>
        initial ? updateCommunityPost(initial.id, input) : createCommunityPost(input),
      );
      if (!result.ok) return setError(result.error);
      router.push(`/blog/${result.data.slug}`);
      router.refresh();
    });

  const busy = pending || uploading || coverUploading;

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <label className="block space-y-2 text-sm font-medium">
        Tiêu đề
        <input
          className={`${inputClass} text-base font-semibold`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ví dụ: Kinh nghiệm deploy Next.js lên VPS"
          maxLength={150}
          required
        />
      </label>

      <div className="space-y-2 text-sm font-medium">
        Ảnh bìa (tùy chọn)
        {coverUrl ? (
          <div className="relative w-full max-w-sm overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="Ảnh bìa" className="aspect-video w-full object-cover" />
            <button
              type="button"
              onClick={() => setCoverUrl('')}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white"
              aria-label="Bỏ ảnh bìa"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <label className="border-border text-muted-foreground hover:bg-muted/40 flex w-full max-w-sm cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-6 font-normal">
            {coverUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            Chọn ảnh bìa
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void uploadCover(file);
              }}
            />
          </label>
        )}
      </div>

      <label className="block space-y-2 text-sm font-medium">
        Tag (cách nhau bằng dấu phẩy, tối đa 5)
        <input
          className={inputClass}
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="docker, nextjs, vps"
        />
      </label>

      <div className="space-y-2 text-sm font-medium">
        Nội dung
        <CommunityEditor
          value={contentHtml}
          onChange={setContentHtml}
          onError={setError}
          onUploadingChange={setUploading}
        />
      </div>

      <p className="text-muted-foreground text-xs">
        Bài đăng ngay lên blog kèm tên bạn. Nội dung vi phạm sẽ bị gỡ và cảnh báo; đủ 3 cảnh báo tài
        khoản bị khóa.
      </p>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {pending ? 'Đang lưu…' : initial ? 'Lưu thay đổi' : 'Đăng bài'}
        </Button>
      </div>
    </form>
  );
}
