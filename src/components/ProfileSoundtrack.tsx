'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaMusic, FaPause, FaPlay, FaVolumeHigh, FaVolumeXmark } from 'react-icons/fa6';

function getYouTubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null;
    if (url.hostname === 'youtube.com' || url.hostname === 'www.youtube.com') {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || null;
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || null;
    }
  } catch {}
  return null;
}

export function ProfileSoundtrack({ url, profileName }: { url?: string | null; profileName: string }) {
  const videoId = useMemo(() => (url ? getYouTubeId(url) : null), [url]);
  // null: autoplay attempted; true: visitor pressed Play; false: visitor paused.
  // Do not label an attempted autoplay as "playing" since the browser can block it.
  const [manualPlayback, setManualPlayback] = useState<boolean | null>(null);
  const [muted, setMuted] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setManualPlayback(null);
    setMuted(false);
    setReloadKey(0);
  }, [videoId]);

  if (!videoId) return null;

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const wantsPlayback = manualPlayback !== false;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${wantsPlayback ? 1 : 0}&playsinline=1&enablejsapi=1&rel=0&modestbranding=1&origin=${encodeURIComponent(origin)}&mute=${muted ? 1 : 0}&v=${reloadKey}`;

  const togglePlayback = () => {
    // Initial click always retries Play (important when browsers block autoplay).
    setManualPlayback(previous => previous === true ? false : true);
    setReloadKey(value => value + 1);
  };

  return <section className="relative mt-5 rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 px-4 py-3 shadow-sm" aria-label={`${profileName}'s profile soundtrack`}>
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rcl-blue text-white" aria-hidden="true"><FaMusic /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">Profile song</p>
        <p className="mt-0.5 text-xs text-white/65" aria-live="polite">
          {manualPlayback === false ? 'Paused' : manualPlayback === true ? 'Playback requested' : 'Autoplay attempted · tap Play if silent'}
        </p>
      </div>
      <button type="button" onClick={togglePlayback} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rcl-blue text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label={manualPlayback === true ? 'Pause profile song' : 'Play profile song'}>
        {manualPlayback === true ? <FaPause /> : <FaPlay />}
      </button>
      <button type="button" onClick={() => { setMuted(value => !value); setReloadKey(value => value + 1); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label={muted ? 'Unmute profile song' : 'Mute profile song'} aria-pressed={muted}>
        {muted ? <FaVolumeXmark /> : <FaVolumeHigh />}
      </button>
    </div>
    <iframe key={`${videoId}-${reloadKey}-${muted}-${manualPlayback}`} title={`${profileName}'s profile soundtrack audio`} src={embedUrl} allow="autoplay; encrypted-media; picture-in-picture" aria-hidden="true" className="pointer-events-none absolute h-px w-px opacity-0" />
  </section>;
}
