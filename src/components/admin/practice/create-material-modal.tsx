'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Volume2,
  Video,
  Image as ImageIcon,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createStandaloneMaterialAction } from '@/server/actions/practice';
import { uploadQuizMedia } from '@/server/actions/course-lessons';

interface CreateMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateMaterialModal({ isOpen, onClose }: CreateMaterialModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Đọc hiểu & Nghe hiểu');
  const [passage, setPassage] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [isPending, startTransition] = useTransition();
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAudio(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadQuizMedia(fd);
      if (res.ok) setAudioUrl(res.data.url);
      else setError(res.error);
    } catch {
      setError('Lỗi tải file âm thanh lên máy chủ.');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadQuizMedia(fd);
      if (res.ok) setImageUrl(res.data.url);
      else setError(res.error);
    } catch {
      setError('Lỗi tải hình ảnh lên máy chủ.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      return setError('Vui lòng nhập tên ngữ liệu.');
    }
    if (!passage.trim() && !audioUrl.trim() && !videoUrl.trim() && !imageUrl.trim()) {
      return setError('Vui lòng nhập ít nhất một nội dung (đoạn văn, audio, video hoặc hình ảnh).');
    }

    startTransition(async () => {
      try {
        await createStandaloneMaterialAction({
          title,
          category,
          passage,
          audioUrl,
          videoUrl,
          imageUrl,
        });
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tạo ngữ liệu.');
      }
    });
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm duration-200 sm:p-5">
      <div className="border-border bg-card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
        <div className="border-border flex items-center justify-between border-b p-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
              <Plus className="size-5" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-bold">Thêm Ngữ Liệu Mới Vào Kho</h2>
              <p className="text-muted-foreground text-xs">
                Lưu trữ bài đọc, audio hoặc video dùng chung cho các đề thi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted cursor-pointer rounded-lg p-1.5"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-3 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-foreground text-xs font-bold">Tên ngữ liệu / Bài đọc *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Reading Passage: Climate Change & Sea Level"
              className="border-border bg-background focus:ring-primary/20 w-full rounded-xl border px-3 py-2 text-xs focus:ring-2 focus:outline-none sm:text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-semibold">
              Chuyên mục / Lĩnh vực:
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="VD: Tiếng Anh, TOEIC, Khoa học, Công nghệ..."
              className="border-border bg-background w-full rounded-xl border px-3 py-2 text-xs focus:outline-none sm:text-sm"
            />
          </div>

          {/* Passage */}
          <div className="space-y-1.5">
            <label className="text-foreground flex items-center gap-1.5 text-xs font-bold">
              <BookOpen className="text-primary size-3.5" /> Đoạn văn bản / Bài đọc hiểu (Passage)
            </label>
            <textarea
              rows={4}
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              placeholder="Dán toàn bộ bài đọc hiểu, đoạn văn, ngữ cảnh..."
              className="border-border bg-background w-full rounded-xl border px-3 py-2 font-sans text-xs leading-relaxed focus:outline-none sm:text-sm"
            />
          </div>

          {/* Audio */}
          <div className="space-y-2">
            <label className="text-foreground flex items-center gap-1.5 text-xs font-bold">
              <Volume2 className="text-info size-3.5" /> File âm thanh (Audio URL)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://... hoặc tải từ máy (.mp3)"
                className="border-border bg-background flex-1 rounded-xl border px-3 py-2 text-xs focus:outline-none"
              />
              <input
                type="file"
                ref={audioRef}
                accept="audio/*"
                onChange={handleUploadAudio}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => audioRef.current?.click()}
                disabled={isUploadingAudio}
                className="cursor-pointer gap-1 text-xs"
              >
                {isUploadingAudio ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}{' '}
                Tải file
              </Button>
            </div>
            {audioUrl && <audio controls src={audioUrl} className="h-8 w-full pt-1" />}
          </div>

          {/* Video */}
          <div className="space-y-1.5">
            <label className="text-foreground flex items-center gap-1.5 text-xs font-bold">
              <Video className="text-destructive size-3.5" /> Video hướng dẫn (YouTube embed hoặc
              MP4)
            </label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/embed/... hoặc link MP4"
              className="border-border bg-background w-full rounded-xl border px-3 py-2 text-xs focus:outline-none"
            />
          </div>

          {/* Image */}
          <div className="space-y-2">
            <label className="text-foreground flex items-center gap-1.5 text-xs font-bold">
              <ImageIcon className="text-success size-3.5" /> Hình ảnh minh họa (Image URL)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... hoặc tải từ máy"
                className="border-border bg-background flex-1 rounded-xl border px-3 py-2 text-xs focus:outline-none"
              />
              <input
                type="file"
                ref={imageRef}
                accept="image/*"
                onChange={handleUploadImage}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageRef.current?.click()}
                disabled={isUploadingImage}
                className="cursor-pointer gap-1 text-xs"
              >
                {isUploadingImage ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}{' '}
                Tải ảnh
              </Button>
            </div>
          </div>

          <div className="border-border flex items-center justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="cursor-pointer gap-1.5 text-xs font-bold"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}{' '}
              Lưu vào Kho Ngữ Liệu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
