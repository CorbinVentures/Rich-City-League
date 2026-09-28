'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  FaArrowRight,
  FaBasketball,
  FaClock,
  FaFloppyDisk,
  FaListOl,
  FaShieldHalved,
} from 'react-icons/fa6';
import { AdminWorkspace } from '@/components/AdminWorkspace';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type DraftSettings = {
  id: string;
  season_id: string;
  name: string;
  rounds: number;
  roster_limit: number;
  status: 'SETUP' | 'OPEN' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  current_pick: number;
  clock_duration_seconds: number;
  rules_text: string | null;
  created_at: string;
};

type FormState = {
  rounds: number;
  roster_limit: number;
  clock_duration_seconds: number;
  rules_text: string;
};

const DEFAULT_FORM: FormState = {
  rounds: 4,
  roster_limit: 12,
  clock_duration_seconds: 120,
  rules_text: '',
};

export default function DraftSettingsPage() {
  const { profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const [drafts, setDrafts] = useState<DraftSettings[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const selected = drafts.find(draft => draft.id === selectedId) ?? null;
  const editable = selected?.status === 'SETUP';

  async function load(preferredId?: string) {
    if (!supabase || profile?.role !== 'admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await db
      .from('drafts')
      .select('id,season_id,name,rounds,roster_limit,status,current_pick,clock_duration_seconds,rules_text,created_at')
      .order('created_at', { ascending: false })
      .limit(25);

    if (result.error) {
      setMessage('Unable to load Draft Night settings.');
      setLoading(false);
      return;
    }

    const rows = (result.data ?? []) as DraftSettings[];
    setDrafts(rows);
    const nextId = preferredId && rows.some(row => row.id === preferredId)
      ? preferredId
      : selectedId && rows.some(row => row.id === selectedId)
        ? selectedId
        : rows.find(row => row.status === 'SETUP')?.id ?? rows[0]?.id ?? '';
    setSelectedId(nextId);
    const next = rows.find(row => row.id === nextId);
    if (next) {
      setForm({
        rounds: Number(next.rounds),
        roster_limit: Number(next.roster_limit),
        clock_duration_seconds: Number(next.clock_duration_seconds),
        rules_text: next.rules_text ?? '',
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) void load();
    // The selected draft is deliberately managed inside load/selectDraft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile?.role, supabase]);

  function selectDraft(id: string) {
    setSelectedId(id);
    setMessage('');
    const draft = drafts.find(item => item.id === id);
    if (!draft) return;
    setForm({
      rounds: Number(draft.rounds),
      roster_limit: Number(draft.roster_limit),
      clock_duration_seconds: Number(draft.clock_duration_seconds),
      rules_text: draft.rules_text ?? '',
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !selected || !editable || saving) return;
    setSaving(true);
    setMessage('');

    const result = await db.rpc('configure_draft_settings', {
      target_draft: selected.id,
      target_rounds: Number(form.rounds),
      target_roster_limit: Number(form.roster_limit),
      target_clock_duration_seconds: Number(form.clock_duration_seconds),
      target_rules_text: form.rules_text.trim(),
    });

    if (result.error) {
      setMessage(result.error.message ?? 'Unable to save Draft Night settings.');
    } else {
      setMessage('Draft Night settings and rules saved.');
      await load(selected.id);
    }
    setSaving(false);
  }

  if (authLoading || loading) {
    return <main className="min-h-screen bg-[#03070d] text-white"><AdminWorkspace /><Container maxWidth="xl" className="py-14"><div className="h-80 animate-pulse rounded-3xl bg-white/5" /></Container></main>;
  }

  if (profile?.role !== 'admin') {
    return <main className="min-h-screen bg-[#03070d] text-white"><AdminWorkspace /><Container maxWidth="lg" className="py-20 text-center"><FaShieldHalved className="mx-auto text-4xl text-rcl-orange"/><h1 className="mt-5 font-display text-4xl font-black uppercase">Admin access required</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">Draft Night configuration is restricted to league administration.</p><Link href="/league" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-5 py-3 text-xs font-black uppercase text-black">League Center <FaArrowRight/></Link></Container></main>;
  }

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <AdminWorkspace />
    <section className="border-b border-white/10 bg-[radial-gradient(circle_at_82%_20%,rgba(255,79,22,.16),transparent_28%),radial-gradient(circle_at_18%_70%,rgba(21,159,255,.14),transparent_32%),#071522]">
      <Container maxWidth="xl" className="py-10 sm:py-14">
        <p className="text-xs font-black uppercase tracking-[.25em] text-rcl-orange">League administration · Draft Night</p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="font-display text-5xl font-black uppercase leading-[.9] sm:text-7xl">Draft<br/><span className="text-rcl-blue">Settings.</span></h1><p className="mt-5 max-w-2xl text-sm leading-6 text-white/50">Set the official format before the room opens. Coaches select players from the live Draft Night board; administration controls the structure, clock, rules and pick order.</p></div>
          <div className="flex flex-wrap gap-2"><Link href="/draft" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-4 text-xs font-black uppercase">View Draft Night <FaBasketball/></Link><Link href="/admin/operations" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase text-black">League Operations <FaArrowRight/></Link></div>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-8 sm:py-10">
      {message && <div role="status" className="mb-6 rounded-2xl border border-rcl-blue/20 bg-rcl-blue/5 p-4 text-sm text-white/70">{message}</div>}
      {!drafts.length ? <section className="rounded-3xl border border-dashed border-white/12 bg-white/[.025] p-10 text-center"><FaListOl className="mx-auto text-3xl text-rcl-blue"/><h2 className="mt-4 font-display text-2xl font-black uppercase">Create the draft first</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/40">League Operations creates the season draft and eligible player pool. Return here after the draft exists to publish its settings and rules.</p><Link href="/admin/operations" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-5 py-3 text-xs font-black uppercase text-black">Open League Operations <FaArrowRight/></Link></section> : <div className="grid gap-7 lg:grid-cols-[.72fr_1.28fr]">
        <aside className="space-y-4">
          <section className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/70 p-5">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">Draft workspace</p>
            <select value={selectedId} onChange={event => selectDraft(event.target.value)} className="mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm font-bold outline-none focus:border-rcl-blue/45">
              {drafts.map(draft => <option key={draft.id} value={draft.id}>{draft.name} · {draft.status}</option>)}
            </select>
            {selected && <div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Status" value={selected.status}/><Metric label="Current pick" value={`#${selected.current_pick}`}/><Metric label="Rounds" value={String(selected.rounds)}/><Metric label="Pick clock" value={`${selected.clock_duration_seconds}s`}/></div>}
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/[.025] p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">Control boundary</p><p className="mt-3 text-sm leading-6 text-white/42">Settings lock when Draft Night opens. Pick order and player eligibility stay in League Operations. Coach selections continue through the protected live draft RPC and update every viewer in real time.</p></section>
        </aside>

        <form onSubmit={save} className="rounded-3xl border border-white/10 bg-[#071522]/55 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Official configuration</p><h2 className="mt-2 font-display text-3xl font-black uppercase">{selected?.name ?? 'Draft Night'}</h2></div><span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${editable?'border-emerald-400/25 bg-emerald-400/10 text-emerald-300':'border-white/10 bg-white/5 text-white/35'}`}>{editable?'Setup editable':'Settings locked'}</span></div>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <Field label="Rounds"><input type="number" min={1} max={20} required disabled={!editable} value={form.rounds} onChange={event=>setForm(current=>({...current,rounds:Number(event.target.value)}))} className="control"/></Field>
            <Field label="Roster limit"><input type="number" min={1} max={30} required disabled={!editable} value={form.roster_limit} onChange={event=>setForm(current=>({...current,roster_limit:Number(event.target.value)}))} className="control"/></Field>
            <Field label="Pick clock"><div className="relative"><input type="number" min={15} max={900} step={5} required disabled={!editable} value={form.clock_duration_seconds} onChange={event=>setForm(current=>({...current,clock_duration_seconds:Number(event.target.value)}))} className="control pr-20"/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-white/30">seconds</span></div></Field>
          </div>

          <div className="mt-6 rounded-2xl border border-rcl-blue/15 bg-rcl-blue/[.045] p-4"><div className="flex gap-3"><FaClock className="mt-0.5 shrink-0 text-rcl-blue"/><p className="text-xs leading-5 text-white/45">The pick clock starts from this duration for each official selection. Staff can still pause, resume or extend an open clock from League Operations.</p></div></div>

          <div className="mt-6"><label className="text-xs font-black uppercase tracking-[.16em] text-white/45">Published Draft Night rules</label><textarea disabled={!editable} value={form.rules_text} onChange={event=>setForm(current=>({...current,rules_text:event.target.value}))} maxLength={8000} rows={12} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 outline-none focus:border-rcl-orange/45 disabled:opacity-60" placeholder={'Example:\n• Eligible players must be in the official RCL draft pool.\n• Coaches may select only when their team is on the clock.\n• The roster limit is enforced automatically.\n• Commissioner rulings and clock procedures...'} /><div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/25"><span>Displayed to members inside Draft Night</span><span>{form.rules_text.length.toLocaleString()} / 8,000</span></div></div>

          {!editable && <p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-5 text-amber-100/70">This draft has already left setup. Rules and structural settings are locked to protect the live order and completed selections.</p>}

          <div className="mt-7 flex flex-wrap gap-3"><button disabled={!editable||saving} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase text-black disabled:cursor-not-allowed disabled:opacity-40"><FaFloppyDisk/>{saving?'Saving…':'Save official settings'}</button><Link href="/admin/operations" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 text-xs font-black uppercase text-white/55 hover:border-rcl-blue/35 hover:text-white">Configure pick order <FaListOl/></Link></div>
        </form>
      </div>}
    </Container>
    <style jsx>{`.control{min-height:3rem;width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.25);padding:0 .9rem;color:white;outline:none}.control:focus{border-color:rgba(255,79,22,.55)}.control:disabled{opacity:.6}`}</style>
  </main>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label><span className="text-xs font-black uppercase tracking-[.14em] text-white/40">{label}</span><div className="mt-2">{children}</div></label>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-white/25">{label}</p><p className="mt-1 truncate font-display text-lg font-black uppercase">{value}</p></div>}
