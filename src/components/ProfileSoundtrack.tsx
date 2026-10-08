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

  return <section className="relative mt-5 rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-4 shadow-sm sm:p-5" aria-label={`${profileName}'s profile soundtrack`}>
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rcl-blue text-white"><FaMusic /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-[.18em] text-rcl-blue">Profile soundtrack</p>
        <p className="mt-1 truncate text-sm font-semibold text-[#71839A]">YouTube audio</p>
      </div>
      <button type="button" onClick={togglePlayback} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rcl-blue text-white transition hover:brightness-110" aria-label={started ? 'Pause profile soundtrack' : 'Play profile soundtrack'}>{started ? <FaPause /> : <FaPlay />}</button>
    </div>

    <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#E1E8F0] bg-white px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${started ? 'bg-rcl-blue/10 text-rcl-blue' : 'bg-[#F1F4F8] text-[#71839A]'}`} aria-hidden="true"><FaMusic /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#0F2547]">{started ? 'Playing your profile song' : 'Profile song paused'}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E8EEF5]"><span className={`block h-full rounded-full bg-rcl-blue transition-all ${started ? 'w-2/3' : 'w-1/4'}`} /></div>
      </div>
      <button type="button" onClick={() => { setMuted(value => !value); setReloadKey(key => key + 1); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#71839A] transition hover:bg-[#F1F4F8] hover:text-[#0F2547]" aria-label={muted ? 'Unmute profile soundtrack' : 'Mute profile soundtrack'}><FaVolumeHigh /></button>
    </div>

    <iframe key={`${videoId}-${reloadKey}-${muted}-${started}`} title={`${profileName}'s profile soundtrack audio`} src={embedUrl} allow="autoplay; encrypted-media; picture-in-picture" aria-hidden="true" className="pointer-events-none absolute h-px w-px opacity-0" />
  </section>;
}
