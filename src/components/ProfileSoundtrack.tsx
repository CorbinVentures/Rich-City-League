'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaMusic, FaPause, FaPlay, FaVolumeHigh } from 'react-icons/fa6';

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
  const [started, setStarted] = useState(true);
  const [muted, setMuted] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => { setStarted(true); setMuted(false); setReloadKey(0); }, [videoId]);
  if (!videoId) return null;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${started ? 1 : 0}&playsinline=1&enablejsapi=1&rel=0&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}&mute=${muted ? 1 : 0}&v=${reloadKey}`;
  return <section className="mt-5 overflow-hidden rounded-2xl border border-rcl-orange/25 bg-[linear-gradient(135deg,rgba(238,116,28,.12),rgba(8,17,27,.9))]" aria-label={`${profileName}'s profile soundtrack`}>
    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rcl-orange text-black"><FaMusic /></span>
      <div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Profile soundtrack</p><p className="truncate text-sm font-bold text-white/80">Now playing from YouTube</p></div>
      <button type="button" onClick={() => { setStarted(value => !value); setReloadKey(k => k + 1); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-black/30 text-white transition hover:border-rcl-orange/60" aria-label={started ? 'Pause profile soundtrack' : 'Play profile soundtrack'}>{started ? <FaPause /> : <FaPlay />}</button>
    </div>
    <div className="relative aspect-video min-h-[200px] w-full bg-black sm:h-[200px] sm:aspect-auto">
      <iframe key={`${videoId}-${reloadKey}-${muted}-${started}`} title={`${profileName}'s YouTube profile soundtrack`} src={embedUrl} allow="autoplay; encrypted-media; picture-in-picture" className="h-full w-full border-0" />
      {!started && <button type="button" onClick={() => { setStarted(true); setMuted(false); setReloadKey(k => k + 1); }} className="absolute inset-0 grid place-items-center bg-black/55 text-center text-sm font-black uppercase tracking-wider text-white"><span className="rounded-full border border-rcl-orange/50 bg-rcl-orange px-5 py-3 text-black">Tap to start soundtrack</span></button>}
    </div>
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-white/40"><span>Powered by YouTube</span><button type="button" onClick={() => { setMuted(value => !value); setReloadKey(k => k + 1); }} className="inline-flex items-center gap-2 font-bold text-white/60 hover:text-white"><FaVolumeHigh />{muted ? 'Unmute' : 'Mute'}</button></div>
  </section>;
}
