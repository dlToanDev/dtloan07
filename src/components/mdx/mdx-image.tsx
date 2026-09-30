import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { ImgHTMLAttributes } from 'react';

/**
 * Ảnh trong MDX viết bằng cú pháp markdown `![alt](/images/x.png)`.
 * Giữ nguyên tỷ lệ để ảnh chụp màn hình/ảnh dọc không bị khung 16:9 cắt mất nội dung.
 */
export function MdxImage({
  src,
  alt,
  className,
  style,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & {
  'data-alignment'?: 'left' | 'center' | 'right';
  'data-width'?: string;
}) {
  if (typeof src !== 'string' || !src.trim()) return null;

  const alignment = (props['data-alignment'] as string) || 'center';
  const width = (props['data-width'] as string) || '';

  const alignClass =
    alignment === 'left'
      ? 'mr-auto text-left'
      : alignment === 'right'
        ? 'ml-auto text-right'
        : 'mx-auto text-center';

  const imageClassName = cn(
    'border-border bg-muted/20 block h-auto w-full rounded-lg border object-contain',
    className,
  );

  const figureStyle: React.CSSProperties = {
    ...(style || {}),
    maxWidth: width && width !== '100%' ? width : undefined,
  };

  // Ảnh ngoài domain sẽ bị next/image chặn nếu chưa khai báo remotePatterns.
  if (!src.startsWith('/')) {
    return (
      <figure className={cn('my-6', alignClass)} style={figureStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ''} loading="lazy" className={imageClassName} {...props} />
        {alt ? (
          <figcaption className="text-muted-foreground mt-2 text-center text-sm">{alt}</figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure className={cn('my-6', alignClass)} style={figureStyle}>
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
