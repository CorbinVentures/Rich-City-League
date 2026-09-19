'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminWorkspace } from '@/components/AdminWorkspace';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowLeft, FaBell, FaBullhorn, FaChartLine, FaCheck, FaCircleExclamation, FaComments, FaFileShield, FaGear, FaLayerGroup, FaNewspaper, FaPeopleGroup, FaRotate, FaShieldHalved, FaTrash, FaUsersGear } from 'react-icons/fa6';

const roles = ['player', 'coach', 'staff', 'admin'] as const;

export default function AdminControlCenterPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as import('@supabase/supabase-js').SupabaseClient<import('@/types/database').Database> | null;
  const isAdmin = profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [staffRecords, setStaffRecords] = useState<any[]>([]);
  const [commissioners, setCommissioners] = useState<any[]>([]);
  const [commissionerForm, setCommissionerForm] = useState({ league_id: '', profile_id: '', title: 'Commissioner' });
  const [stats, setStats] = useState({ users: 0, reports: 0, posts: 0, comments: 0, leagues: 0 });

  const load = useCallback(async () => {
    if (!db || !isAdmin) return;
    setBusy(true);
    const [usersResult, reportsResult, postsResult, commentsResult, settingsResult, newsResult, mediaResult, leaguesResult, assetsResult, staffResult, commissionerResult] = await Promise.all([
      db.from('profiles').select('*').order('created_at', { ascending: false }),
      db.from('reports').select('*').order('created_at', { ascending: false }),
      db.from('posts').select('*').order('created_at', { ascending: false }),
      db.from('comments').select('*').order('created_at', { ascending: false }),
      db.from('site_settings').select('*').order('key'),
      db.from('news').select('*').order('created_at', { ascending: false }),
      db.from('media').select('*').order('created_at', { ascending: false }),
      db.from('leagues').select('*').order('name'),
      db.from('content_assets').select('*').order('location').order('title'),
      db.from('staff').select('*, profile:profiles(id,display_name,first_name,last_name,role)').order('created_at', { ascending: false }),
      db.from('commissioners').select('*, league:leagues(id,name), profile:profiles(id,display_name,first_name,last_name,role)').order('created_at', { ascending: false }),
    ]);
    setUsers(usersResult.data ?? []);
    setReports(reportsResult.data ?? []);
    setPosts(postsResult.data ?? []);
    setComments(commentsResult.data ?? []);
    setSettings(settingsResult.data ?? []);
    setNews(newsResult.data ?? []);
    setMedia(mediaResult.data ?? []);
    setLeagues(leaguesResult.data ?? []);
    setAssets(assetsResult.data ?? []);
    setStaffRecords(staffResult.data ?? []);
    setCommissioners(commissionerResult.data ?? []);
    setStats({
      users: usersResult.data?.length ?? 0,
      reports: reportsResult.data?.filter((r: any) => r.status !== 'resolved' && r.status !== 'dismissed').length ?? 0,
      posts: postsResult.data?.length ?? 0,
      comments: commentsResult.data?.length ?? 0,
      leagues: leaguesResult.data?.length ?? 0,
    });
    setBusy(false);
  }, [supabase, isAdmin]);

  useEffect(() => { void load(); }, [load]);

  async function audit(action: string, details: string) {
    if (!db || !user) return;
    await db.from('audit_logs').insert({ user_id: user.id, action, details } as never);
  }

  async function updateRole(id: string, role: string) {
    if (!db || id === user?.id || !roles.includes(role as any)) return;
    const { error } = await db?.from('profiles').update({ role } as never).eq('id', id);
    if (error) setMessage(error.message);
    else {
      if (role === 'staff') {
        await db.from('staff').upsert({ profile_id: id, title: 'Staff', permissions: {} } as never, { onConflict: 'profile_id' });
      }
      await audit('ADMIN_UPDATE_ROLE', `Changed profile ${id} to ${role}`);
      setMessage('User role updated.');
      await load();
    }
  }

  async function saveStaffRecord(id: string, title: string, permissionsRaw: string) {
    if (!db) return;
    let permissions: unknown = {};
    try { permissions = JSON.parse(permissionsRaw || '{}'); } catch { setMessage('Staff permissions must be valid JSON.'); return; }
    const { error } = await db.from('staff').upsert({ id, profile_id: id, title: title || 'Staff', permissions } as never, { onConflict: 'profile_id' });
    if (error) setMessage(error.message);
    else { await audit('ADMIN_STAFF_PERMISSIONS', `Updated staff permissions for ${id}`); setMessage('Staff permissions saved.'); await load(); }
  }

  async function assignCommissioner(event: React.FormEvent) {
    event.preventDefault();
    if (!db || !commissionerForm.league_id || !commissionerForm.profile_id) return;
    const { error } = await db.from('commissioners').upsert({
      league_id: commissionerForm.league_id,
      profile_id: commissionerForm.profile_id,
      title: commissionerForm.title || 'Commissioner',
      permissions: {},
    } as never, { onConflict: 'league_id,profile_id' });
    if (error) setMessage(error.message);
    else { await audit('ADMIN_ASSIGN_COMMISSIONER', `Assigned ${commissionerForm.profile_id} to league ${commissionerForm.league_id}`); setMessage('Commissioner assignment saved.'); setCommissionerForm({ league_id: '', profile_id: '', title: 'Commissioner' }); await load(); }
  }

  async function removeCommissioner(id: string) {
    if (!db) return;
    const { error } = await db.from('commissioners').delete().eq('id', id);
    if (error) setMessage(error.message);
    else { await audit('ADMIN_REMOVE_COMMISSIONER', `Removed commissioner assignment ${id}`); await load(); }
  }

  async function updateProfileActive(id: string, active: boolean) {
    if (!db || id === user?.id) return;
    const { error } = await db?.from('profiles').update({ is_active: active } as never).eq('id', id);
    if (error) setMessage(error.message);
    else { await audit('ADMIN_ACCOUNT_STATUS', `${active ? 'Activated' : 'Deactivated'} profile ${id}`); setMessage('Account status updated.'); await load(); }
  }

  async function moderatePost(id: string, status: 'published' | 'draft' | 'archived') {
    if (!db) return;
    const { error } = await db?.from('posts').update({ status } as never).eq('id', id);
    if (!error) { await audit('ADMIN_POST_MODERATION', `Set post ${id} to ${status}`); await load(); }
  }

  async function moderateComment(id: string) {
    if (!db) return;
    const { error } = await db?.from('comments').delete().eq('id', id);
    if (!error) { await audit('ADMIN_COMMENT_DELETE', `Deleted comment ${id}`); await load(); }
  }

  async function updateReport(id: string, status: string) {
    if (!db) return;
    const { error } = await db?.from('reports').update({ status, reviewed_by: user?.id } as never).eq('id', id);
    if (!error) { await audit('ADMIN_REPORT_REVIEW', `Set report ${id} to ${status}`); await load(); }
  }

  async function toggleLeague(id: string, active: boolean) {
    if (!db) return;
    const { error } = await db?.from('leagues').update({ is_active: active } as never).eq('id', id);
    if (!error) { await audit('ADMIN_LEAGUE_STATUS', `${active ? 'Activated' : 'Deactivated'} league ${id}`); await load(); }
  }

  async function uploadSiteImage(asset: any, file: File) {
    if (!db || !user || !file.type.startsWith('image/')) { setMessage('Please choose an image file.'); return; }
    setBusy(true);
    setMessage(`Uploading ${asset.title}…`);
    try {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
      const path = `site/${asset.asset_key}/${Date.now()}-${safeName}`;

      const { data: uploaded, error: uploadError } = await db.storage
        .from('media')
        .upload(path, file, { upsert: false, contentType: file.type, cacheControl: '31536000' });
      if (uploadError || !uploaded?.path) {
        setMessage(`Upload failed for ${asset.title}: ${uploadError?.message ?? 'Storage did not return a file path.'}`);
        return;
      }

      const { data: publicUrl } = db.storage.from('media').getPublicUrl(uploaded.path);
      if (!publicUrl?.publicUrl) {
        setMessage(`Upload succeeded, but no public URL was returned for ${asset.title}.`);
        return;
      }

      const { data: updated, error: updateError } = await db
        .from('content_assets')
        .update({ image_url: publicUrl.publicUrl, storage_path: uploaded.path, updated_by: user.id } as never)
        .eq('id', asset.id)
        .select('id,asset_key,title,image_url,storage_path,is_active,updated_at')
        .single();

      if (updateError || !updated) {
        setMessage(`Storage upload succeeded, but CMS update failed for ${asset.title}: ${updateError?.message ?? 'No row was returned.'}`);
        return;
      }

      const { data: verified, error: verifyError } = await db
        .from('content_assets')
        .select('image_url,storage_path,updated_at')
        .eq('id', asset.id)
        .single() as { data: { image_url: string | null; storage_path: string | null; updated_at: string | null } | null; error: { message: string } | null };

      if (verifyError || verified?.storage_path !== uploaded.path || verified?.image_url !== publicUrl.publicUrl) {
        setMessage(`Image saved, but verification failed for ${asset.title}. Please refresh before replacing it again.`);
        return;
      }

      await audit('ADMIN_CONTENT_IMAGE_UPLOAD', `Updated site image ${asset.asset_key}`);
      setMessage(`${asset.title} is LIVE.`);
      await load();
    } catch (error) {
      setMessage(`Image update failed for ${asset.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  }
  async function updateAsset(asset: any, patch: Record<string, unknown>) {
    if (!db || !user) return;
    const { error } = await db?.from('content_assets').update({ ...patch, updated_by: user.id } as never).eq('id', asset.id);
    if (error) setMessage(error.message);
    else { await audit('ADMIN_CONTENT_ASSET_UPDATE', `Updated site asset ${asset.asset_key}`); await load(); }
  }

  async function deleteMedia(id: string) {
    if (!db) return;
    const item = media.find((m) => m.id === id);
    if (!item) return;
    if (!window.confirm(`Delete ${item.title || 'this media'}?`)) return;
    const { error } = await db?.from('media').delete().eq('id', id);
    if (error) setMessage(error.message);
    else { await audit('ADMIN_MEDIA_DELETE', `Deleted media ${id}`); await load(); }
  }

  async function publishNews(id: string, status: 'published' | 'draft' | 'archived') {
    if (!db) return;
    const { error } = await db?.from('news').update({ status } as never).eq('id', id);
    if (!error) { await audit('ADMIN_NEWS_STATUS', `Set news ${id} to ${status}`); await load(); }
  }

  async function updateSetting(key: string, raw: string) {
    if (!db) return;
    let value: unknown;
    try { value = JSON.parse(raw); } catch { setMessage(`Invalid JSON for ${key}.`); return; }
    const { error } = await db?.from('site_settings').update({ value } as never).eq('key', key);
    if (error) setMessage(error.message);
    else { await audit('ADMIN_SITE_SETTING', `Updated site setting ${key}`); setMessage(`Saved ${key}.`); await load(); }
  }

  async function broadcast() {
    if (!db || !user) return;
    const title = window.prompt('Announcement title:');
    const body = window.prompt('Announcement message:');
    if (!title || !body) return;
    const activeUsers = users.filter((u) => u.is_active !== false);
    const rows = activeUsers.map((u) => ({ recipient_id: u.id, actor_id: user.id, type: 'admin_announcement', title, body, link: '/dashboard' }));
    if (!rows.length) return;
    const { error } = await db?.from('notifications').insert(rows as never);
    if (error) setMessage(error.message);
    else { await audit('ADMIN_BROADCAST', `Broadcast announcement to ${rows.length} active users`); setMessage(`Announcement sent to ${rows.length} users.`); }
  }

  if (authLoading) return <main className="min-h-screen bg-rcl-black p-20 text-center text-white"><AdminWorkspace />Verifying administrator access…</main>;
  if (!isAdmin) return <main className="min-h-screen bg-rcl-black p-20 text-center text-white"><AdminWorkspace /><h1 className="font-display text-3xl uppercase">Admin access required</h1><Link href="/admin" className="mt-5 inline-block text-rcl-gold">Return to Command Center</Link></main>;

  const tabs = [
    ['overview', 'OVERVIEW', FaChartLine], ['users', 'USERS & ROLES', FaUsersGear], ['governance', 'GOVERNANCE', FaShieldHalved], ['moderation', 'MODERATION', FaComments], ['reports', 'REPORT CENTER', FaFileShield], ['league', 'LEAGUE CONTROL', FaLayerGroup], ['content', 'CONTENT', FaNewspaper], ['settings', 'SITE SETTINGS', FaGear],
  ] as const;

  return (<main className="min-h-screen bg-rcl-black pb-24 text-white font-display"><AdminWorkspace />
      <Container maxWidth="xl" className="py-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rcl-gold"><FaArrowLeft /> Command Center</Link>
        <div className="mt-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-rcl-orange">SYSTEM ADMINISTRATION</p><h1 className="mt-2 text-4xl font-black uppercase">RCL <span className="text-rcl-orange">CONTROL CENTER</span></h1><p className="mt-2 max-w-2xl text-sm text-gray-400">Full administrative control over users, league operations, community safety, publishing, notifications, and platform configuration.</p></div>
          <div className="flex gap-2"><button onClick={() => void load()} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest"><FaRotate className="inline mr-2" /> Refresh</button><button onClick={() => void broadcast()} className="rounded-xl bg-rcl-orange px-4 py-3 text-xs font-black uppercase tracking-widest text-black"><FaBullhorn className="inline mr-2" /> Broadcast</button></div>
        </div>
        {message && <div className="mt-5 rounded-xl border border-rcl-gold/20 bg-rcl-gold/5 p-3 text-xs text-rcl-gold">{message}</div>}

        <div className="mt-8 flex gap-2 overflow-x-auto border-b border-white/10 pb-3">{tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setActiveTab(id)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-[10px] font-black tracking-widest ${activeTab === id ? 'bg-rcl-orange text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Icon className="mr-2 inline" />{label}</button>)}</div>

        {busy ? <div className="mt-8 h-64 animate-pulse rounded-2xl bg-white/5" /> : <div className="mt-8">
          {activeTab === 'overview' && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[['USERS', stats.users], ['OPEN REPORTS', stats.reports], ['POSTS', stats.posts], ['COMMENTS', stats.comments], ['LEAGUES', stats.leagues]].map(([label, value]) => <div key={label as string} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"><span className="text-[10px] font-black tracking-widest text-gray-500">{label}</span><strong className="mt-2 block text-4xl">{value}</strong></div>)}</div>}

          {activeTab === 'users' && <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><h2 className="mb-5 text-sm font-black uppercase tracking-widest text-rcl-gold">Account & privilege management</h2><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-white/10 text-[9px] uppercase tracking-widest text-gray-500"><th className="pb-3">USER</th><th>EMAIL</th><th>ROLE</th><th>STATUS</th><th className="text-right">CONTROLS</th></tr></thead><tbody>{users.map((u) => <tr key={u.id} className="border-b border-white/5"><td className="py-4 font-bold">{u.display_name || `${u.first_name || ''} ${u.last_name || ''}` || 'RCL User'}</td><td className="text-gray-400">{u.email}</td><td><select disabled={u.id === user?.id} value={u.role || 'player'} onChange={(e) => void updateRole(u.id, e.target.value)} className="rounded-lg bg-black p-2"><option value="player">PLAYER</option><option value="coach">COACH</option><option value="staff">STAFF</option><option value="admin">ADMIN</option></select></td><td><span className={u.is_active === false ? 'text-rcl-red' : 'text-green-400'}>{u.is_active === false ? 'DISABLED' : 'ACTIVE'}</span></td><td className="text-right"><button disabled={u.id === user?.id} onClick={() => void updateProfileActive(u.id, u.is_active === false)} className="rounded-lg border border-white/10 px-3 py-2 text-[9px] font-black uppercase disabled:opacity-40">{u.is_active === false ? 'ACTIVATE' : 'DISABLE'}</button></td></tr>)}</tbody></table></div></section>}

          {activeTab === 'governance' && <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="mb-5 text-sm font-black uppercase tracking-widest text-rcl-gold">Staff permissions</h2>
              <div className="space-y-3">{staffRecords.map((s) => <div key={s.id} className="rounded-xl border border-white/5 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-bold">{s.profile?.display_name || [s.profile?.first_name, s.profile?.last_name].filter(Boolean).join(' ') || s.profile_id}</p><p className="text-[10px] text-gray-500">{s.title}</p></div><span className="text-[9px] font-black text-rcl-orange">{s.profile?.role}</span></div><div className="mt-3 flex gap-2"><input id={`staff-title-${s.id}`} defaultValue={s.title} className="min-w-0 flex-1 rounded border border-white/10 bg-black p-2 text-xs text-white" /><button onClick={() => { const title=(document.getElementById(`staff-title-${s.id}`) as HTMLInputElement)?.value || s.title; void saveStaffRecord(s.id,title,JSON.stringify(s.permissions || {})); }} className="rounded bg-rcl-orange px-3 py-2 text-[9px] font-black text-black">SAVE</button></div></div>)}</div>
              {!staffRecords.length && <p className="text-sm text-gray-500">No staff records yet. Promote a user to STAFF first.</p>}
            </section>
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="mb-5 text-sm font-black uppercase tracking-widest text-rcl-gold">Commissioner assignments</h2>
              <form onSubmit={assignCommissioner} className="grid gap-2 sm:grid-cols-3">
                <select required value={commissionerForm.league_id} onChange={(e) => setCommissionerForm({ ...commissionerForm, league_id:e.target.value })} className="rounded-lg bg-black p-2 text-xs text-white"><option value="">League</option>{leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                <select required value={commissionerForm.profile_id} onChange={(e) => setCommissionerForm({ ...commissionerForm, profile_id:e.target.value })} className="rounded-lg bg-black p-2 text-xs text-white"><option value="">User</option>{users.filter((u) => u.role === 'staff' || u.role === 'admin').map((u) => <option key={u.id} value={u.id}>{u.display_name || u.email || u.id}</option>)}</select>
                <button className="rounded-lg bg-rcl-orange px-3 py-2 text-[9px] font-black text-black">ASSIGN</button>
              </form>
              <div className="mt-5 space-y-2">{commissioners.map((c) => <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 p-3 text-xs"><span><b>{c.profile?.display_name || c.profile?.email || c.profile_id}</b><span className="ml-2 text-white/35">{c.league?.name || c.league_id} · {c.title}</span></span><button onClick={() => void removeCommissioner(c.id)} className="rounded bg-rcl-red/10 px-2 py-1 text-[9px] font-black text-rcl-red">REMOVE</button></div>)}</div>
            </section>
          </div>}

          {activeTab === 'moderation' && <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><h2 className="mb-5 text-sm font-black uppercase tracking-widest text-rcl-gold">Social posts</h2><div className="space-y-3">{posts.slice(0, 30).map((p) => <div key={p.id} className="rounded-xl border border-white/5 p-4"><p className="text-sm text-gray-200">{p.body}</p><div className="mt-3 flex gap-2"><button onClick={() => void moderatePost(p.id, 'published')} className="rounded bg-green-500/10 px-3 py-1.5 text-[9px] font-black text-green-400">PUBLISH</button><button onClick={() => void moderatePost(p.id, 'draft')} className="rounded bg-white/5 px-3 py-1.5 text-[9px] font-black">HIDE</button><button onClick={() => void moderatePost(p.id, 'archived')} className="rounded bg-rcl-red/10 px-3 py-1.5 text-[9px] font-black text-rcl-red">ARCHIVE</button></div></div>)}{!posts.length && <p className="text-sm text-gray-500">No posts.</p>}</div></section><section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><h2 className="mb-5 text-sm font-black uppercase tracking-widest text-rcl-gold">Comments</h2><div className="space-y-3">{comments.slice(0, 30).map((c) => <div key={c.id} className="flex items-start justify-between gap-4 rounded-xl border border-white/5 p-4"><p className="text-sm text-gray-200">{c.body}</p><button onClick={() => void moderateComment(c.id)} className="shrink-0 rounded bg-rcl-red/10 px-3 py-1.5 text-[9px] font-black text-rcl-red"><FaTrash className="inline mr-1" /> DELETE</button></div>)}{!comments.length && <p className="text-sm text-gray-500">No comments.</p>}</div></section></div>}

          {activeTab === 'reports' && <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><h2 className="mb-5 text-sm font-black uppercase tracking-widest text-rcl-gold">User & content reports</h2><div className="space-y-3">{reports.map((r) => <div key={r.id} className="rounded-xl border border-white/5 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase text-white">{r.reason || 'Report'}</p><p className="mt-1 text-xs text-gray-500">Status: {r.status || 'open'}</p></div><select value={r.status || 'open'} onChange={(e) => void updateReport(r.id, e.target.value)} className="rounded-lg bg-black p-2 text-xs"><option value="open">OPEN</option><option value="reviewing">REVIEWING</option><option value="resolved">RESOLVED</option><option value="dismissed">DISMISSED</option></select></div></div>)}{!reports.length && <p className="text-sm text-gray-500">No reports.</p>}</div></section>}

          {activeTab === 'league' && <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><h2 className="mb-5 text-sm font-black uppercase tracking-widest text-rcl-gold">League activation controls</h2><div className="grid gap-4 md:grid-cols-2">{leagues.map((l) => <div key={l.id} className="rounded-xl border border-white/5 p-4 flex items-center justify-between"><div><p className="font-black">{l.name}</p><p className="text-xs text-gray-500">{l.city}, {l.state}</p></div><button onClick={() => void toggleLeague(l.id, !l.is_active)} className={`rounded-lg px-4 py-2 text-[9px] font-black ${l.is_active ? 'bg-green-500/10 text-green-400' : 'bg-rcl-red/10 text-rcl-red'}`}>{l.is_active ? 'ACTIVE' : 'INACTIVE'}</button></div>)}</div></section>}

          {activeTab === 'content' && <div className="space-y-6">
            <section className="rounded-2xl border border-rcl-orange/20 bg-gradient-to-br from-rcl-orange/10 to-white/[0.02] p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-rcl-orange">ADMIN MASTER ACCESS</p><h2 className="mt-2 text-2xl font-black uppercase">Content Studio</h2><p className="mt-2 max-w-2xl text-sm text-gray-400">Control the public-facing images used across RCL. Upload replacements, preview assets, edit accessibility text, and activate or deactivate site imagery from one place.</p></div><span className="rounded-full border border-green-400/20 bg-green-400/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-green-400">ADMIN ONLY</span></div>
            </section>
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-black uppercase tracking-widest text-rcl-gold">Site Image Map</h2><p className="mt-1 text-xs text-gray-500">Every slot represents a public RCL experience.</p></div><span className="text-[10px] font-black text-gray-500">{assets.length} SLOTS</span></div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => <article key={asset.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                <div className="relative aspect-[16/9] bg-white/5">{asset.image_url ? <img src={asset.image_url} alt={asset.alt_text || asset.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-center text-[10px] font-black uppercase tracking-widest text-gray-600">No image assigned</div>}
                  <label className="absolute bottom-3 right-3 cursor-pointer rounded-lg bg-rcl-orange px-3 py-2 text-[9px] font-black uppercase tracking-widest text-black">Replace<input type="file" accept="image/*" className="hidden" onChange={(e) => { const file=e.target.files?.[0]; if(file) void uploadSiteImage(asset,file); e.currentTarget.value=''; }} /></label>
                </div>
                <div className="p-4"><p className="text-[9px] font-black uppercase tracking-widest text-rcl-orange">{asset.location}</p><h3 className="mt-1 font-black">{asset.title}</h3><input value={asset.alt_text || ''} onChange={(e) => setAssets((prev) => prev.map((x) => x.id === asset.id ? {...x, alt_text:e.target.value} : x))} onBlur={(e) => void updateAsset(asset,{alt_text:e.target.value})} placeholder="Accessibility description" className="mt-3 w-full rounded-lg border border-white/10 bg-black p-2 text-xs text-white" /><div className="mt-3 flex items-center justify-between"><span className={asset.is_active ? 'text-[9px] font-black uppercase text-green-400' : 'text-[9px] font-black uppercase text-gray-500'}>{asset.is_active ? 'LIVE' : 'OFF'}</span><button onClick={() => void updateAsset(asset,{is_active:!asset.is_active})} className="rounded-lg border border-white/10 px-3 py-1.5 text-[9px] font-black uppercase">{asset.is_active ? 'Deactivate' : 'Activate'}</button></div></div>
              </article>)}</div>
            </section>
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><h2 className="mb-5 text-sm font-black uppercase tracking-widest text-rcl-gold">News publishing</h2>{news.slice(0,30).map((n)=><div key={n.id} className="flex items-center justify-between gap-4 border-b border-white/5 py-4"><div><p className="font-bold">{n.title}</p><p className="text-[10px] text-gray-500">{n.status}</p></div><select value={n.status} onChange={(e)=>void publishNews(n.id,e.target.value as any)} className="rounded bg-black p-2 text-[9px]"><option value="draft">DRAFT</option><option value="published">PUBLISHED</option><option value="archived">ARCHIVED</option></select></div>)}</section>
              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-widest text-rcl-gold">Media Library</h2><span className="text-[9px] font-black text-gray-500">{media.length} ITEMS</span></div>{media.slice(0,30).map((m)=><div key={m.id} className="flex items-center justify-between gap-4 border-b border-white/5 py-4"><div><p className="font-bold">{m.title || 'Untitled media'}</p><p className="text-[10px] text-gray-500">{m.media_type} · {m.status}</p></div><button onClick={()=>void deleteMedia(m.id)} className="rounded-lg bg-rcl-red/10 px-3 py-2 text-[9px] font-black text-rcl-red"><FaTrash /></button></div>)}{!media.length&&<p className="text-sm text-gray-500">No media records.</p>}</section>
            </div>
          </div>}

          {activeTab === 'settings' && <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><h2 className="mb-5 text-sm font-black uppercase tracking-widest text-rcl-gold">Platform configuration</h2><div className="space-y-4">{settings.map((s) => <SettingEditor key={s.key} setting={s} onSave={updateSetting} />)}</div></section>}
        </div>}
      </Container>
    </main>
  );
}

function SettingEditor({ setting, onSave }: { setting: any; onSave: (key: string, raw: string) => void }) {
  const [value, setValue] = useState(JSON.stringify(setting.value, null, 2));
  return <div className="rounded-xl border border-white/5 bg-black/30 p-4"><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-widest">{setting.key}</span><button onClick={() => onSave(setting.key, value)} className="rounded-lg bg-rcl-orange px-3 py-1.5 text-[9px] font-black text-black"><FaCheck className="inline mr-1" /> SAVE</button></div><textarea value={value} onChange={(e) => setValue(e.target.value)} rows={5} className="mt-3 w-full rounded-lg border border-white/10 bg-black p-3 font-mono text-xs text-gray-200" /></div>;
}
