import { describe, expect, it } from 'vitest';

import { youtubeEmbedUrl } from './youtube-player';

describe('youtubeEmbedUrl', () => {
  it('embeds standard, short, shorts, and live YouTube URLs using privacy-enhanced hosting', () => {
    const expected = 'https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1&rel=0';

    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=abcdefghijk')).toBe(expected);
    expect(youtubeEmbedUrl('https://youtu.be/abcdefghijk?si=share')).toBe(expected);
    expect(youtubeEmbedUrl('https://youtube.com/shorts/abcdefghijk')).toBe(expected);
    expect(youtubeEmbedUrl('https://www.youtube.com/live/abcdefghijk')).toBe(expected);
    expect(youtubeEmbedUrl('https://www.youtube-nocookie.com/embed/abcdefghijk')).toBe(expected);
  });

  it('rejects non-YouTube hosts, invalid schemes, and malformed video IDs', () => {
    expect(youtubeEmbedUrl('https://example.org/watch?v=abcdefghijk')).toBeNull();
    expect(youtubeEmbedUrl('javascript:alert(1)')).toBeNull();
    expect(youtubeEmbedUrl('https://youtube.com/watch?v=short')).toBeNull();
    expect(youtubeEmbedUrl('not a URL')).toBeNull();
  });
});
