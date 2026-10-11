'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FaArrowUpRightFromSquare, FaCircleInfo, FaVideo } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import {
  parseRchTvLiveEmbed,
  RCH_TV_LIVE_SETTINGS_KEY,
  readRchTvLiveConfig,
  type RchTvLiveProvider,
} from '@/lib/rch-tv-live';

export function RchTvLiveSettings() {
  const { user, profile, loading: authLoading } = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const db = client as any;
  const authorized = Boolean(user && profile?.role === 'admin');
  const [provider, setProvider] = useState<RchTvLiveProvider>('youtube');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('RCH TV Live');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!authorized || !db) { setLoading(false); return; }
    let mounted = true;
    void db.from('site_settings').select('value')
      .eq('key', RCH_TV_LIVE_SETTINGS_KEY).maybeSingle()
      .then(({ data, error: loadError }: {data:{value:unknown}|null;error:{message:string}|null}) => {
        if (!mounted) return;
        if (loadError) setError(loadError.message);
        const existing = readRchTvLiveConfig(data?.value);
        if (existing) {
          setProvider(existing.provider);
          setUrl(existing.url);
          setTitle(existing.title);
          setEnabled(existing.enabled);
        }
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [authorized, authLoading, db]);

  const embedded = parseRchTvLiveEmbed(provider, url);
  const hasValidURL = Boolean(embedded);
  const canSave = !saving && Boolean(client && authorized) && (!enabled || hasValidURL);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !authorized || !canSave) return;
    const valid = parseRchTvLiveEmbed(provider, url);
    // Offline can be saved without a URL, but never save unsafe URLs.
    if (url.trim() && !valid) { setError('Enter a supported public YouTube Live link or Restream embed-player URL.'); return; }
    setSaving(true); setError(''); setNotice('');
    const config = { provider, url: url.trim(), title: title.trim().slice(0,120) || 'RCH TV Live', enabled: enabled && Boolean(valid) };
    const result = await db.from('site_settings').upsert(
      { key: RCH_TV_LIVE_SETTINGS_KEY, value: config }, { onConflict: 'key' },
    );
    if (result.error) setError(result.error.message);
    else setNotice(config.enabled
      ? 'RCH TV player source saved. The public player refreshes within about a minute; start the broadcast in Restream to verify picture and sound.'
      : 'RCH TV live player is offline. Source details are saved for later.');
    setSaving(false);
  }

  if (authLoading || !authorized) return null;

  return <section id="rch-tv-broadcast" aria-labelledby="rch-tv-broadcast-title" className="mt-8 rounded-2xl border border-white/15 bg-white/[.025] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-rcl-blue">Broadcast operations</p>
        <h2 id="rch-tv-broadcast-title" className="mt-2 text-xl font-bold">Connect Restream to RCH TV</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Produce games in Restream and send them to YouTube. Use the public YouTube Live video link
          here to show your broadcast on RCH TV for free. The direct Restream website player is an
          optional paid alternative.
        </p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-rcl-blue/25 px-3 py-2 text-xs font-semibold text-rcl-blue">
        <FaVideo aria-hidden="true"/> Stream source
      </span>
    </div>
    {loading ? <p role="status" className="mt-5 text-sm text-white/60">Loading broadcast settings…</p> : <form onSubmit={save} className="mt-6 grid gap-4">
      <label className="block text-xs font-bold text-white/75">Viewing destination
        <select value={provider} onChange={e=>{setProvider(e.target.value as RchTvLiveProvider);setUrl('');setNotice('');}} className="mt-2 block w-full rounded-lg border border-white/25 bg-[#0b1724] px-4 py-3 text-sm text-white">
          <option value="youtube">Restream → YouTube Live (recommended)</option>
          <option value="restream">Restream website embed player (Business / Enterprise)</option>
        </select>
      </label>
      <label className="block text-xs font-bold text-white/75">Public {provider === 'youtube' ? 'YouTube Live video URL' : 'Restream embed player URL'}
        <input type="url" value={url} onChange={e=>{setUrl(e.target.value);setNotice('');}}
          placeholder={provider === 'youtube' ? 'https://www.youtube.com/live/VIDEO_ID' : 'https://player.restream.io/...'}
          autoComplete="off" inputMode="url"
          className="mt-2 block w-full rounded-lg border border-white/25 bg-[#0b1724] px-4 py-3 text-sm text-white" />
      </label>
      {provider === 'youtube'
        ? <p className="text-xs leading-5 text-white/55"><FaCircleInfo className="mr-1 inline" aria-hidden="true"/>Connect RCH's YouTube channel in Restream first. Paste the specific broadcast's public YouTube video link, not the channel homepage or an RTMP key.</p>
        : <p className="text-xs leading-5 text-white/55"><FaCircleInfo className="mr-1 inline" aria-hidden="true"/>Restream's native website player requires Business or Enterprise. Copy the public iframe <code>src</code> URL, not its full HTML embed code and never a stream key.</p>}
      {url.trim() && !hasValidURL && <p role="alert" className="text-xs text-amber-200">This URL is not a supported public live-player link. Only YouTube video pages and Restream's player.restream.io embeds are accepted.</p>}
      {embedded && <p className="break-all text-xs text-rcl-blue">Viewer embed preview: {embedded}</p>}
      <label className="block text-xs font-bold text-white/75">Broadcast title
        <input type="text" maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}
          className="mt-2 block w-full rounded-lg border border-white/25 bg-[#0b1724] px-4 py-3 text-sm text-white"/>
      </label>
      <label className="flex items-start gap-3 text-sm text-white/80">
        <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} className="mt-1"/>
        <span><strong>Enable the public player</strong><span className="mt-1 block text-xs leading-5 text-white/55">Only switch this on when the broadcast is scheduled or ready. This does not start a stream in Restream.</span></span>
      </label>
      {error && <p role="alert" className="rounded-lg border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-300/25 bg-green-300/10 p-3 text-sm text-green-200">{notice}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!canSave} className="min-h-11 rounded-lg bg-rcl-blue px-5 text-sm font-bold text-black disabled:opacity-40">
          {saving ? 'Saving…' : enabled ? 'Save & show player' : 'Save offline settings'}
        </button>
        <a href="https://restream.io/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white/80">
          Open Restream <FaArrowUpRightFromSquare aria-hidden="true"/>
        </a>
        <Link href="/media" className="text-sm font-semibold text-rcl-blue">View RCH TV</Link>
      </div>
      <p className="text-xs text-white/45">Only public player links are stored. Keep Restream login credentials, RTMP URLs, and stream keys private in your broadcasting software.</p>
    </form>}
  </section>;
}
