/**
 * Public RCH TV streaming configuration.
 *
 * Restream is the production/multistreaming tool. Its YouTube destination
 * exposes a public watch link for the affordable website embed path.
 * A direct Restream website player is supported only on eligible paid plans.
 *
 * Never store an RTMP stream key, account API token or OAuth credential here:
 * site_settings.value is intentionally readable by public viewers.
 */
export type RchTvLiveProvider = 'youtube' | 'restream';

export type RchTvLiveConfig = {
  provider: RchTvLiveProvider;
  url: string;
  title: string;
  enabled: boolean;
};

export const RCH_TV_LIVE_SETTINGS_KEY = 'rch_tv_live_source';

const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

function hostMatches(host: string, allowed: string): boolean {
  return host === allowed || host === `www.${allowed}` || host === `m.${allowed}`;
}

/** Resolve only known, iframe-safe public stream destinations. */
export function parseRchTvLiveEmbed(
  provider: RchTvLiveProvider,
  input: string,
): string | null {
  const value = input.trim();
  if (!value || value.length > 2048 || /[<>\r\n]/.test(value)) return null;
  let parsed: URL;
  try { parsed = new URL(value); } catch { return null; }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return null;
  const host = parsed.hostname.toLowerCase();

  if (provider === 'youtube') {
    let id: string | null = null;
    if (hostMatches(host, 'youtu.be')) {
      id = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (hostMatches(host, 'youtube.com') || host === 'www.youtube-nocookie.com') {
      if (parsed.pathname === '/watch') id = parsed.searchParams.get('v');
      else if (/^\/(live|embed)\/[^/]+\/?$/.test(parsed.pathname)) {
        id = parsed.pathname.split('/')[2] || null;
      }
    }
    if (!id || !VIDEO_ID.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`;
  }

  if (provider === 'restream') {
    // Accept the public player URL, not a Restream RTMP ingest endpoint.
    if (host !== 'player.restream.io') return null;
    if (!parsed.pathname.startsWith('/')) return null;
    if (parsed.hash) return null;
    return parsed.toString();
  }
  return null;
}

export function readRchTvLiveConfig(input: unknown): RchTvLiveConfig | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const x = input as Record<string, unknown>;
  if ((x.provider !== 'youtube' && x.provider !== 'restream') || typeof x.url !== 'string') return null;
  const url = parseRchTvLiveEmbed(x.provider, x.url);
  if (!url) return null;
  return {
    provider: x.provider,
    url: x.url.trim(),
    title: typeof x.title === 'string' ? x.title.trim().slice(0, 120) : 'RCH TV Live',
    enabled: x.enabled === true,
  };
}
