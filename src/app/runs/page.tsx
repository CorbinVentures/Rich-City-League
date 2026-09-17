'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowRight, FaBasketball, FaBolt, FaCalendarDays, FaLocationDot, FaPeopleGroup, FaPlus, FaXmark } from 'react-icons/fa6';

type Run = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  location: string;
  starts_at: string;
  skill_level: 'all' | 'beginner' | 'intermediate' | 'advanced' | 'elite';
  game_format: string;
  max_players: number;
  status: 'open' | 'full' | 'cancelled' | 'completed';
  host?: { display_name: string | null; username: string | null; avatar_url?: string | null };
  players?: string[];
};

const skillLabels: Record<Run['skill_level'], string> = {
  all: 'Everyone', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', elite: 'Elite',
};

export default function RunsPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [runs, setRuns] = useState<Run[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | Run['skill_level']>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', location: '', date: '', time: '', skill_level: 'all' as Run['skill_level'], game_format: '5v5', max_players: 10, description: '' });

  const load = async () => {
    if (!supabase) { setLoading(false); setError('Social services are not configured.'); return; }
    setLoading(true);
    const { data, error: runsError } = await supabase.from('runs').select('id,host_id,title,description,location,starts_at,skill_level,game_format,max_players,status').neq('status', 'cancelled').gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: true }).limit(50);
    if (runsError) { setError(runsError.message); setLoading(false); return; }
    const rows = (data ?? []) as unknown as Run[];
    const hostIds = [...new Set(rows.map((r) => r.host_id))];
    const runIds = rows.map((r) => r.id);
    const [hosts, players] = await Promise.all([
      hostIds.length ? supabase.from('profiles').select('id,display_name,username,avatar_url').in('id', hostIds) : Promise.resolve({ data: [], error: null }),
      runIds.length ? supabase.from('run_players').select('run_id,profile_id').in('run_id', runIds) : Promise.resolve({ data: [], error: null }),
    ]);
    const hostMap = new Map(((hosts.data ?? []) as Array<{ id: string; display_name: string | null; username: string | null; avatar_url?: string | null }>).map((h) => [h.id, h]));
    const playerMap = new Map<string, string[]>();
    for (const p of (players.data ?? []) as Array<{ run_id: string; profile_id: string }>) playerMap.set(p.run_id, [...(playerMap.get(p.run_id) ?? []), p.profile_id]);
    setRuns(rows.map((r) => ({ ...r, host: hostMap.get(r.host_id), players: playerMap.get(r.id) ?? [] })));
    setLoading(false);
  };

  useEffect(() => { void load(); }, [supabase, user?.id]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('rcl-runs-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'runs' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'run_players' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, user?.id]);

  const createRun = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !user) { setError('Sign in to create a run.'); return; }
    if (!form.title.trim() || !form.location.trim() || !form.date || !form.time) { setError('Add a title, court, date, and start time.'); return; }
    const startsAt = new Date(`${form.date}T${form.time}`).toISOString();
    const { data, error: insertError } = await supabase.from('runs').insert({ host_id: user.id, title: form.title.trim(), description: form.description.trim() || null, location: form.location.trim(), starts_at: startsAt, skill_level: form.skill_level, game_format: form.game_format, max_players: form.max_players, status: 'open' } as never).select('id,host_id,title,description,location,starts_at,skill_level,game_format,max_players,status').single();
    if (insertError) { setError(insertError.message); return; }
    if (data) {
      await supabase.from('run_players').insert({ run_id: (data as unknown as Run).id, profile_id: user.id } as never);
      setForm({ title: '', location: '', date: '', time: '', skill_level: 'all', game_format: '5v5', max_players: 10, description: '' });
      setShowCreate(false);
      void load();
    }
  };

  const joinRun = async (run: Run) => {
    if (!supabase || !user) { setError('Sign in to join a run.'); return; }
    const joined = run.players?.includes(user.id);
    if (joined) {
      const { error: leaveError } = await supabase.from('run_players').delete().eq('run_id', run.id).eq('profile_id', user.id);
      if (leaveError) setError(leaveError.message); else void load();
      return;
    }
    if ((run.players?.length ?? 0) >= run.max_players) { setError('This run is full.'); return; }
    const { error: joinError } = await supabase.from('run_players').insert({ run_id: run.id, profile_id: user.id } as never);
    if (joinError) setError(joinError.message); else void load();
  };

  const visibleRuns = filter === 'all' ? runs : runs.filter((run) => run.skill_level === filter);

  return (
    <main className="min-h-screen bg-[#05080d] pb-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(245,146,30,.16),transparent_35%),linear-gradient(135deg,#091426,#05080d)]">
        <Container maxWidth="xl" className="py-10 sm:py-14">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black tracking-[.28em] text-rcl-gold"><FaBolt /> RICH CITY SOCIAL</p>
              <h1 className="mt-3 font-display text-5xl font-black uppercase sm:text-7xl">Who&apos;s <span className="text-rcl-orange">hooping?</span></h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/50">Find a run, pull up to a Richmond court, meet players, and turn a social post into an actual game.</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 py-3 text-xs font-black uppercase tracking-widest text-black hover:brightness-110"><FaPlus /> Create a run</button>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="mt-6">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {(['all', 'beginner', 'intermediate', 'advanced', 'elite'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest ${filter === item ? 'border-rcl-orange bg-rcl-orange text-black' : 'border-white/10 bg-white/[.03] text-white/50 hover:text-white'}`}>{item === 'all' ? 'All runs' : skillLabels[item]}</button>)}
        </div>

        {error && <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs text-red-200">{error}</div>}

        {loading ? <div className="rounded-3xl border border-white/10 bg-white/[.03] p-10 text-center text-sm text-white/40">Finding the next runs…</div> : visibleRuns.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 bg-white/[.02] p-12 text-center"><FaBasketball className="mx-auto text-3xl text-rcl-orange" /><h2 className="mt-4 font-display text-2xl font-black uppercase">No runs posted yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-white/40">Be the first person to put a game on the board.</p><button onClick={() => setShowCreate(true)} className="mt-5 rounded-xl bg-rcl-orange px-5 py-3 text-xs font-black uppercase tracking-widest text-black">Start the first run</button></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleRuns.map((run) => {
          const count = run.players?.length ?? 0;
          const joined = user ? run.players?.includes(user.id) : false;
          const date = new Date(run.starts_at);
          return <article key={run.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.035] transition hover:-translate-y-0.5 hover:border-rcl-orange/30">
            <div className="border-b border-white/10 bg-gradient-to-r from-rcl-navy/60 to-transparent p-5">
              <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-rcl-orange/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-rcl-orange">{run.game_format}</span><span className="text-[10px] font-bold text-white/35">{skillLabels[run.skill_level]}</span></div>
              <h2 className="mt-4 font-display text-2xl font-black uppercase">{run.title}</h2>
              {run.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">{run.description}</p>}
            </div>
            <div className="space-y-3 p-5 text-xs text-white/60">
              <div className="flex items-center gap-3"><FaCalendarDays className="text-rcl-gold" /><span>{date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>
              <div className="flex items-center gap-3"><FaLocationDot className="text-rcl-gold" /><span>{run.location}</span></div>
              <div className="flex items-center gap-3"><FaPeopleGroup className="text-rcl-gold" /><span>{count}/{run.max_players} players</span></div>
              <div className="flex items-center justify-between pt-2"><Link href={run.host?.username ? `/fans/${run.host.username}` : '/players'} className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">Hosted by {run.host?.display_name ?? 'RCL player'}</Link><button onClick={() => void joinRun(run)} className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest ${joined ? 'border border-white/10 bg-white/5 text-white' : 'bg-rcl-orange text-black'}`}>{joined ? 'Leave run' : count >= run.max_players ? 'Full' : 'Join run'}</button></div>
            </div>
          </article>;
        })}</div>}

        <div className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-r from-rcl-navy/50 to-white/[.02] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[9px] font-black tracking-[.2em] text-rcl-gold">THE SOCIAL LOOP</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Find people → find a court → play → post the highlights</h2></div><Link href="/social" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rcl-orange">Back to Social <FaArrowRight /></Link></div></div>
      </Container>

      {showCreate && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0a1019] p-5 sm:rounded-3xl sm:p-7"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black tracking-[.2em] text-rcl-orange">RCL RUNS</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Start a game</h2></div><button onClick={() => setShowCreate(false)} className="rounded-full border border-white/10 p-2 text-white/50 hover:text-white"><FaXmark /></button></div><form onSubmit={createRun} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="text-[9px] font-black uppercase tracking-widest text-white/40">Run title</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Friday Night Run" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none focus:border-rcl-orange/50" /></label>
        <label><span className="text-[9px] font-black uppercase tracking-widest text-white/40">Court / location</span><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Hotchkiss Fieldhouse" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none focus:border-rcl-orange/50" /></label>
        <label><span className="text-[9px] font-black uppercase tracking-widest text-white/40">Game format</span><select value={form.game_format} onChange={(e) => setForm({ ...form, game_format: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1521] px-4 py-3 text-sm outline-none"><option>5v5</option><option>4v4</option><option>3v3</option><option>1v1</option><option>open_run</option><option>shootaround</option></select></label>
        <label><span className="text-[9px] font-black uppercase tracking-widest text-white/40">Date</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none" /></label>
        <label><span className="text-[9px] font-black uppercase tracking-widest text-white/40">Start time</span><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none" /></label>
        <label><span className="text-[9px] font-black uppercase tracking-widest text-white/40">Skill level</span><select value={form.skill_level} onChange={(e) => setForm({ ...form, skill_level: e.target.value as Run['skill_level'] })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1521] px-4 py-3 text-sm outline-none"><option value="all">Everyone</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="elite">Elite</option></select></label>
        <label><span className="text-[9px] font-black uppercase tracking-widest text-white/40">Player cap</span><input type="number" min={2} max={50} value={form.max_players} onChange={(e) => setForm({ ...form, max_players: Number(e.target.value) })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none" /></label>
        <label className="sm:col-span-2"><span className="text-[9px] font-black uppercase tracking-widest text-white/40">Details (optional)</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Bring a light and dark jersey. Winners stay. No drama." className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none focus:border-rcl-orange/50" /></label>
        <button className="sm:col-span-2 rounded-xl bg-rcl-orange px-5 py-3 text-xs font-black uppercase tracking-widest text-black">Post this run</button>
      </form></div></div>}
    </main>
  );
}
