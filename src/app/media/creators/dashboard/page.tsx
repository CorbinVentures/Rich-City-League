'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type RecordRow=Record<string,any>;
const money=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v/100);
export default function CreatorEarningsDashboard(){
  const {user,loading:authLoading}=useAuth();
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [account,setAccount]=useState<RecordRow|null>(null);
  const [titles,setTitles]=useState<RecordRow[]>([]);
  const [earnings,setEarnings]=useState<RecordRow[]>([]);
  const [transfers,setTransfers]=useState<RecordRow[]>([]);
  const [stripeBusy,setStripeBusy]=useState(false);
  const [stripeError,setStripeError]=useState('');

  useEffect(()=>{
    let mounted=true;
    async function load(){
      if(authLoading)return;
      if(!user||!db){if(mounted)setLoading(false);return;}
      const [a,t,e,x]=await Promise.all([
        db.from('rch_creator_accounts').select('status,created_at,terms_accepted_at,stripe_connect_account_id,stripe_details_submitted,stripe_payouts_enabled').eq('profile_id',user.id).maybeSingle(),
        db.from('rch_creator_titles').select('media_id,status,created_at').eq('creator_id',user.id).limit(200),
        db.from('rch_creator_earnings').select('id,month,qualified_seconds,earned_cents,status,paid_at').eq('creator_id',user.id).order('month',{ascending:false}).limit(100),
        db.from('rch_creator_disbursements').select('earning_id,status,stripe_transfer_id').eq('creator_id',user.id).limit(200),
      ]);
      if(!mounted)return;
      if(a.error||t.error||e.error||x.error)setError(a.error?.message||t.error?.message||e.error?.message||x.error?.message);
      else {setAccount(a.data);setTitles(t.data??[]);setEarnings(e.data??[]);setTransfers(x.data??[]);}
      setLoading(false);
    }
    void load();return()=>{mounted=false;};
  },[authLoading,user,db]);
  async function connectPayout(){
    setStripeBusy(true);setStripeError('');
    try{
      const response=await fetch('/api/rch-tv/creator/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      const data=await response.json();
      if(!response.ok||!data.url)throw new Error(data.error||'Unable to begin secure payout onboarding.');
      window.location.assign(data.url);
    }catch(e){setStripeError(e instanceof Error?e.message:'Stripe onboarding failed');setStripeBusy(false);}
  }
  async function refreshPayout(){
    setStripeBusy(true);setStripeError('');
    try{
      const response=await fetch('/api/rch-tv/creator/connect',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Unable to verify payout account.');
      setAccount(prev=>prev?{...prev,stripe_connect_account_id:data.connected?'connected':prev.stripe_connect_account_id,stripe_payouts_enabled:data.payoutsEnabled??false,stripe_details_submitted:data.detailsSubmitted??false}:prev);
    }catch(e){setStripeError(e instanceof Error?e.message:'Stripe verification failed');}
    finally{setStripeBusy(false);}
  }

  const sum=(status?:string)=>earnings.filter(e=>!status||e.status===status).reduce((v,e)=>v+Number(e.earned_cents),0);
  return <main className="min-h-screen bg-[#071522] pb-24 text-white">
    <Container maxWidth="xl" className="py-9 sm:py-12">
      <Link href="/media/creators" className="text-sm text-sky-300">← Creator program</Link>
      <p className="mt-7 text-xs font-black uppercase tracking-widest text-rcl-orange">RCH TV / Creator studio</p>
      <h1 className="mt-2 font-display text-4xl font-black uppercase">My Earnings</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">Your licensed programming, verified watch time and monthly payout history. Unverified views never generate payable earnings.</p>
      {loading?<p className="mt-8 text-sm">Loading creator account…</p>:!user?<p className="mt-8 text-sm">Sign in to view your creator finances.</p>:error?<p role="alert" className="mt-8 text-red-300">{error}</p>:!account?<div className="mt-8 rounded-2xl border border-white/10 p-6"><h2 className="text-xl font-bold">Creator earnings not activated</h2><p className="mt-3 text-sm text-white/55">Apply to the Founding RCH Creators program. Only approved members with executed agreements and licensed programming can participate.</p><Link href="/media/creators/apply" className="mt-5 inline-flex rounded-xl bg-rcl-blue px-5 py-3 text-sm font-bold text-white">Apply to create</Link></div>:<>
        <div className="mt-8 rounded-xl border border-sky-400/20 bg-sky-500/5 p-4 text-sm">Account: <b className="capitalize">{account.status}</b>. Earnings depend on written terms, eligible revenue and independently audited subscriber viewing. Automated payouts are not enabled.</div>
        {account.status==='approved'&&<section className="mt-5 rounded-2xl border border-sky-500/25 bg-[#0C1E31] p-5">
          <h2 className="font-bold">Secure payout onboarding</h2>
          <p className="mt-2 text-xs leading-5 text-white/55">{account.stripe_payouts_enabled?'Your Stripe Connect account is ready for reviewed transfers. Actual bank payout confirmation is separate.':account.stripe_connect_account_id?'Stripe account linked. Complete any remaining identity or banking verification.':'Set up Stripe Express to securely verify your identity and banking details. RCH never stores your bank account numbers.'}</p>
          {stripeError&&<p role="alert" className="mt-3 text-xs text-red-300">{stripeError}</p>}
          <div className="mt-4 flex flex-wrap gap-3">{!account.stripe_payouts_enabled&&<button disabled={stripeBusy} onClick={()=>void connectPayout()} className="min-h-11 rounded-xl bg-rcl-blue px-4 text-xs font-bold text-white disabled:opacity-50">{stripeBusy?'Connecting…':account.stripe_connect_account_id?'Continue Stripe onboarding':'Connect payout account'}</button>}
          {account.stripe_connect_account_id&&<button disabled={stripeBusy} onClick={()=>void refreshPayout()} className="min-h-11 rounded-xl border border-white/25 px-4 text-xs font-bold text-white disabled:opacity-50">Refresh verification</button>}</div>
        </section>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="All-time allocated" value={money(sum())}/>
          <Stat label="Held for review" value={money(sum('held'))}/>
          <Stat label="Approved for payment" value={money(sum('approved'))}/>
          <Stat label="Recorded as paid" value={money(sum('paid'))}/>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
          <section className="rounded-2xl border border-white/10 bg-[#0C1E31] p-6"><h2 className="text-xl font-bold">Monthly earnings</h2>
            {!earnings.length?<p className="mt-5 text-sm text-white/55">No finalized, verified earnings yet. Creator revenue sharing has not begun.</p>:<div className="mt-5 space-y-3">{earnings.map(e=><div key={e.id} className="flex items-center justify-between gap-3 border-b border-white/10 py-3">
              <div><p className="font-bold">{new Date(e.month+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</p><p className="mt-1 text-xs text-white/50">{Number(e.qualified_seconds).toLocaleString()} qualified viewing seconds · <span className="capitalize">{e.status}</span> {transfers.find(t=>t.earning_id===e.id)&&' · Stripe: '+transfers.find(t=>t.earning_id===e.id)?.status}</p></div><span className="text-xl font-bold">{money(Number(e.earned_cents))}</span>
            </div>)}</div>}
          </section>
          <section className="rounded-2xl border border-white/10 bg-[#0C1E31] p-6"><h2 className="text-xl font-bold">Licensed projects</h2><p className="mt-4 text-3xl font-black">{titles.filter(t=>t.status==='active').length}</p><p className="mt-1 text-xs text-white/50">Approved for eligible RCH TV distribution</p><p className="mt-5 text-xs leading-5 text-white/50">Creator agreements and content clearance are managed by RCH TV administrators. Contact RCH TV for corrections or disputes. All payouts remain subject to final reconciliation.</p></section>
        </div>
      </>}
    </Container>
  </main>;
}
function Stat({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-white/10 bg-[#0C1E31] p-5"><p className="text-xs text-white/50">{label}</p><p className="mt-3 text-2xl font-black">{value}</p></div>;}
