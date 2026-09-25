'use client';

import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadCoverImage } from '@/server/actions/post';

const MAX_IMAGES = 20;

export function GalleryPicker({
  defaultValue,
  onUploadStart,
  onUploadEnd,
}: {
  defaultValue: string[];
  onUploadStart: () => void;
  onUploadEnd: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMAGES - urls.length;
    const selected = Array.from(files).slice(0, room);
    if (selected.length === 0) {
      setError(`Tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }
    setError('');
    setUploading(true);
    onUploadStart();
    try {
      for (const file of selected) {
        const formData = new FormData();
        formData.set('file', file);
        const result = await uploadCoverImage(formData);
        if (result.success && result.url) {
          const url = result.url;
          setUrls((prev) => [...prev, url]);
        } else {
          setError(result.error || `Không tải được "${file.name}".`);
        }
      }
    } catch {
      setError('Lỗi kết nối khi tải ảnh lên.');
    } finally {
      setUploading(false);
      onUploadEnd();
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const move = (index: number, delta: number) =>
    setUrls((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  return (
    <div className="space-y-3">
      <input type="hidden" name="gallery" value={JSON.stringify(urls)} />
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="sr-only"
        onChange={(event) => upload(event.target.files)}
      />
      {urls.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {urls.map((url, index) => (
            <li
              key={url}
              className="border-border group relative overflow-hidden rounded-lg border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-square w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/60 p-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  className="p-1 text-white"
                  title="Lên trước"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  className="p-1 text-white"
                  title="Xuống sau"
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setUrls((prev) => prev.filter((item) => item !== url))}
                  className="p-1 text-red-300"
                  title="Xóa ảnh"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={uploading || urls.length >= MAX_IMAGES}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        Thêm ảnh từ máy ({urls.length}/{MAX_IMAGES})
      </Button>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
