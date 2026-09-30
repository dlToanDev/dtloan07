interface VideoProps {
  src: string;
  title?: string;
}

function getEmbedUrl(src: string): string | null {
  try {
    const url = new URL(src);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

    if (hostname === 'youtu.be') {
      const videoId = url.pathname.split('/').filter(Boolean)[0];
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }

    if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'youtube-nocookie.com'
    ) {
      const parts = url.pathname.split('/').filter(Boolean);
      const videoId =
        url.searchParams.get('v') ||
        (['embed', 'shorts', 'live'].includes(parts[0] ?? '') ? parts[1] : null);
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }

    if (hostname === 'vimeo.com' || hostname === 'player.vimeo.com') {
      const videoId = url.pathname
        .split('/')
        .filter(Boolean)
        .findLast((part) => /^\d+$/.test(part));
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

/** Video responsive dùng trực tiếp trong MDX mà không cần import. */
export function Video({ src, title = 'Video minh họa' }: VideoProps) {
  const source = src.trim();
  if (!source || (!source.startsWith('/') && !/^https?:\/\//i.test(source))) return null;

  const embedUrl = getEmbedUrl(source);

  return (
    <figure className="not-prose my-8">
      <div className="border-border bg-muted relative aspect-video w-full overflow-hidden rounded-xl border shadow-sm">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={title}
            loading="lazy"
            className="absolute inset-0 size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <video
            src={source}
            title={title}
            controls
            preload="metadata"
            playsInline
            className="size-full bg-black object-contain"
          >
            Trình duyệt của bạn không hỗ trợ phát video.
          </video>
        )}
      </div>
      {title ? (
        <figcaption className="text-muted-foreground mt-2 text-center text-sm">{title}</figcaption>
      ) : null}
    </figure>
  );
}
