import Image from 'next/image';
import type { ImgHTMLAttributes } from 'react';

/**
 * Ảnh trong MDX viết bằng cú pháp markdown `![alt](/images/x.png)` — không có
 * width/height. Dùng `fill` + aspect-ratio để vẫn lazy-load và không nhảy layout.
 */
export function MdxImage({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  if (typeof src !== 'string') return null;

  // Ảnh ngoài domain sẽ bị next/image chặn nếu chưa khai báo remotePatterns.
  if (!src.startsWith('/')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt ?? ''} loading="lazy" {...props} />;
  }

  return (
    <figure className="my-6">
      <div className="border-border relative aspect-[16/9] overflow-hidden rounded-lg border">
        <Image
          src={src}
          alt={alt ?? ''}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
        />
      </div>
      {alt ? (
        <figcaption className="text-muted-foreground mt-2 text-center text-sm">{alt}</figcaption>
      ) : null}
    </figure>
  );
}
