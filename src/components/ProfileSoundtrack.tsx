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
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${started ? 1 : 0}&playsinline=1&enablejsapi=1&rel=0&modestbranding=1&origin=${encodeURIComponent(origin)}&mute=${muted ? 1 : 0}&v=${reloadKey}`;
  return <section className="relative mt-5 overflow-hidden rounded-3xl border border-rcl-orange/30 bg-[radial-gradient(circle_at_78%_12%,rgba(46,130,255,.2),transparent_34%),linear-gradient(135deg,#0b1d30,#050b12)] p-4 shadow-[0_24px_60px_rgba(3,7,13,.28)] sm:p-5" aria-label={`${profileName}'s profile soundtrack`}>
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rcl-orange text-black shadow-[0_8px_22px_rgba(238,116,28,.25)]"><FaMusic /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Profile soundtrack</p>
        <p className="truncate text-sm font-bold text-white/80">A little MySpace energy for ${profileName}</p>
      </div>
      <button type="button" onClick={() => { setStarted(value => !value); setReloadKey(k => k + 1); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-black/30 text-white transition hover:border-rcl-orange/60" aria-label={started ? 'Pause profile soundtrack' : 'Play profile soundtrack'}>{started ? <FaPause /> : <FaPlay />}</button>
    </div>

    <div className="mt-4 grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_190px]">
      <div className="relative min-h-[200px] overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-inner">
        <iframe key={`${videoId}-${reloadKey}-${muted}-${started}`} title={`${profileName}'s YouTube profile soundtrack`} src={embedUrl} allow="autoplay; encrypted-media; picture-in-picture" className="h-[200px] w-full border-0" />
        {!started && <button type="button" onClick={() => { setStarted(true); setMuted(false); setReloadKey(k => k + 1); }} className="absolute inset-0 grid place-items-center bg-black/60 p-4 text-center text-sm font-black uppercase tracking-wider text-white"><span className="rounded-full border border-rcl-orange/50 bg-rcl-orange px-5 py-3 text-black">Tap to start soundtrack</span></button>}
      </div>
      <div className="relative flex min-h-[190px] items-center justify-center overflow-visible">
        <div className="absolute inset-x-5 bottom-3 h-8 rounded-full bg-black/45 blur-xl" />
        <img src="/rch-boombox.png" alt="Floating retro boombox" className="relative z-10 w-full max-w-[300px] drop-shadow-[0_18px_20px_rgba(0,0,0,.45)]" />
      </div>
    </div>

    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/40">
      <span>Auto-play is attempted when the profile opens</span>
      <button type="button" onClick={() => { setMuted(value => !value); setReloadKey(k => k + 1); }} className="inline-flex items-center gap-2 font-bold text-white/60 hover:text-white"><FaVolumeHigh />{muted ? 'Unmute' : 'Mute'}</button>
    </div>
  </section>;
}
