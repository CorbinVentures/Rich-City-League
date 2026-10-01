'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaCalendarDays, FaCircleCheck, FaCreditCard, FaShieldHalved } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { MEMBERSHIP_PLANS, formatMembershipPrice, isMembershipPlanCode, type MembershipBillingInterval, type MembershipPlanCode } from '@/lib/membership';

type Subscription = {
  plan_code: string;
  status: string;
  billing_interval: string;
  provider_customer_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
};

export default function AccountMembershipPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(true), []);
  const db = supabase as any;
  const [planCode, setPlanCode] = useState<MembershipPlanCode>('free');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [interval, setInterval] = useState<MembershipBillingInterval>('annual');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!db || !user) { setLoading(false); return; }
    setLoading(true);
    const [{ data: current }, { data: row }] = await Promise.all([
      db.rpc('current_membership_plan'),
      db.from('member_subscriptions').select('plan_code,status,billing_interval,provider_customer_id,current_period_end,cancel_at_period_end,trial_end').eq('user_id', user.id).maybeSingle(),
    ]);
    setPlanCode(isMembershipPlanCode(current) ? current : 'free');
    setSubscription((row ?? null) as Subscription | null);
    if (row?.billing_interval === 'monthly' || row?.billing_interval === 'annual') setInterval(row.billing_interval);
    setLoading(false);
  }, [db, user]);

  useEffect(() => { if (!authLoading) void load(); }, [authLoading, load]);

  async function checkout(target: Exclude<MembershipPlanCode, 'free'>) {
    if (busy) return;
    setBusy(target); setError(''); setNotice('');
    try {
      const response = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planCode: target, interval }) });
      const payload = await response.json();
      if (response.status === 409 && payload.error === 'manage_existing') {
        setError('You already have an active paid membership. Use Manage billing to switch or cancel it safely.');
      } else if (!response.ok) setError(payload.message || payload.error || 'Unable to start checkout.');
      else if (payload.url) window.location.assign(payload.url);
    } catch { setError('Unable to connect to RCL billing.'); }
    setBusy('');
  }

  async function portal() {
    if (busy) return;
    setBusy('portal'); setError(''); setNotice('');
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) setError(payload.error || 'Unable to open billing management.');
      else if (payload.url) window.location.assign(payload.url);
    } catch { setError('Unable to connect to billing management.'); }
    setBusy('');
  }

  const current = MEMBERSHIP_PLANS[planCode];
  const paid = planCode !== 'free' && subscription && ['active','trialing'].includes(subscription.status);
  const periodLabel = subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;

  return <main className="min-h-screen bg-[#03070d] pb-28 text-white">
    <section className="border-b border-white/10 bg-[radial-gradient(circle_at_80%_5%,rgba(249,115,22,.16),transparent_30%),#050a10] py-12">
      <Container maxWidth="lg"><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-orange">Account · Membership</p><h1 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">Your RCL membership</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/50">Choose the tools that make RCL more useful to you. Your REP, ratings, rankings and competitive achievements are never for sale.</p></Container>
    </section>
    <Container maxWidth="lg" className="py-9">
      {(loading || authLoading) && <div className="h-48 animate-pulse rounded-3xl border border-white/10 bg-white/[.02]" />}
      {!loading && !authLoading && <>
        {notice&&<div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.05] p-4 text-sm text-emerald-100">{notice}</div>}
        {error&&<div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/[.05] p-4 text-sm text-red-100">{error}</div>}

        <section className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/55 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-rcl-blue">Current membership</p><h2 className="mt-2 font-display text-4xl font-black uppercase">{current.name}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/45">{current.tagline}</p></div><div className="text-left sm:text-right"><p className="text-[10px] font-black uppercase tracking-wider text-white/30">Status</p><p className="mt-1 font-black uppercase text-rcl-orange">{subscription?.status || 'Free member'}</p>{periodLabel&&<p className="mt-1 text-xs text-white/35">{subscription?.cancel_at_period_end?'Access ends':'Next period'} {periodLabel}</p>}</div></div>
          <div className="mt-6 flex flex-wrap gap-3">{paid&&subscription?.provider_customer_id?<button onClick={portal} disabled={Boolean(busy)} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black disabled:opacity-50"><FaCreditCard /> {busy==='portal'?'Opening…':'Manage billing'}</button>:null}<Link href="/my-hoops" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-5 text-xs font-black uppercase tracking-wider">Open My Hoops <FaArrowRight /></Link></div>
        </section>

        {!paid&&<section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Upgrade</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Choose how much RCL should do for you.</h2></div><div className="inline-flex rounded-xl border border-white/10 bg-black/30 p-1"><button onClick={()=>setInterval('monthly')} className={`rounded-lg px-4 py-2 text-xs font-black uppercase ${interval==='monthly'?'bg-white text-black':'text-white/45'}`}>Monthly</button><button onClick={()=>setInterval('annual')} className={`rounded-lg px-4 py-2 text-xs font-black uppercase ${interval==='annual'?'bg-white text-black':'text-white/45'}`}>Annual</button></div></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">{(['rcl_plus','all_access'] as const).map((code)=>{const plan=MEMBERSHIP_PLANS[code];const price=interval==='annual'?plan.annualPriceCents:plan.monthlyPriceCents;return <article key={code} className={`rounded-3xl border p-6 ${code==='rcl_plus'?'border-rcl-orange/35 bg-rcl-orange/[.035]':'border-amber-300/25 bg-amber-300/[.025]'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">{plan.name}</p><h3 className="mt-2 font-display text-2xl font-black uppercase">{plan.tagline}</h3></div><span className="font-display text-2xl font-black">{formatMembershipPrice(price)}</span></div><p className="mt-3 text-xs text-white/35">{interval==='annual'?'per year':'per month'}</p><div className="mt-5 space-y-2">{plan.benefits.slice(0,6).map((benefit)=><p key={benefit} className="flex gap-2 text-sm leading-5 text-white/60"><FaCircleCheck className="mt-0.5 shrink-0 text-rcl-orange"/>{benefit}</p>)}</div><button onClick={()=>checkout(code)} disabled={Boolean(busy)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black disabled:opacity-50">{busy===code?'Opening checkout…':`Choose ${plan.shortName}`} <FaArrowRight /></button></article>})}</div>
        </section>}

        {paid&&<section className="mt-8 grid gap-4 md:grid-cols-3"><article className="rounded-2xl border border-white/10 bg-white/[.02] p-5"><FaCalendarDays className="text-rcl-blue"/><p className="mt-4 text-xs font-black uppercase">Calendar export</p><p className="mt-2 text-xs leading-5 text-white/40">Your RCL+ calendar can combine saved and personalized basketball activity.</p></article><article className="rounded-2xl border border-white/10 bg-white/[.02] p-5"><FaShieldHalved className="text-emerald-300"/><p className="mt-4 text-xs font-black uppercase">Earned stays earned</p><p className="mt-2 text-xs leading-5 text-white/40">Membership never changes REP, rankings, stats, awards or player ratings.</p></article><article className="rounded-2xl border border-white/10 bg-white/[.02] p-5"><FaCreditCard className="text-rcl-orange"/><p className="mt-4 text-xs font-black uppercase">Billing control</p><p className="mt-2 text-xs leading-5 text-white/40">Stripe billing management handles payment methods, invoices and cancellation when enabled.</p></article></section>}
      </>}
    </Container>
  </main>;
}
