'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBullhorn, FaImage, FaNewspaper, FaShieldHalved, FaSpinner } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Team = { id:string; name:string; slug:string; logo_url:string|null };
type Tab = 'announcement' | 'media' | 'news';

function slugify(value:string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'team-story';
}

export default function TeamPublishingPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState('');
  const [tab, setTab] = useState<Tab>('announcement');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [announcement, setAnnouncement] = useState({ title:'', body:'', is_pinned:false });
  const [story, setStory] = useState({ title:'', excerpt:'', body:'', cover_image_url:'' });
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaDescription, setMediaDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const role = profile?.role;
  const authorized = role === 'coach' || role === 'staff' || role === 'admin';
  const selectedTeam = teams.find(team => team.id === teamId) ?? null;

  useEffect(() => {
    let active = true;
    async function loadTeams() {
      if (!supabase || !user || !authorized) return;
      let rows: Team[] = [];
      if (role === 'admin' || role === 'staff') {
        const result = await supabase.from('teams').select('id,name,slug,logo_url').eq('is_active', true).order('name');
        rows = (result.data ?? []) as Team[];
      } else {
        const coachResult = await supabase.from('team_coaches').select('team_id').eq('profile_id', user.id);
        const ids = [...new Set((coachResult.data ?? []).map(row => row.team_id))];
        if (ids.length) {
          const teamResult = await supabase.from('teams').select('id,name,slug,logo_url').in('id', ids).eq('is_active', true).order('name');
          rows = (teamResult.data ?? []) as Team[];
        }
      }
      if (!active) return;
      setTeams(rows);
      setTeamId(current => current || rows[0]?.id || '');
    }
    void loadTeams();
    return () => { active = false; };
  }, [authorized, role, supabase, user]);

  async function publishAnnouncement(event:React.FormEvent) {
    event.preventDefault();
    if (!user || !teamId || !announcement.title.trim() || !announcement.body.trim()) return;
    setBusy(true); setStatus('');
    const { error } = await db.from('team_announcements').insert({ team_id:teamId, author_id:user.id, title:announcement.title.trim(), body:announcement.body.trim(), is_pinned:announcement.is_pinned });
    if (error) setStatus(error.message);
    else { setAnnouncement({ title:'', body:'', is_pinned:false }); setStatus('Announcement published to the team site.'); }
    setBusy(false);
  }

  async function publishStory(event:React.FormEvent) {
    event.preventDefault();
    if (!user || !teamId || !story.title.trim() || !story.body.trim()) return;
    setBusy(true); setStatus('');
    const slug = `${slugify(story.title)}-${Date.now().toString(36)}`;
    const { error } = await db.from('news').insert({ team_id:teamId, author_id:user.id, title:story.title.trim(), slug, excerpt:story.excerpt.trim() || null, body:story.body.trim(), cover_image_url:story.cover_image_url.trim() || null, status:'published', published_at:new Date().toISOString() });
    if (error) setStatus(error.message);
    else { setStory({ title:'', excerpt:'', body:'', cover_image_url:'' }); setStatus('Team news story published.'); }
    setBusy(false);
  }

  async function uploadMedia(event:React.FormEvent) {
    event.preventDefault();
    if (!supabase || !user || !teamId || !file || !mediaTitle.trim()) return;
    setBusy(true); setStatus('');
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error('Game-day uploads must be 12 MB or smaller.');
      const ext = file.name.split('.').pop()?.toLowerCase() || (file.type.startsWith('video/') ? 'mp4' : 'jpg');
      const path = `${user.id}/teams/${teamId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const upload = await supabase.storage.from('media').upload(path, file, { upsert:false, contentType:file.type || undefined, cacheControl:'3600' });
      if (upload.error) throw upload.error;
      const insert = await db.from('media').insert({ team_id:teamId, uploader_id:user.id, title:mediaTitle.trim(), description:mediaDescription.trim() || null, storage_path:path, media_type:file.type.startsWith('video/') ? 'video' : 'image', status:'published' });
      if (insert.error) throw insert.error;
      setFile(null); setMediaTitle(''); setMediaDescription(''); setStatus('Game-day media uploaded to the team site.');
    } catch (uploadError) {
      setStatus(uploadError instanceof Error ? uploadError.message : 'Unable to upload team media.');
    } finally { setBusy(false); }
  }

  if (authLoading) return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-20"><div className="h-72 animate-pulse rounded-3xl bg-white/5"/></Container></main>;
  if (!authorized) return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-20 text-center"><FaShieldHalved className="mx-auto text-4xl text-rcl-orange"/><h1 className="mt-5 font-display text-4xl font-black uppercase">Team operator access required</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">Team publishing is available to verified coaches, staff and administrators.</p><Link href="/league" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-5 py-3 text-xs font-black uppercase text-black">Return to League Center <FaArrowRight/></Link></Container></main>;

  return <main className="min-h-screen bg-[#03070d] pb-28 text-white">
    <ClientPageHero eyebrow="Coach + Admin Workspace" title="Team Site" accent="Publish the story of your team" description="Post announcements, game-day media and news directly into the team experience without leaving the RCL platform." assetKey="league.cover" />
    <Container maxWidth="xl" className="py-8 sm:py-12">
      <div className="grid gap-7 lg:grid-cols-[.75fr_1.25fr]">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/75 p-5">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">Publishing team</p>
            <select value={teamId} onChange={event => setTeamId(event.target.value)} className="mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm font-bold outline-none focus:border-rcl-blue/45">
              {teams.length ? teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>) : <option value="">No assigned teams</option>}
            </select>
            {selectedTeam && <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">{selectedTeam.logo_url ? <img src={selectedTeam.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover"/> : <span className="grid h-12 w-12 place-items-center rounded-xl bg-rcl-blue/10 font-black text-rcl-blue">RCL</span>}<div><b className="block font-display uppercase">{selectedTeam.name}</b><Link href={`/teams/${selectedTeam.slug}`} className="mt-1 inline-flex items-center gap-1 text-xs font-black uppercase text-rcl-orange">View team site <FaArrowRight/></Link></div></div>}
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">How it works</p>
            <p className="mt-3 text-sm leading-6 text-white/42">Announcements are quick team updates. Media is for game-day photos and clips. News stories are longer editorial posts that also become part of the RCL content system.</p>
          </div>
        </aside>

        <section className="rounded-3xl border border-white/10 bg-[#071522]/55 p-5 sm:p-7">
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
            <button type="button" onClick={() => setTab('announcement')} className={`min-h-12 rounded-xl text-xs font-black uppercase ${tab === 'announcement' ? 'bg-rcl-orange text-black' : 'text-white/45 hover:text-white'}`}><FaBullhorn className="mx-auto mb-1"/>Announcement</button>
            <button type="button" onClick={() => setTab('media')} className={`min-h-12 rounded-xl text-xs font-black uppercase ${tab === 'media' ? 'bg-rcl-orange text-black' : 'text-white/45 hover:text-white'}`}><FaImage className="mx-auto mb-1"/>Media</button>
            <button type="button" onClick={() => setTab('news')} className={`min-h-12 rounded-xl text-xs font-black uppercase ${tab === 'news' ? 'bg-rcl-orange text-black' : 'text-white/45 hover:text-white'}`}><FaNewspaper className="mx-auto mb-1"/>News</button>
          </div>

          {status && <div role="status" className="mt-5 rounded-2xl border border-rcl-blue/20 bg-rcl-blue/5 p-4 text-sm text-white/70">{status}</div>}

          {tab === 'announcement' && <form onSubmit={publishAnnouncement} className="mt-6 space-y-4">
            <div><label className="text-xs font-black uppercase tracking-wider text-white/40">Headline</label><input value={announcement.title} onChange={event => setAnnouncement(current => ({...current,title:event.target.value}))} maxLength={140} required className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 outline-none focus:border-rcl-orange/50" placeholder="Practice moved to 7:30 PM"/></div>
            <div><label className="text-xs font-black uppercase tracking-wider text-white/40">Announcement</label><textarea value={announcement.body} onChange={event => setAnnouncement(current => ({...current,body:event.target.value}))} required rows={7} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 p-4 outline-none focus:border-rcl-orange/50" placeholder="Share the update with your team and followers..."/></div>
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/55"><input type="checkbox" checked={announcement.is_pinned} onChange={event => setAnnouncement(current => ({...current,is_pinned:event.target.checked}))}/> Pin this announcement to the top of the team site</label>
            <button disabled={busy || !teamId} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase text-black disabled:opacity-40">{busy && <FaSpinner className="animate-spin"/>} Publish announcement</button>
          </form>}

          {tab === 'media' && <form onSubmit={uploadMedia} className="mt-6 space-y-4">
            <div><label className="text-xs font-black uppercase tracking-wider text-white/40">Title</label><input value={mediaTitle} onChange={event => setMediaTitle(event.target.value)} required className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 outline-none focus:border-rcl-orange/50" placeholder="Game Day vs. River City"/></div>
            <div><label className="text-xs font-black uppercase tracking-wider text-white/40">Description</label><textarea value={mediaDescription} onChange={event => setMediaDescription(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 p-4 outline-none focus:border-rcl-orange/50" placeholder="Optional caption or context..."/></div>
            <label className="block rounded-2xl border border-dashed border-rcl-blue/30 bg-rcl-blue/5 p-7 text-center"><FaImage className="mx-auto text-3xl text-rcl-blue"/><span className="mt-3 block text-sm font-black uppercase">Choose game-day photo or video</span><span className="mt-1 block text-xs text-white/30">Up to 12 MB</span><input type="file" accept="image/*,video/*" onChange={event => setFile(event.target.files?.[0] ?? null)} className="mx-auto mt-4 block max-w-full text-xs"/></label>
            <button disabled={busy || !teamId || !file} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase text-black disabled:opacity-40">{busy && <FaSpinner className="animate-spin"/>} Upload media</button>
          </form>}

          {tab === 'news' && <form onSubmit={publishStory} className="mt-6 space-y-4">
            <div><label className="text-xs font-black uppercase tracking-wider text-white/40">Story title</label><input value={story.title} onChange={event => setStory(current => ({...current,title:event.target.value}))} required className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 outline-none focus:border-rcl-orange/50" placeholder="Team announces opening-night roster"/></div>
            <div><label className="text-xs font-black uppercase tracking-wider text-white/40">Short excerpt</label><textarea value={story.excerpt} onChange={event => setStory(current => ({...current,excerpt:event.target.value}))} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 p-4 outline-none focus:border-rcl-orange/50"/></div>
            <div><label className="text-xs font-black uppercase tracking-wider text-white/40">Cover image URL</label><input value={story.cover_image_url} onChange={event => setStory(current => ({...current,cover_image_url:event.target.value}))} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 outline-none focus:border-rcl-orange/50" placeholder="https://..."/></div>
            <div><label className="text-xs font-black uppercase tracking-wider text-white/40">Story</label><textarea value={story.body} onChange={event => setStory(current => ({...current,body:event.target.value}))} required rows={10} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 p-4 outline-none focus:border-rcl-orange/50"/></div>
            <button disabled={busy || !teamId} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase text-black disabled:opacity-40">{busy && <FaSpinner className="animate-spin"/>} Publish story</button>
          </form>}
        </section>
      </div>
    </Container>
  </main>;
}
