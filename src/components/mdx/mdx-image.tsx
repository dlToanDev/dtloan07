import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { ImgHTMLAttributes } from 'react';

/**
 * Ảnh trong MDX viết bằng cú pháp markdown `![alt](/images/x.png)`.
 * Giữ nguyên tỷ lệ để ảnh chụp màn hình/ảnh dọc không bị khung 16:9 cắt mất nội dung.
 */
export function MdxImage({ src, alt, className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  if (typeof src !== 'string') return null;

  const imageClassName = cn(
    'border-border bg-muted/20 block h-auto w-full rounded-lg border object-contain',
    className,
  );

  // Ảnh ngoài domain sẽ bị next/image chặn nếu chưa khai báo remotePatterns.
  if (!src.startsWith('/')) {
    return (
      <figure className="my-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ''} loading="lazy" className={imageClassName} {...props} />
        {alt ? (
          <figcaption className="text-muted-foreground mt-2 text-center text-sm">{alt}</figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure className="my-6">
      <Image
        src={src}
        alt={alt ?? ''}
        width={1600}
        height={900}
        sizes="(max-width: 768px) 100vw, 768px"
        className={imageClassName}
      />
      {alt ? (
        <figcaption className="text-muted-foreground mt-2 text-center text-sm">{alt}</figcaption>
      ) : null}
    </figure>
  );
}
