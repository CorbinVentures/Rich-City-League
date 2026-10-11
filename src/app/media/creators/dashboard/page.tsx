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

  useEffect(()=>{
    let mounted=true;
    async function load(){
      if(authLoading)return;
      if(!user||!db){if(mounted)setLoading(false);return;}
      const [a,t,e]=await Promise.all([
        db.from('rch_creator_accounts').select('status,created_at,terms_accepted_at').eq('profile_id',user.id).maybeSingle(),
        db.from('rch_creator_titles').select('media_id,status,created_at').eq('creator_id',user.id).limit(200),
        db.from('rch_creator_earnings').select('id,month,qualified_seconds,earned_cents,status,paid_at').eq('creator_id',user.id).order('month',{ascending:false}).limit(100),
      ]);
      if(!mounted)return;
      if(a.error||t.error||e.error)setError(a.error?.message||t.error?.message||e.error?.message);
      else {setAccount(a.data);setTitles(t.data??[]);setEarnings(e.data??[]);}
      setLoading(false);
    }
    void load();return()=>{mounted=false;};
  },[authLoading,user,db]);
  const sum=(status?:string)=>earnings.filter(e=>!status||e.status===status).reduce((v,e)=>v+Number(e.earned_cents),0);
  return <main className="min-h-screen bg-[#071522] pb-24 text-white">
    <Container maxWidth="xl" className="py-9 sm:py-12">
      <Link href="/media/creators" className="text-sm text-sky-300">← Creator program</Link>
      <p className="mt-7 text-xs font-black uppercase tracking-widest text-rcl-orange">RCH TV / Creator studio</p>
      <h1 className="mt-2 font-display text-4xl font-black uppercase">My Earnings</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">Your licensed programming, verified watch time and monthly payout history. Unverified views never generate payable earnings.</p>
      {loading?<p className="mt-8 text-sm">Loading creator account…</p>:!user?<p className="mt-8 text-sm">Sign in to view your creator finances.</p>:error?<p role="alert" className="mt-8 text-red-300">{error}</p>:!account?<div className="mt-8 rounded-2xl border border-white/10 p-6"><h2 className="text-xl font-bold">Creator earnings not activated</h2><p className="mt-3 text-sm text-white/55">Apply to the Founding RCH Creators program. Only approved members with executed agreements and licensed programming can participate.</p><Link href="/media/creators/apply" className="mt-5 inline-flex rounded-xl bg-rcl-blue px-5 py-3 text-sm font-bold text-white">Apply to create</Link></div>:<>
        <div className="mt-8 rounded-xl border border-sky-400/20 bg-sky-500/5 p-4 text-sm">Account: <b className="capitalize">{account.status}</b>. Earnings depend on written terms, eligible revenue and independently audited subscriber viewing. Automated payouts are not enabled.</div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="All-time allocated" value={money(sum())}/>
          <Stat label="Held for review" value={money(sum('held'))}/>
          <Stat label="Approved for payment" value={money(sum('approved'))}/>
          <Stat label="Recorded as paid" value={money(sum('paid'))}/>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
          <section className="rounded-2xl border border-white/10 bg-[#0C1E31] p-6"><h2 className="text-xl font-bold">Monthly earnings</h2>
            {!earnings.length?<p className="mt-5 text-sm text-white/55">No finalized, verified earnings yet. Creator revenue sharing has not begun.</p>:<div className="mt-5 space-y-3">{earnings.map(e=><div key={e.id} className="flex items-center justify-between gap-3 border-b border-white/10 py-3">
              <div><p className="font-bold">{new Date(e.month+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</p><p className="mt-1 text-xs text-white/50">{Number(e.qualified_seconds).toLocaleString()} qualified viewing seconds · <span className="capitalize">{e.status}</span></p></div><span className="text-xl font-bold">{money(Number(e.earned_cents))}</span>
            </div>)}</div>}
          </section>
          <section className="rounded-2xl border border-white/10 bg-[#0C1E31] p-6"><h2 className="text-xl font-bold">Licensed projects</h2><p className="mt-4 text-3xl font-black">{titles.filter(t=>t.status==='active').length}</p><p className="mt-1 text-xs text-white/50">Approved for eligible RCH TV distribution</p><p className="mt-5 text-xs leading-5 text-white/50">Creator agreements and content clearance are managed by RCH TV administrators. Contact RCH TV for corrections or disputes. All payouts remain subject to final reconciliation.</p></section>
        </div>
      </>}
    </Container>
  </main>;
}
function Stat({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-white/10 bg-[#0C1E31] p-5"><p className="text-xs text-white/50">{label}</p><p className="mt-3 text-2xl font-black">{value}</p></div>;}
