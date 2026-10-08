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

  useEffect(() => {
    setStarted(true);
    setMuted(false);
    setReloadKey(0);
  }, [videoId]);

  if (!videoId) return null;

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${started ? 1 : 0}&playsinline=1&enablejsapi=1&rel=0&modestbranding=1&origin=${encodeURIComponent(origin)}&mute=${muted ? 1 : 0}&v=${reloadKey}`;

  const togglePlayback = () => {
    setStarted(value => !value);
    setReloadKey(key => key + 1);
  };

  const startPlayback = () => {
    setStarted(true);
    setMuted(false);
    setReloadKey(key => key + 1);
  };

  return <section className="relative mt-5 overflow-hidden rounded-3xl border border-rcl-orange/30 bg-[radial-gradient(circle_at_78%_12%,rgba(46,130,255,.2),transparent_34%),linear-gradient(135deg,#0b1d30,#050b12)] p-4 shadow-[0_24px_60px_rgba(3,7,13,.28)] sm:p-5" aria-label={`${profileName}'s profile soundtrack`}>
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rcl-orange text-black shadow-[0_8px_22px_rgba(238,116,28,.25)]"><FaMusic /></span>
      <p className="flex-1 text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Profile soundtrack</p>
      <button type="button" onClick={togglePlayback} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-black/30 text-white transition hover:border-rcl-orange/60" aria-label={started ? 'Pause profile soundtrack' : 'Play profile soundtrack'}>{started ? <FaPause /> : <FaPlay />}</button>
    </div>

    <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#071522] p-3 shadow-inner sm:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(59,130,246,.28),transparent_46%),linear-gradient(160deg,rgba(7,21,34,.25),rgba(2,6,12,.9))]" />
      <img src="/rch-boombox.webp" alt="Retro boombox profile player" className="relative z-10 mx-auto block w-full max-w-[520px] rounded-xl object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,.5)]" />
      <div className="absolute inset-x-5 bottom-5 z-20 flex items-center justify-between gap-3 sm:inset-x-8 sm:bottom-8">
        <span className="rounded-full border border-white/15 bg-[#03070d]/85 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white/75 backdrop-blur">{started ? 'Now playing' : 'Paused'}</span>
        <button type="button" onClick={startPlayback} className="grid h-12 w-12 place-items-center rounded-full bg-rcl-orange text-black shadow-lg transition hover:scale-105" aria-label={started ? 'Restart profile soundtrack' : 'Play profile soundtrack'}>{started ? <FaPause /> : <FaPlay />}</button>
      </div>
      <iframe key={`${videoId}-${reloadKey}-${muted}-${started}`} title={`${profileName}'s profile soundtrack audio`} src={embedUrl} allow="autoplay; encrypted-media; picture-in-picture" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-px w-px -translate-x-1/2 -translate-y-1/2 opacity-0" />
    </div>

    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/40">
      <span>Audio via YouTube</span>
      <button type="button" onClick={() => { setMuted(value => !value); setReloadKey(key => key + 1); }} className="inline-flex items-center gap-2 font-bold text-white/60 transition hover:text-white"><FaVolumeHigh />{muted ? 'Unmute' : 'Mute'}</button>
    </div>
  </section>;
}
