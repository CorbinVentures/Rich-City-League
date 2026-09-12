'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { DisciplineCase, Draft, DraftPool, LeagueRequest, Team, TryoutSession } from '@/types/database';

const categories = ['TRADE_REQUEST', 'ROSTER_CHANGE', 'PLAYER_RELEASE', 'PLAYER_ACTIVATION', 'DNP_INQUIRY', 'CONDUCT_CONCERN', 'GENERAL'];

export default function LeagueOperationsPage() {
  const { profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [sessions, setSessions] = useState<TryoutSession[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [pool, setPool] = useState<DraftPool[]>([]);
  const [requests, setRequests] = useState<LeagueRequest[]>([]);
  const [cases, setCases] = useState<DisciplineCase[]>([]);
  const [seasons, setSeasons] = useState<Array<{ id: string; name: string }>>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamSeasonLinks, setTeamSeasonLinks] = useState<Array<{ team_id: string; season_id: string }>>([]);
  const [orderDraftId, setOrderDraftId] = useState('');
  const [orderValues, setOrderValues] = useState<string[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [sessionForm, setSessionForm] = useState({ season_id: '', starts_at: '', ends_at: '', capacity: 30 });
  const [draftForm, setDraftForm] = useState({ season_id: '', name: '', rounds: 4, roster_limit: 12 });

  const isStaff = profile?.role === 'admin' || profile?.role === 'staff';

  async function load() {
    if (!supabase || !isStaff) return;
    setBusy(true);
    const [sessionResult, draftResult, poolResult, requestResult, caseResult, seasonResult, teamResult, teamSeasonResult] = await Promise.all([
      supabase.from('tryout_sessions').select('*').order('starts_at'),
      supabase.from('drafts').select('*').order('created_at', { ascending: false }),
      supabase.from('draft_pools').select('*').order('updated_at', { ascending: false }),
      supabase.from('league_requests').select('*').order('updated_at', { ascending: false }),
      supabase.from('discipline_cases').select('*').order('created_at', { ascending: false }),
      supabase.from('seasons').select('id,name').order('start_date', { ascending: false }),
      supabase.from('teams').select('*').eq('is_active', true).order('name'),
      supabase.from('team_seasons').select('team_id,season_id'),
    ]);
    if (sessionResult.error || draftResult.error || poolResult.error || requestResult.error || caseResult.error || seasonResult.error || teamResult.error || teamSeasonResult.error) {
      setMessage('Unable to load league operations.');
    } else {
      setSessions((sessionResult.data ?? []) as TryoutSession[]);
      setDrafts((draftResult.data ?? []) as Draft[]);
      setPool((poolResult.data ?? []) as DraftPool[]);
      setRequests((requestResult.data ?? []) as LeagueRequest[]);
      setCases((caseResult.data ?? []) as DisciplineCase[]);
      setSeasons((seasonResult.data ?? []) as Array<{ id: string; name: string }>);
      setTeams((teamResult.data ?? []) as Team[]);
      setTeamSeasonLinks((teamSeasonResult.data ?? []) as Array<{ team_id: string; season_id: string }>);
    }
    setBusy(false);
  }

  useEffect(() => { void load(); }, [supabase, isStaff]);

  async function createTryout(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !profile || !sessionForm.season_id) return;
    const { error } = await supabase.from('tryout_sessions').insert({ ...sessionForm, starts_at: new Date(sessionForm.starts_at).toISOString(), ends_at: new Date(sessionForm.ends_at).toISOString(), capacity: Number(sessionForm.capacity), created_by: profile.id } as never);
    setMessage(error ? error.message : 'Tryout session created.');
    if (!error) void load();
  }

  async function createDraft(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !profile || !draftForm.season_id) return;
    const { error } = await supabase.from('drafts').insert({ ...draftForm, rounds: Number(draftForm.rounds), roster_limit: Number(draftForm.roster_limit), created_by: profile.id } as never);
    setMessage(error ? error.message : 'Draft created in setup mode.');
    if (!error) void load();
  }

  async function updateRequest(id: string, status: string) {
    if (!supabase) return;
    const { error } = await supabase.from('league_requests').update({ status } as never).eq('id', id);
    setMessage(error ? error.message : 'Request status updated.');
    if (!error) void load();
  }

  async function updateSession(id: string, status: TryoutSession['status']) {
    if (!supabase) return;
    const { error } = await supabase.from('tryout_sessions').update({ status } as never).eq('id', id);
    setMessage(error ? error.message : 'Tryout status updated.');
    if (!error) void load();
  }

  async function updateDraft(id: string, status: Draft['status']) {
    if (!supabase) return;
    const action = status === 'OPEN' ? 'OPEN' : status === 'PAUSED' ? 'PAUSE' : 'COMPLETE';
    const { error } = await supabase.rpc('manage_draft_clock' as never, {
      target_draft: id,
      target_action: action,
      target_extension_seconds: 0,
    } as never);
    setMessage(error ? error.message : `Draft ${status.toLowerCase()}.`);
    if (!error) void load();
  }

  async function saveDraftOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !orderDraftId || orderValues.some((teamId) => !teamId)) return;
    const { error } = await supabase.rpc('configure_draft_order' as never, {
      target_draft: orderDraftId,
      ordered_teams: orderValues,
    } as never);
    setMessage(error ? error.message : 'Draft order saved.');
  }

  if (authLoading || busy) return <main><Container maxWidth="xl" className="py-16"><div className="h-8 w-72 animate-pulse rounded bg-white/10" /></Container></main>;
  if (!profile || !isStaff) return <main><Container maxWidth="lg" className="py-16"><h1 className="font-display text-3xl font-bold">League operations access required</h1><p className="mt-3 text-gray-400">This command center is limited to authorized league staff.</p></Container></main>;

  const availableOrderTeams = teams.filter((team) => {
    const selectedDraft = drafts.find((draft) => draft.id === orderDraftId);
    return selectedDraft ? teamSeasonLinks.some((link) => link.team_id === team.id && link.season_id === selectedDraft.season_id) : false;
  });

  return <main className="min-h-screen pb-20"><Container maxWidth="xl" className="py-10">
    <Link href="/admin" className="text-sm text-rcl-gold">← Command center</Link>
    <p className="mt-8 text-xs font-bold uppercase tracking-[0.25em] text-rcl-gold">RCL league operations</p>
    <h1 className="mt-2 font-display text-5xl font-bold">The league room</h1>
    <p className="mt-3 max-w-2xl text-gray-400">Run the player lifecycle from tryout registration through draft, roster status, requests, and discipline. Every change is protected by Supabase authorization and recorded in the audit log.</p>
    {message && <p className="mt-5 rounded-lg bg-rcl-gold/10 p-3 text-sm text-rcl-gold">{message}</p>}
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {[
        ['Tryouts', sessions.length, 'OPEN sessions', sessions.filter((s) => s.status === 'OPEN').length],
        ['Drafts', drafts.length, 'On the clock', drafts.filter((d) => d.status === 'OPEN').length],
        ['Draft pool', pool.length, 'Eligible', pool.filter((p) => p.eligible).length],
        ['Requests', requests.length, 'Needs review', requests.filter((r) => !['RESOLVED', 'CLOSED'].includes(r.status)).length],
        ['Discipline', cases.length, 'Open cases', cases.filter((c) => !['FINAL', 'CLOSED'].includes(c.status)).length],
      ].map(([label, total, sub, value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-xs uppercase tracking-widest text-gray-500">{label}</p><p className="mt-2 text-3xl font-bold">{total}</p><p className="mt-2 text-xs text-rcl-gold">{value} {sub}</p></div>)}
    </div>
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><h2 className="font-display text-2xl font-bold">Preseason tryouts</h2><form onSubmit={createTryout} className="mt-5 grid gap-3 sm:grid-cols-2">
        <select required value={sessionForm.season_id} onChange={(e) => setSessionForm({ ...sessionForm, season_id: e.target.value })} className="rounded-lg border border-white/10 bg-black/30 p-3 text-white"><option value="">Season</option>{seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input required type="number" min="1" value={sessionForm.capacity} onChange={(e) => setSessionForm({ ...sessionForm, capacity: Number(e.target.value) })} placeholder="Capacity" className="rounded-lg border border-white/10 bg-black/30 p-3 text-white" />
        <input required type="datetime-local" value={sessionForm.starts_at} onChange={(e) => setSessionForm({ ...sessionForm, starts_at: e.target.value })} className="rounded-lg border border-white/10 bg-black/30 p-3 text-white" />
        <input required type="datetime-local" value={sessionForm.ends_at} onChange={(e) => setSessionForm({ ...sessionForm, ends_at: e.target.value })} className="rounded-lg border border-white/10 bg-black/30 p-3 text-white" />
        <button className="rounded-lg bg-rcl-gold px-4 py-3 font-bold text-black sm:col-span-2">Create tryout session</button>
      </form><div className="mt-6 space-y-2">{sessions.map((s) => <div key={s.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3 text-sm"><span>{new Date(s.starts_at).toLocaleString()} · cap {s.capacity}</span><select value={s.status} onChange={(e) => void updateSession(s.id, e.target.value as TryoutSession['status'])} className="rounded border border-white/10 bg-black/30 p-2 text-white">{['DRAFT','OPEN','FULL','COMPLETED','CANCELLED'].map((v) => <option key={v}>{v}</option>)}</select></div>)}</div></section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><h2 className="font-display text-2xl font-bold">Draft room</h2><form onSubmit={createDraft} className="mt-5 grid gap-3 sm:grid-cols-2">
        <select required value={draftForm.season_id} onChange={(e) => setDraftForm({ ...draftForm, season_id: e.target.value })} className="rounded-lg border border-white/10 bg-black/30 p-3 text-white sm:col-span-2"><option value="">Season</option>{seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input required value={draftForm.name} onChange={(e) => setDraftForm({ ...draftForm, name: e.target.value })} placeholder="Draft name" className="rounded-lg border border-white/10 bg-black/30 p-3 text-white sm:col-span-2" />
        <input required type="number" min="1" value={draftForm.rounds} onChange={(e) => setDraftForm({ ...draftForm, rounds: Number(e.target.value) })} placeholder="Rounds" className="rounded-lg border border-white/10 bg-black/30 p-3 text-white" />
        <input required type="number" min="1" value={draftForm.roster_limit} onChange={(e) => setDraftForm({ ...draftForm, roster_limit: Number(e.target.value) })} placeholder="Roster limit" className="rounded-lg border border-white/10 bg-black/30 p-3 text-white" />
        <button className="rounded-lg bg-rcl-orange px-4 py-3 font-bold text-black sm:col-span-2">Create draft</button>
      </form><div className="mt-6 space-y-2">{drafts.map((d) => <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-3 text-sm"><span>{d.name} · pick {d.current_pick}</span><div className="flex items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{d.status}</span>{d.status === 'SETUP' && <button type="button" onClick={() => void updateDraft(d.id, 'OPEN')} className="rounded bg-rcl-orange px-3 py-1 text-xs font-bold text-black">Open</button>}{d.status === 'OPEN' && <button type="button" onClick={() => void updateDraft(d.id, 'PAUSED')} className="rounded border border-white/20 px-3 py-1 text-xs">Pause</button>}{d.status === 'PAUSED' && <button type="button" onClick={() => void updateDraft(d.id, 'OPEN')} className="rounded bg-rcl-orange px-3 py-1 text-xs font-bold text-black">Resume</button>}{['OPEN', 'PAUSED'].includes(d.status) && <button type="button" onClick={() => void updateDraft(d.id, 'COMPLETED')} className="rounded border border-red-400/40 px-3 py-1 text-xs text-red-300">Complete</button>}</div></div>)}</div><form onSubmit={saveDraftOrder} className="mt-6 border-t border-white/10 pt-6"><h3 className="font-semibold">Configure official pick order</h3><p className="mt-1 text-xs text-gray-500">Choose a team for every pick before opening a draft. The database, not the client, enforces this order.</p><select required value={orderDraftId} onChange={(event) => { const id = event.target.value; const draft = drafts.find((item) => item.id === id); const draftTeams = teams.filter((team) => teamSeasonLinks.some((link) => link.team_id === team.id && link.season_id === draft?.season_id)); setOrderDraftId(id); setOrderValues(draft ? Array.from({ length: draft.rounds * draftTeams.length }, (_, index) => draftTeams[index % Math.max(draftTeams.length, 1)]?.id ?? '') : []); }} className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white"><option value="">Select setup draft</option>{drafts.filter((d) => d.status === 'SETUP').map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>{orderValues.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{orderValues.map((teamId, index) => <label key={index} className="text-xs text-gray-400">Pick {index + 1}<select required value={teamId} onChange={(event) => setOrderValues((values) => values.map((value, position) => position === index ? event.target.value : value))} className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2 text-white">{availableOrderTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>)}</div>}<button disabled={orderValues.length === 0} className="mt-4 rounded-lg bg-rcl-gold px-4 py-3 font-bold text-black disabled:opacity-40">Save official order</button></form></section>
    </div>
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><h2 className="font-display text-2xl font-bold">Request center</h2><div className="mt-5 space-y-3">{requests.slice(0, 8).map((r) => <div key={r.id} className="rounded-lg border border-white/10 p-4"><div className="flex justify-between gap-3"><div><p className="font-semibold">{r.subject}</p><p className="mt-1 text-xs text-gray-500">{r.category}</p></div><select value={r.status} onChange={(e) => void updateRequest(r.id, e.target.value)} className="rounded border border-white/10 bg-black/30 p-2 text-xs text-white">{['SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION','APPROVED','DENIED','RESOLVED','CLOSED'].map((v) => <option key={v}>{v}</option>)}</select></div></div>)}{requests.length === 0 && <p className="text-sm text-gray-500">No requests are waiting for staff.</p>}</div></section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><h2 className="font-display text-2xl font-bold">Discipline center</h2><div className="mt-5 space-y-3">{cases.slice(0, 8).map((c) => <div key={c.id} className="rounded-lg border border-white/10 p-4"><div className="flex justify-between"><span className="font-semibold">{c.description.slice(0, 80)}</span><span className="text-xs text-rcl-orange">{c.status}</span></div><p className="mt-2 text-xs text-gray-500">Incident {c.incident_date} · case {c.id.slice(0, 8)}</p></div>)}{cases.length === 0 && <p className="text-sm text-gray-500">No disciplinary cases.</p>}</div></section>
    </div>
    <p className="mt-8 text-xs text-gray-500">Request categories supported: {categories.join(' · ')}. Private evaluator notes and discipline records are never exposed to public queries.</p>
  </Container></main>;
}
