const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function youtubeEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    const host = url.hostname.toLowerCase();
    const isShortDomain = host === 'youtu.be' || host.endsWith('.youtu.be');
    const isYoutubeDomain =
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host === 'youtube-nocookie.com' ||
      host.endsWith('.youtube-nocookie.com');
    if (!isShortDomain && !isYoutubeDomain) {
      return null;
    }

    const path = url.pathname.split('/').filter(Boolean);
    const videoId = isShortDomain
      ? path[0]
      : url.searchParams.get('v') ??
        (['embed', 'shorts', 'live', 'v'].includes(path[0] ?? '') ? path[1] : undefined);
    if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
      return null;
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
  } catch {
    return null;
  }
}
