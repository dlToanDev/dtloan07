export interface VideoEmbed {
  provider: 'youtube' | 'vimeo';
  embedUrl: string;
}

/** Đọc link YouTube / Vimeo admin dán vào thành link nhúng. Link lạ → null. */
export function parseVideoEmbed(raw: string | null | undefined): VideoEmbed | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, '');

  let youtubeId: string | null = null;
  if (host === 'youtu.be') youtubeId = url.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    youtubeId =
      url.searchParams.get('v') ??
      url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ??
      null;
  }
  if (youtubeId && /^[\w-]{6,20}$/.test(youtubeId)) {
    const start = url.searchParams.get('t')?.replace(/s$/, '');
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0${
        start && /^\d+$/.test(start) ? `&start=${start}` : ''
      }`,
    };
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = url.pathname.match(/(\d{6,})/)?.[1];
    if (id) return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` };
  }
  return null;
}
