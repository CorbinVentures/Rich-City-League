'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaClockRotateLeft, FaEnvelopeOpenText, FaPaperPlane } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { LeagueRequest } from '@/types/database';

const requestCategories = ['TRADE_REQUEST', 'DNP_INQUIRY', 'SCHEDULE_CONFLICT', 'INJURY_STATUS', 'LEAVE', 'EQUIPMENT', 'REGISTRATION', 'PAYMENT', 'TEAM_CONCERN', 'CONDUCT_CONCERN', 'GENERAL'];

export default function LeagueRequestsPage() {
  const { profile, loading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [requests, setRequests] = useState<LeagueRequest[]>([]);
  const [form, setForm] = useState({ category: 'GENERAL', subject: '', description: '' });
  const [message, setMessage] = useState('');

  async function load() {
    if (!supabase || !profile) return;
    const { data, error } = await supabase.from('league_requests').select('*').eq('requester_id', profile.id).order('created_at', { ascending: false });
    if (error) setMessage('Unable to load requests.');
    else setRequests((data ?? []) as LeagueRequest[]);
  }

  useEffect(() => { void load(); }, [supabase, profile?.id]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !profile || !form.subject.trim() || !form.description.trim()) return;
    const { error } = await supabase.from('league_requests').insert({ ...form, requester_id: profile.id } as never);
    setMessage(error ? error.message : 'Request submitted to league staff.');
    if (!error) {
      setForm({ category: 'GENERAL', subject: '', description: '' });
      void load();
    }
  }

  if (loading) return <main className="min-h-screen bg-rcl-black text-white"><Container maxWidth="lg" className="py-16"><div className="h-10 w-64 animate-pulse rounded-xl bg-white/10" /><div className="mt-8 h-80 animate-pulse rounded-3xl bg-white/[.04]" /></Container></main>;
  if (!profile) return <main className="min-h-screen bg-rcl-black text-white"><Container maxWidth="lg" className="py-16"><div className="rounded-3xl border border-rcl-blue/15 bg-white/[.025] p-8 text-center"><FaEnvelopeOpenText className="mx-auto text-3xl text-rcl-blue"/><h1 className="mt-4 font-display text-3xl font-black uppercase">Sign in to access requests</h1><Link href="/auth/sign-in?next=/portal/requests" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Sign in <FaArrowRight /></Link></div></Container></main>;

  const openCount = requests.filter((request) => !['resolved', 'closed', 'denied', 'cancelled'].includes(String(request.status).toLowerCase())).length;
  const resolvedCount = requests.length - openCount;

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <ClientPageHero
      eyebrow="PRIVATE LEAGUE SUPPORT"
      title="Request"
      accent="center."
      description="Send operational questions and private league requests to authorized RCL staff without mixing them into public social channels."
      assetKey="league.cover"
      actions={<><Link href="/portal/profile" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[.04] px-4 text-xs font-black uppercase tracking-wider transition hover:border-rcl-blue/45">Portal profile</Link><Link href="/portal/scorebook" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black">Scorebook <FaArrowRight /></Link></>}
      meta={<div className="grid min-w-60 grid-cols-2 gap-3"><Summary label="OPEN" value={openCount} /><Summary label="RESOLVED" value={resolvedCount} /></div>}
    />

    <Container maxWidth="xl" className="py-10">
      {message && <p role="status" className="mb-6 rounded-2xl border border-rcl-blue/15 bg-rcl-blue/5 px-4 py-3 text-sm text-white/65">{message}</p>}
      <div className="grid gap-6 lg:grid-cols-[minmax(320px,.72fr)_minmax(0,1.28fr)]">
        <form onSubmit={submit} className="rounded-3xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#071522,#05090f)] p-6 shadow-2xl lg:sticky lg:top-24 lg:self-start">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-rcl-orange/10 text-rcl-orange"><FaPaperPlane /></span>
          <p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-rcl-orange">NEW REQUEST</p>
          <h2 className="mt-2 font-display text-2xl font-black uppercase">What do you need?</h2>
          <p className="mt-2 text-sm leading-6 text-white/40">Official records can only be changed by authorized league staff. Submit the context here so the request has a private audit trail.</p>
          <label className="mt-6 block text-xs font-black uppercase tracking-wider text-white/40">Category<select aria-label="Request category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#08111b] p-3 text-sm font-normal tracking-normal text-white outline-none focus:border-rcl-blue/50">{requestCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="mt-4 block text-xs font-black uppercase tracking-wider text-white/40">Subject<input aria-label="Subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Short summary" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-rcl-blue/50" /></label>
          <label className="mt-4 block text-xs font-black uppercase tracking-wider text-white/40">Details<textarea aria-label="Describe what you need help with" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Include the details staff will need to review this request." rows={7} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm font-normal normal-case leading-6 tracking-normal text-white outline-none focus:border-rcl-blue/50" /></label>
          <button className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black transition hover:brightness-110"><FaPaperPlane /> Submit request</button>
        </form>

        <section>
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-blue">YOUR PRIVATE HISTORY</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Request history</h2></div><FaClockRotateLeft className="text-2xl text-rcl-blue/50"/></div>
          <div className="mt-5 space-y-3">{requests.map((request) => <article key={request.id} className="rounded-2xl border border-rcl-blue/12 bg-white/[.025] p-5 transition hover:border-rcl-blue/30"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.16em] text-rcl-blue">{String(request.category).replace(/_/g, ' ')}</p><h3 className="mt-1 break-words font-display text-xl font-black uppercase">{request.subject}</h3></div><Status value={String(request.status)} /></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/45">{request.description}</p></article>)}{requests.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center"><FaEnvelopeOpenText className="mx-auto text-3xl text-rcl-blue/50"/><h3 className="mt-4 font-display text-2xl font-black uppercase">No requests yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">Once you submit an operational question, its status and history will stay organized here.</p></div>}</div>
        </section>
      </div>
    </Container>
  </main>;
}

function Summary({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-rcl-blue/20 bg-[#071522]/80 p-4 text-center"><p className="text-xs font-black uppercase tracking-[.16em] text-white/35">{label}</p><p className="mt-1 font-display text-3xl font-black">{value}</p></div>; }
function Status({ value }: { value: string }) { const normalized = value.toLowerCase(); const closed = ['resolved','closed','approved'].includes(normalized); return <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${closed ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-rcl-orange/25 bg-rcl-orange/10 text-rcl-orange'}`}>{value.replace(/_/g,' ')}</span>; }
