'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { FaArrowRight, FaCircleCheck, FaFilm, FaRotate, FaUpload, FaUsers, FaVideo } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import type { IconType } from 'react-icons';
import { getSupabaseClient } from '@/lib/supabase';

type MediaRecord = {
  id: string; title: string; media_type: string; status: string; rch_tv_category: string;
  storage_path: string; description: string | null; created_at: string;
};
type CreatorApplication = {
  id: string; organization_name: string; contact_name: string;
  contact_email: string; city: string | null; region: string; website_url: string | null;
  instagram_url: string | null; goals: string | null; status: string; created_at: string;
};
type Acquisition = { id: string; status: string };
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = ['video/mp4','video/webm','image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/wav'];
const CREATOR_STAGES = ['new','in_review','contacted','selected','declined'] as const;
const TV_CATEGORIES = [
  { value:'live_games', label:'Live Games & Replays' },
  { value:'the_pulse', label:'The Pulse — TV Show / Podcast' },
  { value:'movies', label:'Movies' },
  { value:'original_content', label:'Original Content' },
] as const;
const TV_CATEGORY_OPTIONS = [{ value:'general', label:'Uncategorized — not shown on RCH TV' },...TV_CATEGORIES];

export default function RchTvAdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const authorized = Boolean(user && profile?.role === 'admin');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [publishNow, setPublishNow] = useState(false);
  const [category, setCategory] = useState<(typeof TV_CATEGORIES)[number]['value']>('original_content');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  const load = useCallback(async () => {
    if (!authorized || !db) return;
    setLoading(true); setError('');
    const [m,a,c] = await Promise.all([
      db.from('media').select('id,title,media_type,status,storage_path,description,created_at,rch_tv_category')
        .order('created_at',{ascending:false}).limit(60),
      db.from('network_partner_inquiries')
        .select('id,organization_name,contact_name,contact_email,city,region,website_url,instagram_url,goals,status,created_at')
        .eq('organization_type','creator').order('created_at',{ascending:false}).limit(80),
      db.from('rch_tv_acquisitions').select('id,status').limit(500),
    ]);
    if (m.error || a.error || c.error) {
      setError(m.error?.message || a.error?.message || c.error?.message || 'Could not load RCH TV records.');
    } else {
      setMedia((m.data || []) as MediaRecord[]);
      setApplications((a.data || []) as CreatorApplication[]);
      setAcquisitions((c.data || []) as Acquisition[]);
    }
    setLoading(false);
  }, [db, authorized]);

  useEffect(() => {
    if (!authLoading) { if (authorized) void load(); else setLoading(false); }
  }, [authLoading, authorized, load]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !db || !user) return;
    if (!file || !title.trim()) return setError('Provide a title and choose a media file.');
    if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES || file.size < 1) {
      return setError('Use an MP4, WebM, JPEG, PNG, WebP, MP3, M4A or WAV file up to 50 MB.');
    }
    if (!rightsConfirmed) return setError('Confirm that you have permission to distribute this content before publishing or uploading.');
    setBusy('upload'); setError(''); setNotice('');
    const safeExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g,'') || 'bin';
    const path = `${user.id}/rch-tv/${crypto.randomUUID()}.${safeExt}`;
    const stored = await supabase.storage.from('media').upload(path,file,{
      upsert:false, contentType:file.type, cacheControl:'3600',
    });
    if (stored.error) { setError(stored.error.message); setBusy(''); return; }
    const mediaType = file.type.startsWith('video/') ? 'video'
      : file.type.startsWith('audio/') ? 'audio' : 'image';
    const inserted = await db.from('media').insert({
      uploader_id:user.id,title:title.trim(),description:description.trim()||null,
      storage_path:stored.data?.path || path,media_type:mediaType,rch_tv_category:category,
      status:publishNow ? 'published' : 'draft',
    });
    if (inserted.error) {
      // The owner/admin can clean up the otherwise orphaned upload.
      await supabase.storage.from('media').remove([stored.data?.path || path]);
      setError(inserted.error.message);
    } else {
      setNotice(publishNow ? 'Media published to RCH TV. Allow up to 60 seconds for the public archive to refresh.' : 'Media uploaded as a draft. Publish it from the library below.');
      setFile(null); setTitle(''); setDescription(''); setPublishNow(false); setRightsConfirmed(false); setCategory('original_content');
      await load();
    }
    setBusy('');
  }

  async function changeMediaStatus(id: string, status: 'published'|'draft'|'archived') {
    if (!db) return;
    setBusy(id);setError('');setNotice('');
    const r = await db.from('media').update({status}).eq('id',id);
    if (r.error) setError(r.error.message);
    else { setNotice(`Media ${status}.`); await load(); }
    setBusy('');
  }

  async function changeCategory(id: string, category: string) {
    if (!db || !TV_CATEGORY_OPTIONS.some(item=>item.value===category)) return;
    setBusy(id); setError(''); setNotice('');
    const result = await db.from('media').update({rch_tv_category:category}).eq('id',id);
    if (result.error) setError(result.error.message);
    else { setNotice('Editorial category updated. Only published items appear on the corresponding RCH TV section.'); await load(); }
    setBusy('');
  }

  async function updateCreator(id: string, status: typeof CREATOR_STAGES[number]) {
    if (!db) return;
    setBusy(id);setError('');setNotice('');
    const r=await db.from('network_partner_inquiries').update({status}).eq('id',id).eq('organization_type','creator');
    if (r.error) setError(r.error.message);
    else { setNotice('Creator application status updated. This is an administrative review status, not automatic publishing access.'); await load(); }
    setBusy('');
  }

  const published = media.filter(item => item.status==='published').length;
  const pendingCreators = applications.filter(item => item.status==='new'||item.status==='in_review').length;
  const licensed = acquisitions.filter(item => item.status==='licensed'||item.status==='published').length;
  const stats: Array<{label:string;value:number;Icon:IconType}> = [
    {label:'Published media',value:published,Icon:FaVideo},
    {label:'Creator applications',value:applications.length,Icon:FaUsers},
    {label:'Pending creator reviews',value:pendingCreators,Icon:FaUsers},
    {label:'Licensed titles',value:licensed,Icon:FaFilm},
  ];
  if (authLoading || loading) return <main className="min-h-screen px-5 py-12 text-white"><p role="status" className="text-sm text-white/60">Loading RCH TV operations…</p></main>;
  if (!authorized) return <main className="min-h-screen px-5 py-12 text-white"><h1 className="text-2xl font-bold">Administrator access required</h1><Link href="/media" className="mt-5 inline-block text-rcl-blue">Back to RCH TV</Link></main>;

  return <main className="min-h-screen pb-24 text-white">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-rcl-blue">Media operations</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">RCH TV Studio</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">Organize Live Games, The Pulse, Movies and Original Content; prepare licensed media and review founding creators.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={()=>void load()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-bold"><FaRotate/>Refresh</button>
          <Link href="/media" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-rcl-blue px-4 text-sm font-bold text-black">View RCH TV <FaArrowRight/></Link>
        </div>
      </header>
      {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
      {notice&&<p role="status" className="mt-5 rounded-xl border border-green-300/25 bg-green-300/10 p-4 text-sm text-green-200">{notice}</p>}
      <section aria-label="RCH TV status" className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({label,value,Icon})=><div key={label} className="rounded-xl border border-white/15 bg-white/[.035] p-5"><Icon className="text-rcl-blue" aria-hidden="true"/><p className="mt-3 text-xs text-white/60">{label}</p><strong className="mt-1 block text-3xl tabular-nums">{value}</strong></div>)}
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-2xl border border-white/15 bg-white/[.025] p-5 sm:p-6">
          <h2 className="text-xl font-bold">Upload RCH TV media</h2>
          <p className="mt-2 text-xs text-white/55">Upload your own or properly licensed media. The public media bucket accepts files up to 50 MB; longer programs require a streaming provider.</p>
          <form onSubmit={upload} className="mt-5 space-y-4">
            <label className="block text-xs font-bold text-white/70">Title<input required value={title} maxLength={180} onChange={e=>setTitle(e.target.value)} className="mt-2 block w-full rounded-lg border border-white/25 bg-[#0b1724] px-4 py-3 text-sm text-white" placeholder="Show, interview or highlight title"/></label>
            <label className="block text-xs font-bold text-white/70">Description<textarea value={description} maxLength={2000} onChange={e=>setDescription(e.target.value)} rows={3} className="mt-2 block w-full rounded-lg border border-white/25 bg-[#0b1724] px-4 py-3 text-sm text-white" placeholder="Tell viewers what this piece is about."/></label>
            <label className="block text-xs font-bold text-white/70">Media file<input type="file" accept="video/mp4,video/webm,image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/wav" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 block w-full rounded-lg border border-white/25 bg-[#0b1724] p-3 text-sm text-white"/></label>
            <label className="block text-xs font-bold text-white/70">RCH TV section<select value={category} onChange={e=>setCategory(e.target.value as (typeof TV_CATEGORIES)[number]['value'])} className="mt-2 block w-full rounded-lg border border-white/25 bg-[#0b1724] px-4 py-3 text-sm text-white">{TV_CATEGORIES.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="flex items-start gap-3 text-sm text-white/75"><input type="checkbox" required checked={rightsConfirmed} onChange={e=>setRightsConfirmed(e.target.checked)}/><span>I own this production or have permission to distribute it on RCH TV, including its audio and footage.</span></label>
            <label className="flex items-center gap-3 text-sm text-white/75"><input type="checkbox" checked={publishNow} onChange={e=>setPublishNow(e.target.checked)}/>Publish immediately instead of saving as draft</label>
            <button disabled={busy==='upload'} type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-rcl-blue px-5 text-sm font-bold text-black disabled:opacity-50"><FaUpload/>{busy==='upload'?'Uploading…':publishNow?'Upload & publish':'Upload as draft'}</button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/[.025] p-5 sm:p-6">
          <h2 className="text-xl font-bold">RCH TV media library</h2>
          <p className="mt-2 text-xs text-white/55">Published files appear on the public RCH TV page. Drafts and archived uploads stay out of the public archive.</p>
          <div className="mt-5 max-h-[540px] space-y-3 overflow-y-auto">
            {!media.length&&<p className="rounded-xl border border-dashed border-white/20 p-5 text-sm text-white/60">No RCH TV media records yet. Upload your first licensed clip above.</p>}
            {media.map(item=><article key={item.id} className="rounded-xl border border-white/15 bg-black/15 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0"><p className="font-semibold">{item.title}</p><p className="mt-1 text-xs text-white/50">{item.media_type} · {item.status} · {TV_CATEGORY_OPTIONS.find(option=>option.value===item.rch_tv_category)?.label||'Uncategorized'} · {new Date(item.created_at).toLocaleDateString('en-US')}</p></div>
                <a target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-rcl-blue" href={supabase?.storage.from('media').getPublicUrl(item.storage_path).data.publicUrl}>Open file ↗</a>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2"><label htmlFor={`rch-tv-category-${item.id}`} className="text-xs text-white/60">Section</label><select id={`rch-tv-category-${item.id}`} disabled={busy===item.id} value={TV_CATEGORY_OPTIONS.some(option=>option.value===item.rch_tv_category)?item.rch_tv_category:'general'} onChange={e=>void changeCategory(item.id,e.target.value)} className="min-h-9 max-w-full rounded-lg border border-white/20 bg-[#0b1724] px-2 text-xs text-white">{TV_CATEGORY_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>
                {(['draft','published','archived'] as const).filter(status=>status!==item.status).map(status=><button key={status} type="button" disabled={busy===item.id} onClick={()=>void changeMediaStatus(item.id,status)} className="min-h-9 rounded-lg border border-white/20 px-3 text-xs font-semibold capitalize text-white/80 disabled:opacity-50">{status==='published'?'Publish':status==='draft'?'Unpublish':'Archive'}</button>)}
              </div>
            </article>)}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-white/15 bg-white/[.025] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Founding Creator applications</h2><p className="mt-2 text-xs text-white/55">Applicants submitted through the RCH TV creator form. Review and contact creators before assigning publishing opportunities.</p></div><Link href="/media/creators/apply" className="text-xs font-bold text-rcl-blue">Application page ↗</Link></div>
        {!applications.length&&<p className="mt-5 rounded-xl border border-dashed border-white/20 p-5 text-sm text-white/60">No creator applications received yet.</p>}
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {applications.map(item=><article key={item.id} className="min-w-0 rounded-xl border border-white/15 bg-black/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{item.organization_name}</h3><p className="mt-1 text-xs text-white/60">{item.contact_name} · {item.city||item.region}</p></div><span className="rounded-full border border-rcl-blue/25 px-3 py-1 text-xs font-bold text-rcl-blue">{item.status.replace(/_/g,' ')}</span></div>
            <a href={`mailto:${item.contact_email}`} className="mt-3 block break-all text-sm font-bold text-rcl-blue">{item.contact_email}</a>
            <p className="mt-2 text-xs text-white/55">{new Date(item.created_at).toLocaleString('en-US')}</p>
            {item.goals&&<p className="mt-3 max-h-36 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-white/70">{item.goals}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2"><label className="text-xs text-white/60" htmlFor={`creator-stage-${item.id}`}>Review status</label><select id={`creator-stage-${item.id}`} value={CREATOR_STAGES.includes(item.status as typeof CREATOR_STAGES[number])?item.status:'new'} onChange={e=>void updateCreator(item.id,e.target.value as typeof CREATOR_STAGES[number])} disabled={busy===item.id} className="min-h-10 rounded-lg border border-white/25 bg-[#0b1724] px-3 text-sm text-white">{CREATOR_STAGES.map(status=><option key={status} value={status}>{status.replace(/_/g,' ')}</option>)}</select>{item.website_url&&<a target="_blank" rel="noopener noreferrer" href={item.website_url} className="text-xs text-rcl-blue">Portfolio ↗</a>}{item.instagram_url&&<a target="_blank" rel="noopener noreferrer" href={item.instagram_url} className="text-xs text-rcl-blue">Instagram ↗</a>}</div>
          </article>)}
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Link href="/admin/rch-tv/acquisition" className="flex items-center gap-4 rounded-xl border border-white/15 bg-white/[.035] p-5"><FaFilm className="text-2xl text-rcl-blue"/><div><h2 className="font-bold">Rights acquisition pipeline</h2><p className="mt-1 text-xs text-white/55">Screen and license {acquisitions.length} tracked prospects before publication.</p></div><FaArrowRight className="ml-auto text-rcl-blue"/></Link>
        <Link href="/admin/basketball-os" className="flex items-center gap-4 rounded-xl border border-white/15 bg-white/[.035] p-5"><FaCircleCheck className="text-2xl text-rcl-blue"/><div><h2 className="font-bold">Highlight moderation</h2><p className="mt-1 text-xs text-white/55">Review and approve member-submitted basketball highlights.</p></div><FaArrowRight className="ml-auto text-rcl-blue"/></Link>
      </section>
    </div>
  </main>;
}
