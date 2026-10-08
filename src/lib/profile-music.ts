/** Audius profile soundtracks. Only API-streamable (non-gated) tracks may be selected. */
export const AUDIOUS_APP_NAME = 'RichCityHoops';
export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  permalink: string;
  duration: number;
};

export function profileTrackId(value: string | null | undefined): string | null {
  if (!value?.startsWith('audius:')) return null;
  const id = value.slice('audius:'.length);
  return /^[a-zA-Z0-9_-]{1,80}$/.test(id) ? id : null;
}

export function audiusStreamUrl(id: string): string {
  return `https://api.audius.co/v1/tracks/${encodeURIComponent(id)}/stream?app_name=${AUDIOUS_APP_NAME}`;
}

type RawTrack = {
  id?: unknown;
  title?: unknown;
  duration?: unknown;
  permalink?: unknown;
  artwork?: { '150x150'?: unknown; '480x480'?: unknown } | null;
  user?: { name?: unknown; handle?: unknown } | null;
  is_streamable?: boolean;
  is_stream_gated?: boolean;
  access?: { stream?: boolean; download?: boolean } | null;
};

export function normalizeAudiusTrack(raw: unknown): MusicTrack | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as RawTrack;
  if (typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)) return null;
  if (typeof item.title !== 'string' || !item.title.trim()) return null;
  if (item.is_streamable === false || item.is_stream_gated === true || item.access?.stream === false) return null;
  const link = typeof item.permalink === 'string' ? item.permalink : '';
  const permalink = /^https:\/\/(www\.)?audius\.co\//i.test(link)
    ? link : `https://audius.co/`;
  const art = item.artwork?.['150x150'] || item.artwork?.['480x480'];
  return {
    id: item.id,
    title: item.title.trim().slice(0, 180),
    artist: typeof item.user?.name === 'string' && item.user.name.trim()
      ? item.user.name.trim().slice(0, 140) : 'Audius artist',
    artworkUrl: typeof art === 'string' && /^https:\/\//i.test(art) ? art : null,
    permalink,
    duration: typeof item.duration === 'number' && item.duration > 0 ? item.duration : 0,
  };
}
