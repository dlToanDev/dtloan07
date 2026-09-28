'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  abortLessonUpload,
  completeLessonUpload,
  startLessonUpload,
  type CompletedUpload,
} from '@/server/actions/course-lessons';
import type { UploadKind } from '@/lib/courses/uploads';
import { safeAction } from '@/lib/courses/safe-action';

const PARALLEL_PARTS = 3;
const RETRIES = 3;

class UploadCancelled extends Error {}

/** PUT một phần lên link ký sẵn, trả về ETag. Dùng XHR để theo dõi tiến độ. */
function putPart(url: string, blob: Blob, onBytes: (loaded: number) => void, signal: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.upload.onprogress = (event) => onBytes(event.loaded);
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300)
        return reject(new Error(`R2 trả lỗi ${xhr.status}`));
      const etag = xhr.getResponseHeader('ETag');
      if (!etag)
        return reject(
          new Error('Không đọc được ETag — kiểm tra CORS của bucket R2 (ExposeHeaders: ETag).'),
        );
      resolve(etag);
    };
    xhr.onerror = () => reject(new Error('Mất kết nối khi upload.'));
    const abort = () => {
      xhr.abort();
      reject(new UploadCancelled());
    };
    if (signal.aborted) return abort();
    signal.addEventListener('abort', abort, { once: true });
    xhr.send(blob);
  });
}

/** Upload file thẳng lên R2 theo từng phần rồi gắn vào bài học. */
export async function uploadLessonFile({
  lessonId,
  kind,
  file,
  label,
  onProgress,
  signal,
}: {
  lessonId: string;
  kind: UploadKind;
  file: File;
  label?: string;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}): Promise<CompletedUpload> {
  const started = await safeAction(() =>
    startLessonUpload({ lessonId, kind, filename: file.name, size: file.size }),
  );
  if (!started.ok) throw new Error(started.error);
  const { key, uploadId, partSize, urls } = started.data;

  const loaded = new Array<number>(urls.length).fill(0);
  const report = () => onProgress(loaded.reduce((a, b) => a + b, 0) / file.size);
  const parts: { partNumber: number; etag: string }[] = [];

  try {
    let next = 0;
    const worker = async () => {
      while (next < urls.length) {
        const index = next++;
        const blob = file.slice(index * partSize, Math.min(file.size, (index + 1) * partSize));
        for (let attempt = 1; ; attempt++) {
          try {
            const etag = await putPart(
              urls[index]!,
              blob,
              (bytes) => {
                loaded[index] = bytes;
                report();
              },
              signal,
            );
            parts.push({ partNumber: index + 1, etag });
            break;
          } catch (error) {
            if (error instanceof UploadCancelled || attempt >= RETRIES) throw error;
            loaded[index] = 0;
            await new Promise((r) => setTimeout(r, 1000 * attempt));
          }
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL_PARTS, urls.length) }, worker));
  } catch (error) {
    await abortLessonUpload({ lessonId, kind, key, uploadId });
    throw error instanceof UploadCancelled ? new Error('Đã hủy upload.') : error;
  }

  const completed = await safeAction(() =>
    completeLessonUpload({
      lessonId,
      kind,
      key,
      uploadId,
      filename: file.name,
      label,
      parts,
    }),
  );
  if (!completed.ok) throw new Error(completed.error);
  return completed.data;
}

/** Nút chọn file + thanh tiến độ + hủy, dùng cho video / slide / tài liệu. */
export function UploadButton({
  lessonId,
  kind,
  accept,
  label,
  fileLabel,
  onDone,
  onError,
  onBusyChange,
}: {
  lessonId: string;
  kind: UploadKind;
  accept?: string;
  label: string;
  /** Tên hiển thị cho tài liệu (tùy chọn). */
  fileLabel?: string;
  onDone: (result: CompletedUpload) => void;
  onError: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [name, setName] = useState('');

  const start = async (file: File) => {
    controller.current = new AbortController();
    setName(file.name);
    setProgress(0);
    onBusyChange?.(true);
    try {
      const result = await uploadLessonFile({
        lessonId,
        kind,
        file,
        label: fileLabel,
        onProgress: setProgress,
        signal: controller.current.signal,
      });
      onDone(result);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Upload thất bại.');
    } finally {
      setProgress(null);
      onBusyChange?.(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => event.target.files?.[0] && start(event.target.files[0])}
      />
      {progress === null ? (
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
          <Upload className="size-4" /> {label}
        </Button>
      ) : (
        <div className="border-border space-y-1.5 rounded-lg border p-3 text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="text-primary size-4 animate-spin" />
            <span className="min-w-0 flex-1 truncate">{name}</span>
            <span className="text-muted-foreground tabular-nums">
              {Math.floor(progress * 100)}%
            </span>
            <button
              type="button"
              onClick={() => controller.current?.abort()}
              className="text-muted-foreground hover:text-destructive"
              title="Hủy upload"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
