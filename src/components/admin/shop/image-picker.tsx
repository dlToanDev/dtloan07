'use client';

import { useRef, useState } from 'react';
import { GripVertical, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { uploadCoverImage } from '@/server/actions/post';
import { moveItem } from '@/lib/shop/product-form';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

/**
 * Gộp ảnh bìa và thư viện ảnh: ảnh đầu tiên là ảnh bìa (`coverUrl`), phần còn lại là
 * `gallery`. Không có ảnh nào thì trang sản phẩm dùng ảnh bìa tự động theo tên.
 */
export function ImagePicker({
  defaultCover,
  defaultGallery,
  max,
  onUploadStart,
  onUploadEnd,
}: {
  defaultCover: string;
  defaultGallery: string[];
  /** 1 = chỉ ảnh bìa (source code). */
  max: number;
  onUploadStart: () => void;
  onUploadEnd: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState(() =>
    [defaultCover, ...defaultGallery].filter(Boolean).slice(0, max),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [fileOver, setFileOver] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    // Chế độ 1 ảnh: chọn ảnh mới là thay ảnh cũ.
    const room = max === 1 ? 1 : max - urls.length;
    const selected = Array.from(files).slice(0, room);
    if (selected.length === 0) {
      setError(`Tối đa ${max} ảnh.`);
      return;
    }
    setError('');
    setUploading(true);
    onUploadStart();
    try {
      for (const file of selected) {
        if (file.size > MAX_FILE_BYTES) {
          setError(`"${file.name}" lớn hơn 8 MB.`);
          continue;
        }
        const formData = new FormData();
        formData.set('file', file);
        const result = await uploadCoverImage(formData);
        if (result.success && result.url) {
          const url = result.url;
          setUrls((prev) => (max === 1 ? [url] : [...prev, url]));
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

  const [cover = '', ...gallery] = urls;

  return (
    <div className="space-y-3">
      <input type="hidden" name="coverUrl" value={cover} />
      {max > 1 && <input type="hidden" name="gallery" value={JSON.stringify(gallery)} />}
      <input
        ref={inputRef}
        type="file"
        multiple={max > 1}
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="sr-only"
        onChange={(event) => upload(event.target.files)}
      />

      <ul
        className={`grid gap-3 ${max === 1 ? 'max-w-sm grid-cols-1' : 'grid-cols-3 sm:grid-cols-5'}`}
      >
        {urls.map((url, index) => (
          <li
            key={url}
            draggable={urls.length > 1}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) setUrls((prev) => moveItem(prev, dragIndex, index));
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`border-border bg-muted/30 relative overflow-hidden rounded-lg border ${
              index === 0 && max > 1 ? 'ring-primary ring-2' : ''
            } ${dragIndex === index ? 'opacity-40' : ''} ${urls.length > 1 ? 'cursor-grab' : ''}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className={`w-full object-cover ${max === 1 ? 'aspect-video' : 'aspect-square'}`}
            />
            {index === 0 && max > 1 && (
              <span className="bg-primary text-primary-foreground absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[11px] font-semibold">
                Ảnh bìa
              </span>
            )}
            {urls.length > 1 && (
              <GripVertical className="absolute top-1.5 right-1.5 size-4 text-white drop-shadow" />
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-4">
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => setUrls((prev) => moveItem(prev, index, 0))}
                  className="rounded bg-black/40 p-1 text-white hover:bg-black/60"
                  title="Đặt làm ảnh bìa"
                >
                  <Star className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setUrls((prev) => prev.filter((item) => item !== url))}
                className="rounded bg-black/40 p-1 text-red-300 hover:bg-black/60"
                title="Xóa ảnh"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </li>
        ))}

        {(max === 1 ? urls.length === 0 : urls.length < max) && (
          <li>
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                if (dragIndex !== null) return;
                event.preventDefault();
                setFileOver(true);
              }}
              onDragLeave={() => setFileOver(false)}
              onDrop={(event) => {
                if (dragIndex !== null) return;
                event.preventDefault();
                setFileOver(false);
                upload(event.dataTransfer.files);
              }}
              className={`text-muted-foreground flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs transition ${
                max === 1 ? 'aspect-video' : 'aspect-square'
              } ${
                fileOver
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/60 hover:text-primary'
              }`}
            >
              {uploading ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <ImagePlus className="size-6" />
              )}
              <span className="font-medium">{uploading ? 'Đang tải…' : 'Thêm ảnh'}</span>
              {max > 1 && (
                <span>
                  ({urls.length}/{max})
                </span>
              )}
            </button>
          </li>
        )}
      </ul>

      {max === 1 && urls.length > 0 && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="text-primary text-sm hover:underline"
        >
          {uploading ? 'Đang tải…' : 'Đổi ảnh'}
        </button>
      )}
      <p className="text-muted-foreground text-xs">
        {max === 1
          ? 'Nên dùng ảnh 16:9 (1280×720), tối đa 8 MB. Không có ảnh thì dùng ảnh bìa tự động.'
          : 'Ảnh đầu tiên là ảnh bìa. Chọn hoặc kéo thả nhiều ảnh cùng lúc, kéo ảnh để đổi thứ tự. Tối đa 8 MB/ảnh.'}
      </p>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
