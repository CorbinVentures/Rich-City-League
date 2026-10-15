'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowLeft, FaArrowRight, FaCalendarDays, FaChartLine, FaCircleCheck, FaClipboardList, FaCrown, FaGear, FaPeopleGroup, FaShieldHalved } from 'react-icons/fa6';

type EventRow = {
  id: string; title: string; description: string; event_type: string;
  starts_at: string; location: string; status: string; registration_fee_cents: number;
  registration_open: boolean; capacity: number | null; min_age: number;
};
type Registration = {
  id: string; event_id: string; profile_id: string; status: string;
  payment_status: string; fee_cents_snapshot: number; checked_in_at: string | null;
};
type RosterRow = {
  id: string; profile_id: string; display_name: string | null; username: string | null;
  status: string; payment_status: string; fee_cents_snapshot: number;
  checked_in_at: string | null; created_at: string;
};
type EventDraft = {
  title: string; description: string; event_type: string; starts_at: string; location: string;
  status: string; fee: string; registration_open: boolean; capacity: string;
};
const cleanDraft: EventDraft = { title: '', description: '', event_type: 'tryout', starts_at: '', location: '', status: 'draft', fee: '0', registration_open: false, capacity: '' };
const formatMoney = (cents: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents / 100);
const inputClass = 'mt-2 min-h-11 w-full rounded-xl border border-[#34618a] bg-[#05192b] px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff9b54] focus:ring-2 focus:ring-[#ff9b54]/20';
const dateValue = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const displayDate = (value:string) => new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'}).format(new Date(value));

export function RoyalteeCoachDashboard() {
  const { user, loading: authLoading } = useAuth();
  const db = useMemo(() => getSupabaseClient() as any, []);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<'overview'|'events'|'registrations'>('overview');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EventDraft>(cleanDraft);

  const refresh = useCallback(async () => {
    if (!db) return;
    const [eventResult,registrationResult] = await Promise.all([
      db.from('rcl_royaltee_events').select('id,title,description,event_type,starts_at,location,status,registration_fee_cents,registration_open,capacity,min_age').order('starts_at',{ascending:false}).limit(200),
      db.from('rcl_royaltee_event_registrations').select('id,event_id,profile_id,status,payment_status,fee_cents_snapshot,checked_in_at').limit(2000)
    ]);
    if (eventResult.error || registrationResult.error) {
      throw new Error(eventResult.error?.message || registrationResult.error?.message || 'Could not load Royaltee dashboard.');
    }
    setEvents(eventResult.data || []);
    setRegistrations(registrationResult.data || []);
    setSelectedEvent(current => current || eventResult.data?.[0]?.id || '');
  },[db]);

  useEffect(() => {
    if (authLoading) return;
    if (!db || !user) { setLoading(false); setAuthorized(false); return; }
    let live = true;
    void (async () => {
      try {
        const {data,error:accessError} = await db.rpc('can_manage_royaltee');
        if (accessError) throw accessError;
        if (!live) return;
        setAuthorized(data === true);
        if (data === true) await refresh();
      } catch (reason) {
        if (live) setError(reason instanceof Error ? reason.message : 'Could not check organization access.');
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  },[db,user,authLoading,refresh]);

  useEffect(() => {
    if (!authorized || !selectedEvent || !db) { setRoster([]); return; }
    let live = true;
    setRosterBusy(true);
    void db.rpc('get_royaltee_event_registration_roster',{p_event_id:selectedEvent})
      .then(({data,error:loadError}:{data:RosterRow[]|null;error:any}) => {
        if (!live) return;
        if (loadError) setError(loadError.message);
        else setRoster(data || []);
        setRosterBusy(false);
      }).catch(() => { if (live) { setError('Unable to load registrations.'); setRosterBusy(false); } });
    return () => { live = false; };
  },[db,authorized,selectedEvent,registrations]);

  const activeRegistrations = registrations.filter(row => row.status !== 'cancelled');
  const publishedCount = events.filter(row => row.status === 'published').length;
  const openCount = events.filter(row => row.status === 'published' && row.registration_open).length;
  const checkIns = activeRegistrations.filter(row => row.status === 'checked_in').length;
  const collectedCents = activeRegistrations.filter(row => row.payment_status === 'paid').reduce((total,row) => total + row.fee_cents_snapshot, 0);
  const pendingCents = activeRegistrations.filter(row => row.payment_status === 'unpaid').reduce((total,row) => total + row.fee_cents_snapshot, 0);
  const selected = events.find(row => row.id === selectedEvent);
  const registrationCount = (id:string) => activeRegistrations.filter(row => row.event_id === id).length;

  function startEdit(item: EventRow) {
    setEditingId(item.id);
    setDraft({title:item.title,description:item.description,event_type:item.event_type,starts_at:dateValue(item.starts_at),location:item.location,status:item.status,fee:(item.registration_fee_cents/100).toFixed(2),registration_open:item.registration_open,capacity:item.capacity?.toString() || ''});
    setTab('events');
  }
  function clearEdit() { setEditingId(null); setDraft(cleanDraft); }

  async function act(operation:()=>Promise<{error:any}>,success:string) {
    if (!db || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await operation();
      if (result.error) throw result.error;
      await refresh();
      setNotice(success);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Action could not be completed.'); }
    finally { setBusy(false); }
  }

  async function saveEvent(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dollars = Number(draft.fee);
    const capacity = draft.capacity.trim() ? Number(draft.capacity) : null;
    const starts = new Date(draft.starts_at);
    if (!Number.isFinite(dollars) || dollars < 0 || dollars > 10000 || !/^\d+(\.\d{1,2})?$/.test(draft.fee)) { setError('Enter a valid fee between $0 and $10,000 with at most two decimals.'); return; }
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) { setError('Capacity must be a whole number of at least one.'); return; }
    if (Number.isNaN(starts.getTime())) { setError('Enter a valid date and time.'); return; }
    const payload = {title:draft.title.trim(),description:draft.description.trim(),event_type:draft.event_type,starts_at:starts.toISOString(),location:draft.location.trim(),status:draft.status,min_age:18,registration_fee_cents:Math.round(dollars*100),registration_open:draft.registration_open,capacity,updated_at:new Date().toISOString()};
    await act(() => editingId
      ? db.from('rcl_royaltee_events').update(payload).eq('id',editingId)
      : db.from('rcl_royaltee_events').insert({...payload,created_by:user?.id}), editingId ? 'Event updated.' : 'Adult-only event created.');
    // Retain form values on failed save; clear on successful refresh is handled manually below.
  }

  async function updateRegistration(item:RosterRow,change:'status'|'payment_status',value:string) {
    if (busy) return;
    await act(() => db.rpc('manage_royaltee_event_registration',{
      p_registration_id:item.id,
      p_status:change === 'status' ? value : null,
      p_payment_status:change === 'payment_status' ? value : null
    }), 'Registration updated.');
  }

  return <main className="min-h-screen bg-[#030b16] pb-24 text-[#f6faff]">
    <header className="border-b border-[#28527e] bg-[radial-gradient(ellipse_at_80%_5%,rgba(25,145,250,.23),transparent_49%),linear-gradient(135deg,#0d3256,#040b15)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-7 sm:py-14">
        <Link href="/league/royaltee" className="inline-flex items-center gap-2 text-xs font-extrabold text-[#a9ddff]"><FaArrowLeft/> Royaltee public site</Link>
        <div className="mt-7 flex flex-wrap items-end justify-between gap-6">
          <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-[#ffb17d]"><FaCrown/> Royaltee Steppas & Cheerleading · Authorized Staff</p>
            <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">Cheerleading <span className="text-[#ff954c]">Command HQ</span></h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c0d9ef]">Your dedicated administration workspace for adult (18+) Royaltee programs, events, prices and registration operations.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#568bb4] bg-[#103454] px-4 py-2 text-xs font-black text-[#c8edff]"><FaShieldHalved/> Organization-scoped admin</span>
        </div>
      </div>
    </header>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-7">
      {authLoading || loading ? <p className="rounded-2xl border border-[#335c81] bg-[#0b2741] p-6">Checking staff authorization…</p>
      : !user ? <section className="rounded-2xl border border-[#315c85] bg-[#0b263f] p-7"><h2 className="text-2xl font-black">Sign in to open Royaltee HQ</h2><p className="mt-3 text-[#c0d9ef]">This dashboard is restricted to approved Royaltee leadership and RCH administrators.</p><Link href="/auth/sign-in?next=/league/royaltee/dashboard" className="mt-5 inline-flex rounded-xl bg-[#ff9b55] px-5 py-3 font-black text-[#130d08]">Sign in</Link></section>
      : !authorized ? <section className="rounded-2xl border border-[#8b653d] bg-[#281c15] p-7"><FaShieldHalved className="text-3xl text-[#ffbc83]"/><h2 className="mt-3 text-2xl font-black">Royaltee admin access required</h2><p className="mt-3 text-[#efc6a7]">An active approved Cheerleading Coach assignment or approved Royaltee owner/manager membership is required. This permission never grants league-wide admin access.</p><Link href="/staff" className="mt-5 inline-block rounded-xl border border-[#c99160] px-5 py-3 font-bold">View staff status</Link></section>
      : <div className="space-y-7">
        {error && <p role="alert" className="rounded-xl border border-red-400/50 bg-red-950/40 px-5 py-4 text-sm text-red-100">{error}</p>}
        {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-5 py-4 text-sm text-emerald-100"><FaCircleCheck/>{notice}</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {label:'Published events',value:String(publishedCount),detail:openCount+' accepting signups',icon:<FaCalendarDays/>},
            {label:'Active registrations',value:String(activeRegistrations.length),detail:checkIns+' checked in',icon:<FaPeopleGroup/>},
            {label:'Recorded as paid',value:formatMoney(collectedCents),detail:'Administrative record only',icon:<FaChartLine/>},
            {label:'Open fee balances',value:formatMoney(pendingCents),detail:'No payment processed by RCH',icon:<FaClipboardList/>}
          ].map(stat => <section key={stat.label} className="rounded-2xl border border-[#2b5579] bg-[linear-gradient(150deg,#123757,#08192e)] p-5"><div className="flex items-center justify-between gap-3 text-sm text-[#9bd5ff]"><span className="text-xs font-black uppercase tracking-wider">{stat.label}</span>{stat.icon}</div><p className="mt-5 text-3xl font-black tabular-nums">{stat.value}</p><p className="mt-2 text-xs text-[#b5cee3]">{stat.detail}</p></section>)}
        </div>
        <nav aria-label="Cheerleading dashboard areas" className="flex flex-wrap gap-2 rounded-2xl border border-[#2a5274] bg-[#0a2139] p-2">
          {([{key:'overview',label:'Overview',icon:<FaChartLine/>},{key:'events',label:'Events & fees',icon:<FaCalendarDays/>},{key:'registrations',label:'Registration desk',icon:<FaClipboardList/>}] as const).map(item =>
          <button key={item.key} type="button" onClick={() => setTab(item.key)} aria-current={tab===item.key?'page':undefined} className={'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition '+(tab===item.key?'bg-[#ff9b51] text-[#160d06]':'text-[#c4ddec] hover:bg-[#174167]')}>{item.icon}{item.label}</button>)}
          <Link href="/league/royaltee/manage" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black text-[#c4ddec] hover:bg-[#174167]"><FaGear/> Site content & performer approvals <FaArrowRight/></Link>
        </nav>

        {tab==='overview' && <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <section className="rounded-2xl border border-[#305b80] bg-[#0b263d] p-6"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-widest text-[#ffae72]">Operations timeline</p><h2 className="mt-2 text-2xl font-black">Upcoming Royaltee Events</h2></div><button type="button" onClick={()=>{clearEdit();setTab('events');}} className="rounded-lg bg-[#ff9b51] px-4 py-2 text-xs font-black text-[#160d06]">New event</button></div>
            <div className="mt-5 space-y-3">{events.filter(e => e.status!=='cancelled').sort((a,b)=>a.starts_at.localeCompare(b.starts_at)).slice(0,8).map(item=><article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#2b5374] bg-[#061b2e] p-4"><div><h3 className="font-black">{item.title}</h3><p className="mt-1 text-xs text-[#b9d8ee]">{displayDate(item.starts_at)} · {item.status} · {formatMoney(item.registration_fee_cents)}</p></div><div className="flex items-center gap-3"><span className="text-xs text-[#bcd8eb]">{registrationCount(item.id)} registrations</span><button type="button" onClick={()=>startEdit(item)} className="rounded-lg border border-[#649ac2] px-3 py-2 text-xs font-black">Manage</button></div></article>)}{!events.length&&<p className="rounded-xl border border-dashed border-[#39688c] p-6 text-[#c2daea]">No events yet. Create your first adult cheer or step program event.</p>}</div>
          </section>
          <aside className="space-y-4"><section className="rounded-2xl border border-[#305b80] bg-[#0b263d] p-6"><p className="text-xs font-black uppercase tracking-widest text-[#ffae72]">Website tools</p><h2 className="mt-2 text-2xl font-black">Manage the Royaltee site</h2><p className="mt-3 text-sm leading-7 text-[#b9d4e9]">Update the program headline, contact details, adult recruitment status, and review cheer and step identity requests.</p><Link href="/league/royaltee/manage" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#ff9850] px-4 py-3 text-xs font-black text-black">Open content manager <FaArrowRight/></Link></section>
            <section className="rounded-2xl border border-[#305b80] bg-[#0b263d] p-6"><p className="text-xs font-black uppercase tracking-widest text-[#ffae72]">Safety perimeter</p><h3 className="mt-2 text-lg font-black">Royaltee operations only</h3><p className="mt-3 text-sm leading-7 text-[#b9d4e9]">This dashboard never exposes basketball finances, franchise tools, site-wide user roles or Royaltee youth records. RCH registration eligibility is 18+.</p></section>
          </aside>
        </div>}

        {tab==='events' && <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <form onSubmit={(e)=>void saveEvent(e)} className="rounded-2xl border border-[#305b80] bg-[#0b263d] p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-[#ffad74]">Program calendar / adult 18+</p><h2 className="mt-2 text-2xl font-black">{editingId?'Edit event':'Create an event'}</h2></div>{editingId&&<button type="button" onClick={clearEdit} className="text-xs font-black text-[#9dd6ff]">Cancel edit</button>}</div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-black text-[#d3e8f8] sm:col-span-2">Event title<input required minLength={3} maxLength={160} className={inputClass} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
              <label className="text-xs font-black text-[#d3e8f8]">Event type<select className={inputClass} value={draft.event_type} onChange={e=>setDraft({...draft,event_type:e.target.value})}><option value="tryout">Adult tryout</option><option value="rehearsal">Rehearsal</option><option value="game_day">Game-day cheer</option><option value="performance">Performance</option><option value="community">Community appearance</option></select></label>
              <label className="text-xs font-black text-[#d3e8f8]">Date and time<input required type="datetime-local" className={inputClass} value={draft.starts_at} onChange={e=>setDraft({...draft,starts_at:e.target.value})}/></label>
              <label className="text-xs font-black text-[#d3e8f8]">Registration fee ($)<input required type="number" inputMode="decimal" step="0.01" min="0" max="10000" className={inputClass} value={draft.fee} onChange={e=>setDraft({...draft,fee:e.target.value})}/></label>
              <label className="text-xs font-black text-[#d3e8f8]">Capacity (optional)<input type="number" min="1" step="1" className={inputClass} placeholder="Unlimited" value={draft.capacity} onChange={e=>setDraft({...draft,capacity:e.target.value})}/></label>
              <label className="text-xs font-black text-[#d3e8f8] sm:col-span-2">Location<input maxLength={180} className={inputClass} value={draft.location} onChange={e=>setDraft({...draft,location:e.target.value})}/></label>
              <label className="text-xs font-black text-[#d3e8f8] sm:col-span-2">Description<textarea maxLength={1500} rows={4} className={inputClass} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
              <label className="text-xs font-black text-[#d3e8f8]">Visibility<select className={inputClass} value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="draft">Draft only</option><option value="published">Published / Public</option><option value="cancelled">Cancelled</option></select></label>
              <label className="flex items-center gap-3 self-end rounded-xl border border-[#356286] bg-[#071a2c] px-4 py-3 text-xs font-black text-[#e5f4ff]"><input className="h-5 w-5 accent-[#ff9a51]" type="checkbox" checked={draft.registration_open} onChange={e=>setDraft({...draft,registration_open:e.target.checked})}/> Accept adult registrations</label>
            </div>
            <p className="mt-4 text-xs leading-6 text-[#b7d1e4]">Fees are advertised and tracked, not charged through RCH. Payment status is a coach-entered administrative record; no card or banking information is collected.</p>
            <button disabled={busy} className="mt-5 min-h-12 rounded-xl bg-[#ff9b54] px-6 text-sm font-black text-[#160c04] disabled:opacity-50">{busy?'Saving…':editingId?'Save event changes':'Create Royaltee event'}</button>
          </form>
          <section className="rounded-2xl border border-[#305b80] bg-[#0b263d] p-6"><h2 className="text-2xl font-black">Manage events</h2><p className="mt-2 text-sm text-[#bad5e8]">Select an event to adjust dates, fees, capacity, publishing and registrations.</p><div className="mt-5 space-y-3">{events.map(item=><article key={item.id} className="rounded-xl border border-[#315b7d] bg-[#061b2c] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{item.title}</h3><p className="mt-1 text-xs leading-6 text-[#b7d8ed]">{displayDate(item.starts_at)} · {item.status}</p></div><span className="rounded-lg bg-[#17486c] px-2.5 py-1 text-xs font-black text-[#b5e4ff]">{formatMoney(item.registration_fee_cents)}</span></div><p className="mt-3 text-xs text-[#bed7eb]">{registrationCount(item.id)} registrations · {item.capacity===null?'Open capacity':item.capacity+' spots'} · {item.registration_open?'Registration open':'Registration closed'}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>startEdit(item)} className="rounded-lg border border-[#649ac2] px-3 py-2 text-xs font-black">Edit event</button><button type="button" onClick={()=>{setSelectedEvent(item.id);setTab('registrations');}} className="rounded-lg bg-[#17496e] px-3 py-2 text-xs font-black">View registrations</button></div></article>)}{!events.length&&<p className="text-sm text-[#bad6ec]">Your Royaltee event list is empty.</p>}</div></section>
        </div>}

        {tab==='registrations' && <section className="rounded-2xl border border-[#305b80] bg-[#0b263d] p-6">
          <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-widest text-[#ffae75]">Adult registration records</p><h2 className="mt-2 text-2xl font-black">Registration & attendance desk</h2><p className="mt-2 text-sm text-[#b6d1e7]">Review signups, mark check-ins and record payment received or waived. No youth records are included.</p></div>
            <label className="min-w-[230px] text-xs font-black text-[#d5eafd]">Event<select className={inputClass} value={selectedEvent} onChange={e=>setSelectedEvent(e.target.value)}>{events.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
          {selected&&<div className="mt-5 flex flex-wrap gap-3 text-xs font-black text-[#c3e2f5]"><span className="rounded-lg border border-[#356c97] px-3 py-2">{registrationCount(selected.id)} registrations</span><span className="rounded-lg border border-[#356c97] px-3 py-2">{formatMoney(selected.registration_fee_cents)} advertised fee</span><span className="rounded-lg border border-[#356c97] px-3 py-2">{selected.capacity===null?'No capacity limit':selected.capacity+' maximum participants'}</span></div>}
          <div className="mt-6 overflow-x-auto">{rosterBusy?<p className="py-6 text-sm text-[#c5deef]">Loading registrations…</p>:roster.length?<table className="w-full min-w-[710px] text-left text-sm"><thead><tr className="border-b border-[#38658a] text-xs uppercase tracking-wider text-[#a4d6f8]"><th className="p-3">Member</th><th className="p-3">Registration</th><th className="p-3">Payment record</th><th className="p-3">Fee at signup</th><th className="p-3">Submitted</th></tr></thead><tbody>{roster.map(item=><tr key={item.id} className="border-b border-[#234762]"><td className="p-3"><Link href={'/social/profile/'+item.profile_id} className="font-black text-[#a8ddff]">{item.display_name||item.username||'RCH member'}</Link><p className="mt-1 text-xs text-[#94bcd7]">{item.username?'@'+item.username:''}</p></td><td className="p-3"><select aria-label="Registration status" disabled={busy} value={item.status} onChange={e=>void updateRegistration(item,'status',e.target.value)} className="rounded-lg border border-[#42739b] bg-[#061a2c] px-2 py-2 text-xs font-bold text-white"><option value="registered">Registered</option><option value="checked_in">Checked in</option><option value="cancelled">Cancelled</option></select></td><td className="p-3"><select aria-label="Payment record" disabled={busy} value={item.payment_status} onChange={e=>void updateRegistration(item,'payment_status',e.target.value)} className="rounded-lg border border-[#42739b] bg-[#061a2c] px-2 py-2 text-xs font-bold text-white"><option value="unpaid">Unpaid</option><option value="paid">Paid (recorded)</option><option value="waived">Waived</option></select></td><td className="p-3 tabular-nums">{formatMoney(item.fee_cents_snapshot)}</td><td className="p-3 text-xs text-[#b9d5e9]">{displayDate(item.created_at)}</td></tr>)}</tbody></table>:<p className="rounded-xl border border-dashed border-[#38678c] px-4 py-8 text-center text-sm text-[#c1dcee]">{selected?'No registrations yet for this event.':'Create an event first to manage signups.'}</p>}</div>
        </section>}
      </div>}
    </div>
  </main>;
}
