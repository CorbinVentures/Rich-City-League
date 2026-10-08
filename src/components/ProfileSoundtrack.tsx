'use client';

import { useEffect, useRef, useState } from 'react';
import { FaMusic, FaPause, FaPlay, FaVolumeHigh, FaVolumeXmark } from 'react-icons/fa6';
import { audiusStreamUrl, profileTrackId, type MusicTrack } from '@/lib/profile-music';

export function ProfileSoundtrack({ url, profileName }: { url?: string | null; profileName: string }) {
  const id = profileTrackId(url);
  const [track, setTrack] = useState<MusicTrack | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'buffering' | 'playing' | 'paused' | 'error'>('loading');
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!id) { setTrack(null); return; }
    const controller = new AbortController();
    setTrack(null); setStatus('loading'); setMuted(false); setProgress(0);
    fetch(`/api/music/track?id=${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Song unavailable');
        const data: { track?: MusicTrack } = await response.json();
        if (!data.track) throw new Error('Song unavailable');
        if (!controller.signal.aborted) setTrack(data.track);
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => { controller.abort(); audioRef.current?.pause(); };
  }, [id]);

  useEffect(() => {
    if (!track || !audioRef.current) return;
    const audio = audioRef.current;
    audio.muted = false;
    setStatus('ready');
    // Best-effort autoplay. Safari/iOS normally requires a visitor's tap.
    // Reflect the real audio element's playback events, not the request.
    void audio.play().catch(() => setStatus('ready'));
  }, [track]);

  if (!id) return null;

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (!audio.paused) { audio.pause(); setStatus('paused'); return; }
    setStatus('buffering');
    try { await audio.play(); }
    catch { setStatus('error'); }
  };

  const toggleMuted = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  const statusLabel = ({
    loading: 'Loading song…',
    ready: 'Tap Play to listen',
    buffering: 'Loading audio…',
    playing: 'Now playing',
    paused: 'Paused',
    error: 'Unable to play · try again',
  } as const)[status];

  return <section className="mt-5 rounded-2xl border border-[#D6E0EF] bg-white px-3 py-3 shadow-sm sm:px-4"
    aria-label={`${profileName}'s profile song`} style={{ color: '#132947', backgroundColor: '#FFFFFF' }}>
    <div className="flex min-w-0 items-center gap-3">
      {track?.artworkUrl
        ? <img src={track.artworkUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
        : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#E8EFF8] text-[#225F9C]"><FaMusic /></span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#132947]">{track?.title || 'Profile song'}</p>
        <p className="truncate text-xs text-[#566986]">{track?.artist || (status === 'error' ? 'Audius music unavailable' : 'Audius')}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-[#4774A5]" role="status">{statusLabel}</p>
      </div>
      <button type="button" onClick={() => void togglePlayback()} disabled={!track}
        aria-label={status === 'playing' ? 'Pause profile song' : 'Play profile song'}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#2677E6] text-white transition hover:brightness-110 disabled:opacity-40">
        {status === 'playing' ? <FaPause /> : <FaPlay />}
      </button>
      <button type="button" onClick={toggleMuted} disabled={!track}
        aria-label={muted ? 'Unmute profile song' : 'Mute profile song'} aria-pressed={muted}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#D6E0EF] text-[#132947] disabled:opacity-40">
        {muted ? <FaVolumeXmark /> : <FaVolumeHigh />}
      </button>
    </div>
    {track && <div className="mt-2 flex items-center justify-between gap-3">
      <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-[#E7EDF6]" aria-label="Song playback progress">
        <div className="h-full rounded-full bg-[#2677E6]" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
      <a href={track.permalink} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[11px] font-semibold text-[#225F9C] underline">Audius ↗</a>
    </div>}
    {track && <audio key={track.id} ref={audioRef} src={audiusStreamUrl(track.id)} preload="none"
      onPlaying={() => setStatus('playing')}
      onWaiting={() => setStatus('buffering')}
      onPause={() => setStatus(previous => previous === 'error' ? previous : 'paused')}
      onEnded={() => { setStatus('ready'); setProgress(0); }}
      onError={() => setStatus('error')}
      onTimeUpdate={event => {
        const audio = event.currentTarget;
        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : track.duration;
        setProgress(duration > 0 ? audio.currentTime / duration * 100 : 0);
      }}
    />}
  </section>;
}
