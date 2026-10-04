'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { NETWORK_CREDIT_LABELS, NETWORK_PARTNER_PLANS, formatNetworkPartnerPrice, type NetworkCreditType, type PaidNetworkPartnerPlanCode } from '@/lib/network-partner';
import { FaArrowRight, FaBolt, FaCircleCheck, FaCreditCard, FaCrown, FaReceipt } from 'react-icons/fa6';

type Org = { id: string; name: string; slug: string; network_tier: string };
type Membership = { organization_id: string; member_role: string; organization: Org | null };
type Subscription = { plan_code: string; status: string; provider_customer_id: string | null; current_period_end: string | null; cancel_at_period_end: boolean };
type Ledger = { credit_type: NetworkCreditType; quantity: number };

export default function NetworkBillingPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []); const db = supabase as any;
  const [memberships, setMemberships] = useState<Membership[]>([]); const [organizationId, setOrganizationId] = useState('');
  const [subscription, setSubscription] = useState<Subscription | null>(null); const [ledger, setLedger] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(''); const [message, setMessage] = useState('');

  useEffect(() => { if (!authLoading && user) void loadOrganizations(); else if (!authLoading) setLoading(false); }, [authLoading, user]);
  useEffect(() => { if (organizationId) void loadBilling(organizationId); }, [organizationId]);

  async function loadOrganizations() {
    setLoading(true);
    const { data } = await db.from('network_organization_members').select('organization_id,member_role,organization:network_organizations!organization_id(id,name,slug,network_tier)').eq('profile_id', user!.id).eq('status', 'active');
    const rows = (data ?? []).map((row: any) => ({ ...row, organization: Array.isArray(row.organization) ? row.organization[0] : row.organization }));
    setMemberships(rows); if (rows[0]?.organization_id) setOrganizationId(rows[0].organization_id); setLoading(false);
  }
  async function loadBilling(orgId: string) {
    const [subResult, ledgerResult] = await Promise.all([
      db.from('network_organization_subscriptions').select('plan_code,status,provider_customer_id,current_period_end,cancel_at_period_end').eq('organization_id', orgId).maybeSingle(),
      db.from('network_partner_credit_ledger').select('credit_type,quantity').eq('organization_id', orgId),
    ]);
    setSubscription(subResult.data ?? null); setLedger(ledgerResult.data ?? []);
  }
  const balances = new Map<NetworkCreditType, number>();
  ledger.forEach((row) => balances.set(row.credit_type, (balances.get(row.credit_type) ?? 0) + Number(row.quantity || 0)));
  const selected = memberships.find((m) => m.organization_id === organizationId)?.organization ?? null;
  const currentPlan = subscription && ['active','trialing','past_due'].includes(subscription.status) ? subscription.plan_code : (selected?.network_tier === 'amplify' || selected?.network_tier === 'premier' ? selected.network_tier : 'network');

  async function startCheckout(planCode: PaidNetworkPartnerPlanCode) {
    setBusy(planCode); setMessage('');
    const response = await fetch('/api/network/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, planCode }) });
    const payload = await response.json().catch(() => ({})); setBusy('');
    if (!response.ok) { setMessage(payload.message || payload.error || 'Unable to start checkout.'); return; }
    window.location.assign(payload.url);
  }
  async function openPortal() {
    setBusy('portal'); setMessage('');
    const response = await fetch('/api/network/billing/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId }) });
    const payload = await response.json().catch(() => ({})); setBusy('');
    if (!response.ok) { setMessage(payload.message || payload.error || 'Unable to open billing portal.'); return; }
    window.location.assign(payload.url);
  }

  if (authLoading || loading) return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-16"><p className="text-white/45">Loading partner billing…</p></Container></main>;
  if (!user) return null;
  if (!memberships.length) return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-16"><h1 className="font-display text-4xl font-black uppercase">Claim an organization first.</h1><p className="mt-4 text-white/45">Partner billing belongs to verified organization operators.</p><Link href="/organizations" className="mt-6 inline-flex text-rcl-blue">Browse organizations</Link></Container></main>;

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white"><Container maxWidth="xl" className="py-10 sm:py-14">
    <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCH Community Partner</p><h1 className="mt-2 font-display text-5xl font-black uppercase">Plans, credits & <span className="text-rcl-blue">billing.</span></h1>
    <p className="mt-4 max-w-3xl text-sm leading-6 text-white/45">Your organization keeps its own registration and operations. Paid RCH partner plans buy measurable distribution inventory, analytics and media opportunities—not basketball credibility.</p>
    <div className="mt-6 flex flex-wrap items-center gap-3"><select value={organizationId} onChange={(e)=>setOrganizationId(e.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-[#071522] px-4 text-sm">{memberships.map((m)=><option key={m.organization_id} value={m.organization_id}>{m.organization?.name ?? 'Organization'}</option>)}</select><Link href="/network/dashboard/reach" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 px-4 text-xs font-black uppercase text-rcl-blue">Open RCH Reach <FaArrowRight/></Link></div>
    {message && <p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-sm text-amber-100">{message}</p>}

    <section className="mt-8 grid gap-4 lg:grid-cols-3">{(['network','amplify','premier'] as const).map((code)=>{const plan=NETWORK_PARTNER_PLANS[code];const active=currentPlan===code;return <article key={code} className={`rounded-3xl border p-6 ${active?'border-rcl-orange/45 bg-rcl-orange/[.06]':'border-white/10 bg-white/[.025]'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">{active?'Current plan':'Partner plan'}</p><h2 className="mt-2 font-display text-3xl font-black uppercase">{plan.name}</h2></div>{active?<FaCircleCheck className="text-rcl-orange"/>:code==='premier'?<FaCrown className="text-rcl-blue"/>:<FaBolt className="text-rcl-blue"/>}</div><p className="mt-3 text-sm leading-6 text-white/45">{plan.description}</p><p className="mt-5 text-3xl font-black">{code==='network'?'Free':`${formatNetworkPartnerPrice(plan.monthlyPriceCents)}`}<span className="text-xs font-medium text-white/35">{code==='network'?'':' / month'}</span></p>{code!=='network'&&<button disabled={busy===code||active} onClick={()=>void startCheckout(code)} className="mt-5 min-h-11 w-full rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase text-black disabled:opacity-40">{active?'Active':busy===code?'Opening Checkout…':`Choose ${plan.name}`}</button>}</article>})}</section>

    <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]"><div className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><div className="flex items-center gap-3"><FaBolt className="text-rcl-orange"/><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-orange">Monthly inventory</p><h2 className="font-display text-2xl font-black uppercase">Available promotion credits</h2></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{(Object.keys(NETWORK_CREDIT_LABELS) as NetworkCreditType[]).map((type)=><div key={type} className="rounded-xl border border-white/8 bg-black/20 p-4"><b className="text-sm">{NETWORK_CREDIT_LABELS[type]}</b><p className="mt-2 text-3xl font-black text-rcl-blue">{Math.max(0, balances.get(type) ?? 0)}</p><span className="text-[10px] uppercase text-white/30">available</span></div>)}</div><Link href="/network/dashboard/boost" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-4 text-xs font-black uppercase text-black">Build a campaign <FaArrowRight/></Link></div>
      <div className="rounded-3xl border border-white/10 bg-[#071522]/55 p-6"><FaCreditCard className="text-rcl-blue"/><h2 className="mt-3 font-display text-2xl font-black uppercase">Billing status</h2><p className="mt-3 text-sm text-white/45">{subscription?`${subscription.plan_code.replace('_',' ')} · ${subscription.status}`:'No paid partner subscription.'}</p>{subscription?.current_period_end&&<p className="mt-2 text-xs text-white/30">Current period ends {new Date(subscription.current_period_end).toLocaleDateString()}.</p>}{subscription?.provider_customer_id&&<button onClick={()=>void openPortal()} disabled={busy==='portal'} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-black uppercase"> <FaReceipt/>{busy==='portal'?'Opening…':'Manage in Stripe'}</button>}<p className="mt-5 text-[11px] leading-5 text-white/30">Billing never changes REP, player ratings, rankings, stats, awards, results, badges or competitive selection.</p></div></section>
  </Container></main>;
}
