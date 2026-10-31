'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { cloudflareVideoUid, RCH_TV_ADAPTIVE_PREFIX, resolveRchAdaptiveEmbed } from '@/lib/rch-tv-adaptive';

type Channel = 'live_games'|'the_pulse'|'movies'|'original_content';
const channels: {value:Channel;label:string}[] = [
  {value:'live_games',label:'Games and replays'},
  {value:'the_pulse',label:'The Pulse'},
  {value:'movies',label:'Licensed films'},
  {value:'original_content',label:'Original content'},
];
const field = 'mt-2 block min-h-11 w-full rounded-lg border border-white/20 bg-[#0b1724] px-3 py-2 text-sm text-white';

export function RchTvAdaptiveDraftForm({ onAdded }: { onAdded: () => Promise<void> }) {
  const { user, profile } = useAuth();
  const [uid, setUid] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [channel,setChannel] = useState<Channel>('live_games');
  const [rights, setRights] = useState(false);
  const [verified, setVerified] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const customer = process.env.NEXT_PUBLIC_RCH_TV_CF_CUSTOMER_CODE;
  const videoUid = cloudflareVideoUid(uid);
  const preview = videoUid ? resolveRchAdaptiveEmbed(RCH_TV_ADAPTIVE_PREFIX + videoUid,customer) : null;
  const configured = !!customer && !!resolveRchAdaptiveEmbed(RCH_TV_ADAPTIVE_PREFIX + 'a'.repeat(32),customer);

  async function submit(e:FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (profile?.role !== 'admin' || !user || !preview || !videoUid || !rights || !verified || !title.trim()) {
      setError('Complete the video ID, review the preview, and confirm rights before saving a draft.');
      return;
    }
    setBusy(true);setError('');setNotice('');
    const db = getSupabaseClient() as any;
    if (!db) {setBusy(false);setError('Media database unavailable.');return;}
    const { error: insertError } = await db.from('media').insert({
      uploader_id:user.id, title:title.trim().slice(0,180),
      description:description.trim().slice(0,2000)||null,
      storage_path:RCH_TV_ADAPTIVE_PREFIX+videoUid,
      thumbnail_path:null, media_type:'video',rch_tv_category:channel,status:'draft',
    });
    setBusy(false);
    if (insertError) {setError('Unable to save draft: ' + insertError.message);return;}
    setNotice('Hosted stream saved as a draft. Preview, verify rights and upload a poster before publishing.');
    setUid('');setTitle('');setDescription('');setRights(false);setVerified(false);
    await onAdded();
  }
  return <section className="mt-6 rounded-2xl border border-rcl-blue/20 bg-white/[.025] p-5">
    <p className="text-[10px] font-black uppercase tracking-widest text-rcl-blue">Optional adaptive playback</p>
    <h2 className="mt-2 text-xl font-bold">Import Cloudflare Stream video</h2>
    <p className="mt-2 text-xs leading-6 text-white/60">This does not purchase or upload a new video. After RCH has encoded a title in its own Cloudflare Stream account, an admin can reference that title here for review. Only drafts are created.</p>
    {!configured ? <p role="status" className="mt-4 rounded-lg border border-amber-400/20 p-3 text-xs text-amber-200">Adaptive video is not connected. No chargeable Stream integration is active. Configure the approved customer code before importing.</p>
    : <form className="mt-4 space-y-4" onSubmit={e=>void submit(e)}>
      <label className="block text-xs font-bold text-white/75">Cloudflare video UID (32 hexadecimal characters)
        <input className={field} value={uid} maxLength={32} onChange={e=>{setUid(e.target.value);setVerified(false);}} required autoComplete="off"/>
      </label>
      {preview&&<div>
        <p className="mb-2 text-xs font-semibold text-white/65">Check the exact recording before importing</p>
        <iframe src={preview} title="Hosted RCH TV draft preview" loading="lazy" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowFullScreen className="aspect-video w-full rounded-lg border border-white/15 bg-black"/>
      </div>}
      <label className="block text-xs font-bold text-white/75">Title
        <input className={field} value={title} maxLength={180} required onChange={e=>setTitle(e.target.value)}/>
      </label>
      <label className="block text-xs font-bold text-white/75">Description
        <textarea className={field} value={description} maxLength={2000} rows={2} onChange={e=>setDescription(e.target.value)}/>
      </label>
      <label className="block text-xs font-bold text-white/75">Channel
        <select className={field} value={channel} onChange={e=>setChannel(e.target.value as Channel)}>
          {channels.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="flex items-start gap-2 text-xs leading-5 text-white/70"><input className="mt-1" type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)} required/><span>I verified the hosted video belongs to RCH and its picture and sound actually play on the preview.</span></label>
      <label className="flex items-start gap-2 text-xs leading-5 text-white/70"><input className="mt-1" type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)} required/><span>I have reviewed distribution permissions, music and participant/venue releases. A separate approval is required to publish.</span></label>
      {error&&<p role="alert" className="text-xs text-amber-200">{error}</p>}
      {notice&&<p role="status" className="text-xs text-emerald-200">{notice}</p>}
      <button type="submit" disabled={busy||!preview} className="min-h-11 rounded-lg bg-rcl-blue px-4 text-xs font-black text-black disabled:opacity-50">{busy?'Saving…':'Save hosted video as draft'}</button>
    </form>}
  </section>;
}
