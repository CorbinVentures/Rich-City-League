'use client';

import { useEffect, useRef, useState } from 'react';
import { FaCheck, FaHeadphones, FaMagnifyingGlass, FaMusic, FaPause, FaPlay, FaXmark } from 'react-icons/fa6';
import { audiusStreamUrl, profileTrackId, type MusicTrack } from '@/lib/profile-music';

export function ProfileMusicPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [selected, setSelected] = useState<MusicTrack | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const selectedId = profileTrackId(value);

  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    const controller = new AbortController();
    // The selected track is saved as an ID; resolve current artist/title from Audius.
    fetch(`/api/music/track?id=${encodeURIComponent(selectedId)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) return null;
        const body: { track?: MusicTrack } = await response.json();
        return body.track || null;
      })
      .then(track => { if (!controller.signal.aborted) setSelected(track); })
      .catch(() => { if (!controller.signal.aborted) setSelected(null); });
    return () => controller.abort();
  }, [selectedId]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]); setLoading(false); setSearched(false); setError('');
      return;
    }
    const controller = new AbortController();
    setLoading(true); setError(''); setSearched(false);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/music/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const body: { tracks?: MusicTrack[]; error?: string } = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to search music.');
        if (!controller.signal.aborted) {
          setResults(body.tracks || []); setSearched(true);
        }
      } catch (err) {
        if (!controller.signal.aborted) { setResults([]); setError(err instanceof Error ? err.message : 'Search failed.'); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  const stopPreview = () => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    setPreviewId(null); setPreviewPlaying(false); setPreviewError('');
  };

  const listen = async (track: MusicTrack) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (previewId === track.id && !audio.paused) {
      audio.pause(); setPreviewPlaying(false); return;
    }
    setPreviewId(track.id); setPreviewError(''); setPreviewPlaying(false);
    audio.pause();
    audio.src = audiusStreamUrl(track.id);
    try { await audio.play(); }
    catch { setPreviewError('Audio could not start. Try another track.'); }
  };

  const choose = (track: MusicTrack) => {
    stopPreview();
    setSelected(track);
    onChange(`audius:${track.id}`);
  };

  return <div className="mt-5">
    <label htmlFor="rch-song-search" className="block text-xs font-black uppercase tracking-wider text-white/75">
      Find a song or artist
    </label>
    <div className="relative mt-2">
      <FaMagnifyingGlass className="pointer-events-none absolute left-4 top-4 text-white/40" aria-hidden="true" />
      <input id="rch-song-search" value={query} onChange={event => setQuery(event.target.value)}
        maxLength={100} autoComplete="off" placeholder="Search songs or artists"
        className="h-12 w-full rounded-xl border border-white/25 bg-black/25 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/50 focus:border-rcl-blue" />
    </div>
    <p className="mt-2 text-xs leading-5 text-white/65">
      Browse full-length tracks artists make available on Audius. Not every commercial release is in this catalog.
      Visitors may need to tap Play on iPhone.
    </p>

    {selectedId && <div className="mt-4 rounded-xl border border-rcl-blue/40 bg-rcl-blue/10 p-3">
      <div className="flex items-center gap-3">
        {selected?.artworkUrl
          ? <img src={selected.artworkUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white/10 text-xl"><FaMusic /></span>}
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-xs font-bold text-[#9ED0FF]"><FaCheck /> Selected song</span>
          <p className="mt-1 truncate text-sm font-bold text-white">{selected?.title || 'Loading selection…'}</p>
          <p className="truncate text-xs text-white/75">{selected?.artist || 'Audius'}</p>
        </div>
        <button type="button" onClick={() => { stopPreview(); setSelected(null); onChange(''); }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/20 text-white"
          aria-label="Remove profile song"><FaXmark /></button>
      </div>
    </div>}
    {value && !selectedId && <p className="mt-4 rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-100">
      Your old YouTube link cannot play in the new music player. Search and choose a song below to replace it.
      <button type="button" onClick={() => onChange('')} className="ml-2 font-bold underline">Clear old link</button>
    </p>}

    {loading && <p role="status" className="mt-4 text-sm text-white/75">Searching music…</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}
    {searched && !loading && results.length === 0 && !error && <p className="mt-4 text-sm text-white/70">No playable songs found. Try another artist or title.</p>}
    {results.length > 0 && <div className="mt-4 max-h-96 space-y-2 overflow-y-auto" aria-label="Music search results">
      {results.map(track => <div key={track.id} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3">
        {track.artworkUrl
          ? <img src={track.artworkUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white/10"><FaHeadphones /></span>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{track.title}</p>
          <p className="truncate text-xs text-white/70">{track.artist}</p>
          <a href={track.permalink} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#9ED0FF] underline">On Audius</a>
        </div>
        <button type="button" onClick={() => void listen(track)} aria-label={previewId === track.id && previewPlaying ? `Pause ${track.title}` : `Listen to ${track.title}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/25 text-white">
          {previewId === track.id && previewPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <button type="button" onClick={() => choose(track)}
          className={`min-h-10 shrink-0 rounded-lg px-3 text-xs font-bold ${selectedId === track.id ? 'bg-green-200 text-green-950' : 'bg-rcl-blue text-white'}`}>
          {selectedId === track.id ? 'Selected' : 'Choose'}
        </button>
      </div>)}
    </div>}
    {previewError && <p role="alert" className="mt-2 text-xs text-red-200">{previewError}</p>}
    <audio ref={audioRef} preload="none" onPlaying={() => setPreviewPlaying(true)} onPause={() => setPreviewPlaying(false)}
      onEnded={() => { setPreviewPlaying(false); setPreviewId(null); }}
      onError={() => setPreviewError('This track is currently unavailable. Try another song.')} />
  </div>;
}
