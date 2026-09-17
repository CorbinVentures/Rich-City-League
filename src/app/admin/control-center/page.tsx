'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowLeft, FaBell, FaBullhorn, FaChartLine, FaCheck, FaCircleExclamation, FaFileShield, FaGear, FaLayerGroup, FaNewspaper, FaPeopleGroup, FaRotate, FaShieldHalved, FaTrash, FaUsersGear } from 'react-icons/fa6';

const roles = ['player', 'coach', 'staff', 'admin'] as const;
const reportStatuses = ['open', 'reviewing', 'resolved', 'dismissed'] as const;
const contentStatuses = ['draft', 'published', 'archived'] as const;

export default function AdminControlCenterPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const isAdmin = profile?.role === 'admin';

  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [activePanel, setActivePanel] = useState('users');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [broadcast, setBroadcast] = useState({ title: '', body: '', link: '/social' });
  const [broadcasting, setBroadcasting] = useState(false);

  const audit = useCallback(async (action: string, details: string) => {
    if (!supabase || !user) return;
    await supabase.from('audit_logs').insert({ user_id: user.id, action, details } as never);
  }, [supabase, user]);

  const load = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setLoading(true);
    const [u, p, c, r, l, s, ss] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('posts').select('*, author:profiles(*)').order('created_at', { ascending: false }).limit(50),
      supabase.from('comments').select('*, author:profiles(*)').order('created_at', { ascending: false }).limit(50),
      supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('leagues').select('*').order('name'),
      supabase.from('seasons').select('*').order('start_date', { ascending: false }),
      supabase.from('site_settings').select('*').order('key'),
    ]);
    setUsers(u.data ?? []);
    setPosts(p.data ?? []);
    setComments(c.data ?? []);
    setReports(r.data ?? []);
    setLeagues(l.data ?? []);
    setSeasons(s.data ?? []);
    setSettings(ss.data ?? []);
    setLoading(false);
  }, [supabase, isAdmin]);

  useEffect(() => { void load(); }, [load]);

  const changeRole = async (id: string, role: string) => {
    if (!supabase || id === user?.id) return;
    setBusyId(id); setMessage('');
    const { error } = await supabase.from('profiles').update({ role } as never).eq('id', id);
    if (!error) { await audit('ADMIN_ROLE_CHANGE', `Changed profile ${id} to ${role}`); setMessage('User role updated.'); await load(); }
    else setMessage(error.message);
    setBusyId(null);
  };

  const toggleUser = async (id: string, active: boolean) => {
    if (!supabase || id === user?.id) return;
    setBusyId(id); setMessage('');
    const { error } = await supabase.from('profiles').update({ is_active: active } as never).eq('id', id);
    if (!error) { await audit('ADMIN_ACCOUNT_STATUS', `${active ? 'Activated' : 'Deactivated'} profile ${id}`); await load(); }
    else setMessage(error.message);
    setBusyId(null);
  };

  const setPostStatus = async (id: string, status: string) => {
    if (!supabase) return;
    setBusyId(id); setMessage('');
    const { error } = await supabase.from('posts').update({ status } as never).eq('id', id);
    if (!error) { await audit('ADMIN_POST_STATUS', `Set post ${id} to ${status}`); await load(); }
    else setMessage(error.message);
    setBusyId(null);
  };

  const deleteComment = async (id: string) => {
    if (!supabase) return;
    setBusyId(id); setMessage('');
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (!error) { await audit('ADMIN_DELETE_COMMENT', `Removed comment ${id}`); await load(); }
    else setMessage(error.message);
    setBusyId(null);
  };

  const updateReport = async (id: string, status: string) => {
    if (!supabase || !user) return;
    setBusyId(id); setMessage('');
    const { error } = await supabase.from('reports').update({ status, reviewed_by: user.id } as never).eq('id', id);
    if (!error) { await audit('ADMIN_REPORT_REVIEW', `Set report ${id} to ${status}`); await load(); }
    else setMessage(error.message);
    setBusyId(null);
  };

  const toggleLeague = async (id: string, active: boolean) => {
    if (!supabase) return;
    setBusyId(id);
    const { error } = await supabase.from('leagues').update({ is_active: active } as never).eq('id', id);
    if (!error) { await audit('ADMIN_LEAGUE_VISIBILITY', `${active ? 'Activated' : 'Archived'} league ${id}`); await load(); }
    else setMessage(error.message);
    setBusyId(null);
  };

  const toggleRegistration = async (id: string, open: boolean) => {
    if (!supabase) return;
    setBusyId(id);
    const { error } = await supabase.from('seasons').update({ registration_open: open } as never).eq('id', id);
    if (!error) { await audit('ADMIN_REGISTRATION_WINDOW', `${open ? 'Opened' : 'Closed'} registration for season ${id}`); await load(); }
    else setMessage(error.message);
    setBusyId(null);
  };

  const saveSetting = async (key: string, raw: string) => {
    if (!supabase) return;
    let value: unknown;
    try { value = JSON.parse(raw); } catch { setMessage(`Invalid JSON for ${key}.`); return; }
    setBusyId(key); setMessage('');
    const { error } = await supabase.from('site_settings').upsert({ key, value } as never);
    if (!error) { await audit('ADMIN_SITE_SETTING', `Updated site setting ${key}`); await load(); }
    else setMessage(error.message);
    setBusyId(null);
  };

  const broadcastNotification = async () => {
    if (!supabase || !broadcast.title.trim() || !broadcast.body.trim()) return;
    setBroadcasting(true); setMessage('');
    const activeIds = users.filter((u) => u.is_active).map((u) => u.id);
    const rows = activeIds.map((recipient_id) => ({ recipient_id, actor_id: user?.id ?? null, type: 'announcement', title: broadcast.title.trim(), body: broadcast.body.trim(), link: broadcast.link.trim() || '/social' }));
    const { error } = await supabase.from('notifications').insert(rows as never);
    if (!error) { await audit('ADMIN_BROADCAST', `Broadcast announcement to ${rows.length} active profiles`); setBroadcast({ title: '', body: '', link: '/social' }); setMessage(`Announcement sent to ${rows.length} active profiles.`); }
    else setMessage(error.message);
    setBroadcasting(false);
  };

  if (authLoading) return <main className="min-h-screen bg-rcl-black p-20 text-center text-white">Checking administrator authorization…</main>;
  if (!isAdmin) return <main className="min-h-screen bg-rcl-black p-20 text-center text-white"><FaShieldHalved className="mx-auto h-14 w-14 text-rcl-red" /><h1 className="mt-5 font-display text-3xl uppercase">Admin access required</h1><Link href="/admin" className="mt-6 inline-block text-rcl-gold">Return to command center</Link></main>;

  const panels = [
    ['users', 'USER & ROLE CONTROL', FaUsersGear],
    ['moderation', 'SOCIAL MODERATION', FaComment],
    ['reports', 'REPORT CENTER', FaFileShield],
    ['league', 'LEAGUE CONTROL', FaLayerGroup],
    ['content', 'CONTENT CONTROL', FaNewspaper],
    ['broadcast', 'ANNOUNCEMENTS', FaBullhorn],
    ['settings', 'SITE SETTINGS', FaGear],
  ] as const;

  return (
    <main className="min-h-screen bg-rcl-black pb-28 text-white">
      <Container maxWidth="xl" className="py-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-rcl-gold"><FaArrowLeft /> Command center</Link>
        <div className="mt-8 rounded-3xl border border-rcl-orange/20 bg-[radial-gradient(circle_at_top_right,rgba(255,107,26,0.18),transparent_40%)] p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-rcl-orange">SYSTEM CONTROL CENTER · ADMIN ONLY</p><h1 className="mt-2 font-display text-4xl font-black uppercase md:text-6xl">RCL <span className="text-rcl-orange">COMMAND</span></h1><p className="mt-3 max-w-2xl text-sm text-gray-400">Full administrative controls for people, permissions, moderation, league state, publishing, announcements, and site configuration.</p></div>
            <div className="flex gap-2"><Link href="/admin/operations" className="rounded-xl bg-rcl-orange px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black">League operations</Link><button onClick={() => void load()} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-widest">Refresh</button></div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
          {panels.map(([id, label, Icon]) => <button key={id} onClick={() => setActivePanel(id)} className={`rounded-xl border px-3 py-3 text-left text-[9px] font-black uppercase tracking-wider transition ${activePanel === id ? 'border-rcl-orange bg-rcl-orange text-black' : 'border-white/10 bg-white/[0.02] text-gray-400 hover:text-white'}`}><Icon className="mb-2 h-4 w-4" />{label}</button>)}
        </div>

        {message && <div className="mt-5 rounded-xl border border-rcl-orange/20 bg-rcl-orange/5 p-3 text-xs font-bold text-rcl-orange">{message}</div>}
        {loading ? <div className="mt-6 h-64 animate-pulse rounded-2xl border border-white/10 bg-white/5" /> : <div className="mt-6">
          {activePanel === 'users' && <section className="space-y-4"><Header title="USER & ROLE CONTROL" icon={<FaUsersGear />} /><div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-white/10 text-[9px] uppercase tracking-widest text-gray-500"><th className="p-4">PROFILE</th><th>ROLE</th><th>ACCOUNT</th><th>VISIBILITY</th><th className="text-right">ACTIONS</th></tr></thead><tbody>{users.map((u) => <tr key={u.id} className="border-b border-white/5 last:border-0"><td className="p-4"><b>{u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'RCL User'}</b><div className="text-[10px] text-gray-500">@{u.username || 'profile'}</div></td><td><select disabled={u.id === user?.id || busyId === u.id} value={u.role} onChange={(e) => void changeRole(u.id, e.target.value)} className="rounded-lg border border-white/10 bg-black p-2 text-xs"><option value="player">PLAYER</option>{roles.filter((r) => r !== 'player').map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}</select></td><td><span className={`rounded-full px-2 py-1 text-[9px] font-black ${u.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{u.is_active ? 'ACTIVE' : 'DISABLED'}</span></td><td className="text-gray-400">{u.profile_visibility || 'public'}</td><td className="p-4 text-right"><button disabled={u.id === user?.id || busyId === u.id} onClick={() => void toggleUser(u.id, !u.is_active)} className="rounded-lg border border-white/10 px-3 py-2 text-[9px] font-black uppercase disabled:opacity-40">{u.is_active ? 'Disable' : 'Activate'}</button></td></tr>)}</tbody></table></div><p className="text-[10px] text-gray-500">Your own administrator account cannot be demoted or disabled from this console.</p></section>}

          {activePanel === 'moderation' && <section className="space-y-4"><Header title="SOCIAL MODERATION" icon={<FaComment />} /><div className="grid gap-4 lg:grid-cols-2">{posts.map((p) => <article key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><div className="flex items-start justify-between gap-4"><div><b>{p.author?.display_name || `${p.author?.first_name || ''} ${p.author?.last_name || ''}`.trim() || 'RCL User'}</b><p className="mt-2 text-sm text-gray-300">{p.body}</p></div><span className="text-[9px] font-black uppercase text-gray-500">{p.status}</span></div><div className="mt-4 flex gap-2"><select value={p.status} onChange={(e) => void setPostStatus(p.id, e.target.value)} className="rounded-lg border border-white/10 bg-black p-2 text-[10px] font-black"><option value="draft">DRAFT</option><option value="published">PUBLISHED</option><option value="archived">ARCHIVED</option></select><button onClick={() => void setPostStatus(p.id, 'archived')} className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 text-[10px] font-black text-red-400"><FaTrash className="mr-1 inline" /> Archive</button></div></article>)}</div></section>}

          {activePanel === 'reports' && <section className="space-y-4"><Header title="REPORT CENTER" icon={<FaFileShield />} /><div className="grid gap-4">{reports.length === 0 ? <Empty text="No reports are waiting for review." /> : reports.map((r) => <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><span className="rounded bg-rcl-orange/10 px-2 py-1 text-[9px] font-black uppercase text-rcl-orange">{r.reason}</span><p className="mt-2 text-[10px] text-gray-500">Report {r.id}</p></div><select value={r.status} onChange={(e) => void updateReport(r.id, e.target.value)} className="rounded-lg border border-white/10 bg-black p-2 text-[10px] font-black">{reportStatuses.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}</select></div></div>)}</div></section>}

          {activePanel === 'league' && <section className="space-y-6"><Header title="LEAGUE & SEASON CONTROL" icon={<FaLayerGroup />} /><div className="grid gap-4 md:grid-cols-2">{leagues.map((l) => <div key={l.id} className="rounded-2xl border border-white/10 p-5"><div className="flex justify-between"><div><h3 className="font-display text-xl font-black uppercase">{l.name}</h3><p className="text-xs text-gray-500">{l.city}, {l.state}</p></div><button onClick={() => void toggleLeague(l.id, !l.is_active)} className="rounded-lg border border-white/10 px-3 py-2 text-[9px] font-black uppercase">{l.is_active ? 'ACTIVE' : 'INACTIVE'}</button></div></div>)}</div><div className="grid gap-4 md:grid-cols-2">{seasons.map((s) => <div key={s.id} className="rounded-2xl border border-white/10 p-5"><div className="flex justify-between gap-4"><div><h3 className="font-display text-lg font-black uppercase">{s.name}</h3><p className="text-xs text-gray-500">{s.start_date} → {s.end_date}</p></div><button onClick={() => void toggleRegistration(s.id, !s.registration_open)} className={`rounded-lg px-3 py-2 text-[9px] font-black uppercase ${s.registration_open ? 'bg-green-500 text-black' : 'border border-white/10 text-gray-400'}`}>{s.registration_open ? 'REGISTRATION OPEN' : 'REGISTRATION CLOSED'}</button></div></div>)}</div></section>}

          {activePanel === 'content' && <section className="space-y-4"><Header title="CONTENT CONTROL" icon={<FaNewspaper />} /><div className="grid gap-4 md:grid-cols-3"><Link href="/news" className="rounded-2xl border border-white/10 p-5 hover:border-rcl-orange"><FaNewspaper className="text-rcl-orange" /><h3 className="mt-3 font-black uppercase">News & Publishing</h3><p className="mt-1 text-xs text-gray-500">Create, publish, archive and manage league stories.</p></Link><Link href="/media" className="rounded-2xl border border-white/10 p-5 hover:border-rcl-orange"><FaChartLine className="text-rcl-orange" /><h3 className="mt-3 font-black uppercase">Media Library</h3><p className="mt-1 text-xs text-gray-500">Manage league photos and media assets.</p></Link><Link href="/admin/shop" className="rounded-2xl border border-white/10 p-5 hover:border-rcl-orange"><FaLayerGroup className="text-rcl-orange" /><h3 className="mt-3 font-black uppercase">Commerce</h3><p className="mt-1 text-xs text-gray-500">Manage products, inventory and shop content.</p></Link></div><div className="rounded-2xl border border-white/10 p-5"><h3 className="font-black uppercase">Comments awaiting attention</h3>{comments.slice(0, 20).map((c) => <div key={c.id} className="mt-3 flex items-center justify-between gap-3 border-t border-white/5 pt-3"><p className="text-xs text-gray-300"><b>{c.author?.display_name || 'RCL User'}</b> — {c.body}</p><button onClick={() => void deleteComment(c.id)} className="shrink-0 rounded-lg border border-red-500/20 px-3 py-2 text-[9px] font-black uppercase text-red-400">Remove</button></div>)}</div></section>}

          {activePanel === 'broadcast' && <section className="space-y-4"><Header title="ANNOUNCEMENT BROADCAST" icon={<FaBullhorn />} /><div className="max-w-2xl rounded-2xl border border-white/10 p-6"><input value={broadcast.title} onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })} placeholder="Announcement title" className="w-full rounded-xl border border-white/10 bg-black p-3 text-sm" /><textarea value={broadcast.body} onChange={(e) => setBroadcast({ ...broadcast, body: e.target.value })} placeholder="Message to the RCL community" rows={5} className="mt-3 w-full rounded-xl border border-white/10 bg-black p-3 text-sm" /><input value={broadcast.link} onChange={(e) => setBroadcast({ ...broadcast, link: e.target.value })} placeholder="Destination link" className="mt-3 w-full rounded-xl border border-white/10 bg-black p-3 text-sm" /><button disabled={broadcasting || !broadcast.title.trim() || !broadcast.body.trim()} onClick={() => void broadcastNotification()} className="mt-4 rounded-xl bg-rcl-orange px-5 py-3 text-xs font-black uppercase tracking-widest text-black disabled:opacity-50"><FaBell className="mr-2 inline" />{broadcasting ? 'Sending…' : 'Send to all active users'}</button></div></section>}

          {activePanel === 'settings' && <section className="space-y-4"><Header title="SITE SETTINGS" icon={<FaGear />} /><p className="text-xs text-gray-500">Edit JSON-backed configuration values used by the public RCL experience. Invalid JSON is rejected.</p>{settings.map((s) => <div key={s.key} className="rounded-2xl border border-white/10 p-5"><div className="flex flex-col gap-3 md:flex-row md:items-center"><div className="min-w-48"><b className="font-mono text-xs text-rcl-orange">{s.key}</b></div><textarea defaultValue={JSON.stringify(s.value, null, 2)} id={`setting-${s.key}`} rows={3} className="min-h-20 flex-1 rounded-xl border border-white/10 bg-black p-3 font-mono text-xs" /><button disabled={busyId === s.key} onClick={() => { const el = document.getElementById(`setting-${s.key}`) as HTMLTextAreaElement | null; if (el) void saveSetting(s.key, el.value); }} className="rounded-xl bg-rcl-orange px-4 py-3 text-[10px] font-black uppercase text-black disabled:opacity-50"><FaCheck className="mr-1 inline" />Save</button></div></div>)}</section>}
        </div>}
      </Container>
    </main>
  );
}

function Header({ title, icon }: { title: string; icon: React.ReactNode }) { return <div className="flex items-center gap-3"><div className="rounded-xl bg-rcl-orange/10 p-3 text-rcl-orange">{icon}</div><div><p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500">Administrator controls</p><h2 className="font-display text-2xl font-black uppercase">{title}</h2></div></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-gray-500">{text}</div>; }
