'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Row = Record<string, any>;
const field='min-h-11 w-full rounded-xl border border-white/20 bg-[#081727] px-3 text-sm text-white outline-none focus:border-sky-500';
const card='rounded-2xl border border-white/15 bg-[#0C1E31] p-5';
const button='min-h-11 rounded-xl bg-rcl-blue px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40';
const money=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
const monthLabel=(month:string)=>new Date(month+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'});
const prevMonth=()=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7);};
function formValue(form:FormData,key:string){return String(form.get(key)??'').trim();}
function errorMessage(error:unknown){return error instanceof Error?error.message:String(error);}

export default function RchCreatorCompensationAdmin(){
  const {user,profile,loading:authLoading}=useAuth();
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const authorized=Boolean(user&&profile?.role==='admin');
  const [accounts,setAccounts]=useState<Row[]>([]);
  const [profiles,setProfiles]=useState<Row[]>([]);
  const [titles,setTitles]=useState<Row[]>([]);
  const [media,setMedia]=useState<Row[]>([]);
  const [periods,setPeriods]=useState<Row[]>([]);
  const [usage,setUsage]=useState<Row[]>([]);
  const [earnings,setEarnings]=useState<Row[]>([]);
  const [transfers,setTransfers]=useState<Row[]>([]);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [paymentRefs,setPaymentRefs]=useState<Record<string,string>>({});
  const [periodChoice,setPeriodChoice]=useState(prevMonth);

  const load=useCallback(async()=>{
    if(!authorized||!db){setLoading(false);return;}
    setLoading(true);
    const queries=await Promise.all([
      db.from('rch_creator_accounts').select('*').order('created_at',{ascending:false}).limit(500),
      db.from('profiles').select('id,display_name,username').order('display_name').limit(1000),
      db.from('rch_creator_titles').select('*').limit(500),
      db.from('media').select('id,title,status,rch_tv_category').neq('rch_tv_category','general').order('created_at',{ascending:false}).limit(500),
      db.from('rch_creator_periods').select('*').order('month',{ascending:false}).limit(36),
      db.from('rch_creator_verified_usage').select('*').limit(1000),
      db.from('rch_creator_earnings').select('*').order('month',{ascending:false}).limit(1000),
      db.from('rch_creator_disbursements').select('earning_id,status,stripe_transfer_id,initiated_at').limit(1000),
    ]);
    const failure=queries.find((q:Row)=>q.error);
    if(failure)setError(failure.error.message);
    else {
      const [a,p,t,m,period,u,e,x]=queries.map((q:Row)=>q.data??[]);
      setAccounts(a);setProfiles(p);setTitles(t);setMedia(m);setPeriods(period);setUsage(u);setEarnings(e);setTransfers(x);
    }
    setLoading(false);
  },[authorized,db]);

  useEffect(()=>{if(!authLoading)void load();},[authLoading,load]);
  const profileName=(id:string)=>{const p=profiles.find(item=>item.id===id);return p?.display_name||p?.username||id.slice(0,8);};
  const mediaName=(id:string)=>media.find(item=>item.id===id)?.title||id.slice(0,8);
  const currentPeriod=periods.find(p=>p.month===periodChoice+'-01');

  async function run(action:()=>Promise<{error?:Row|null}|void>,success:string){
    if(busy||!authorized)return;
    setBusy(true);setError('');setNotice('');
    try{
      const response=await action();
      if(response&&response.error)throw new Error(response.error.message||String(response.error));
      await load();setNotice(success);
    }catch(e){setError(errorMessage(e));}
    finally{setBusy(false);}
  }

  async function addCreator(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    const profile_id=formValue(form,'profile_id'),agreement_url=formValue(form,'agreement_url');
    if(!profile_id||!agreement_url||!form.get('signed')){setError('Select a registered creator and verify their signed agreement.');return;}
    await run(()=>db.from('rch_creator_accounts').upsert({
      profile_id,status:'approved',terms_accepted_at:new Date().toISOString(),agreement_url,
    },{onConflict:'profile_id'}),'Creator compensation account approved.');
  }
  async function addTitle(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    const media_id=formValue(form,'media_id'),creator_id=formValue(form,'creator_id'),agreement_url=formValue(form,'agreement_url');
    if(!media_id||!creator_id||!agreement_url||!form.get('rights')){setError('Select a title, creator and verified rights agreement.');return;}
    await run(()=>db.from('rch_creator_titles').upsert({
      media_id,creator_id,agreement_url,status:'active',rights_verified_at:new Date().toISOString(),
    },{onConflict:'media_id'}),'Licensed creator title registered.');
  }
  async function addPeriod(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    const month=formValue(form,'month')+'-01';
    const revenue=Number(formValue(form,'net_revenue'));
    const percent=Number(formValue(form,'pool_percent'));
    if(!Number.isFinite(revenue)||revenue<0||!Number.isFinite(percent)||percent<0||percent>100){setError('Enter valid revenue and pool percentage.');return;}
    if(month>=new Date().toISOString().slice(0,7)+'-01'){setError('Only completed months may be reconciled.');return;}
    const existing=periods.find(p=>p.month===month);
    if(existing?.status==='closed'){setError('Closed months cannot be edited.');return;}
    await run(()=>db.from('rch_creator_periods').upsert({
      month,eligible_net_revenue_cents:Math.round(revenue*100),pool_rate_bps:Math.round(percent*100),
      revenue_evidence_url:formValue(form,'evidence_url'),status:'draft'
    },{onConflict:'month'}),'Monthly revenue evidence saved.');
    setPeriodChoice(month.slice(0,7));
  }
  async function addUsage(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!user)return;
    const form=new FormData(e.currentTarget);
    const month=periodChoice+'-01',seconds=Number(formValue(form,'seconds'));
    if(currentPeriod?.status!=='draft'){setError('Save an open revenue period first.');return;}
    if(!Number.isSafeInteger(seconds)||seconds<0){setError('Verified seconds must be a nonnegative whole number.');return;}
    await run(()=>db.from('rch_creator_verified_usage').upsert({
      month,media_id:formValue(form,'media_id'),qualified_seconds:seconds,
      evidence_url:formValue(form,'evidence_url'),verified_by:user.id,verified_at:new Date().toISOString(),
    },{onConflict:'month,media_id'}),'Audited title watch time saved.');
  }
  async function closePeriod(){
    if(!currentPeriod||currentPeriod.status!=='draft')return;
    if(!window.confirm('Close and permanently lock this month? Verified viewing and the creator pool will be allocated. This does NOT pay anyone.'))return;
    await run(()=>db.rpc('rch_creator_close_month',{p_month:currentPeriod.month}),'Month closed and creator earnings allocated. Payments remain held.');
  }
  async function transferViaStripe(row:Row){
    if(!window.confirm('Transfer this approved earning from the RCH Stripe balance to the creator Connect account? This does not confirm their bank has received a payout.'))return;
    await run(async()=>{
      const response=await fetch('/api/admin/rch-tv/earnings/transfer',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({earningId:row.id})
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Stripe transfer could not complete.');
    },'Stripe transfer submitted. Verify the connected account balance and bank payout separately.');
  }

  async function setPayout(row:Row,status:'approved'|'paid'){
    if(status==='paid'&&!paymentRefs[row.id]?.trim()){setError('Enter the confirmed external payment reference first.');return;}
    if(!window.confirm(status==='paid'?'Confirm the creator has already been paid outside RCH?':'Approve this held earning for separate external payment processing?'))return;
    await run(()=>db.from('rch_creator_earnings').update(status==='paid'?{
      status,payment_reference:paymentRefs[row.id].trim(),paid_at:new Date().toISOString()
    }:{status}).eq('id',row.id).eq('status',status==='paid'?'approved':'held'),'Payout record updated.');
  }

  if(authLoading||loading)return <main className="min-h-screen bg-[#071522] p-8 text-white">Loading creator finance…</main>;
  if(!authorized)return <main className="min-h-screen bg-[#071522] p-8 text-white">Administrator access required.</main>;
  const options=accounts.filter(a=>a.status==='approved');
  return <main className="min-h-screen bg-[#071522] pb-24 text-white">
    <Container maxWidth="xl" className="py-8 sm:py-12">
      <Link href="/admin/rch-tv" className="text-sm text-sky-300">← RCH TV administration</Link>
      <p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-rcl-orange">RCH TV / Creator finance</p>
      <h1 className="mt-2 font-display text-4xl font-black uppercase">Creator Compensation</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">Audited monthly revenue sharing and manual payout reconciliation. The 25% default pool is a proposal, not a guarantee. Stripe onboarding and audited admin transfers are available when correctly configured; automatic payouts remain off.</p>
      <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold">
        <span className="rounded-full bg-amber-500/15 px-4 py-2 text-amber-200">Automatic payouts OFF · Stripe transfers require server activation</span>
        <span className="rounded-full bg-sky-500/15 px-4 py-2 text-sky-200">Evidence + signed rights required</span>
      </div>
      {error&&<p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
      {notice&&<p role="status" className="mt-5 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200">{notice}</p>}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Approved creators" value={String(options.length)}/>
        <Stat label="Licensed titles" value={String(titles.filter(t=>t.status==='active').length)}/>
        <Stat label="Ledger (held + approved)" value={money(earnings.filter(e=>e.status!=='paid').reduce((s,e)=>s+Number(e.earned_cents),0))}/>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className={card}><h2 className="text-xl font-bold">1 · Creator agreement</h2><p className="my-3 text-xs text-white/55">Only add a member after verifying a signed compensation agreement. Applicants must first have RCH accounts.</p>
          <form onSubmit={addCreator} className="space-y-3">
            <label className="block text-xs">Registered profile<select required name="profile_id" className={field} defaultValue=""><option value="">Choose member</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.display_name||p.username||p.id}</option>)}</select></label>
            <label className="block text-xs">Signed agreement URL<input required name="agreement_url" type="url" className={field} placeholder="https://…" /></label>
            <label className="flex gap-2 text-xs"><input required type="checkbox" name="signed"/> I have verified the creator accepted the executed agreement.</label>
            <button disabled={busy} className={button}>Approve creator account</button>
          </form>
        </section>
        <section className={card}><h2 className="text-xl font-bold">2 · Licensed programming</h2><p className="my-3 text-xs text-white/55">Only rights-cleared RCH TV titles can receive allocations.</p>
          <form onSubmit={addTitle} className="space-y-3">
            <label className="block text-xs">Approved creator<select required name="creator_id" defaultValue="" className={field}><option value="">Choose creator</option>{options.map(a=><option key={a.profile_id} value={a.profile_id}>{profileName(a.profile_id)}</option>)}</select></label>
            <label className="block text-xs">Curated TV title<select required name="media_id" defaultValue="" className={field}><option value="">Choose title</option>{media.map(m=><option key={m.id} value={m.id}>{m.title} ({m.status})</option>)}</select></label>
            <label className="block text-xs">Rights/license URL<input required name="agreement_url" type="url" className={field} placeholder="https://…"/></label>
            <label className="flex gap-2 text-xs"><input required type="checkbox" name="rights"/> Publication and monetization rights independently verified.</label>
            <button disabled={busy} className={button}>Register licensed title</button>
          </form>
        </section>
        <section className={card}><h2 className="text-xl font-bold">3 · Revenue pool</h2><p className="my-3 text-xs text-white/55">Use verified, recognized eligible net revenue from a completed month. This must be reconciled against actual billing/refunds, not plan prices.</p>
          <form onSubmit={addPeriod} className="space-y-3">
            <label className="block text-xs">Completed month<input required type="month" name="month" defaultValue={periodChoice} max={prevMonth()} className={field}/></label>
            <label className="block text-xs">Eligible net revenue (USD)<input required name="net_revenue" type="number" step=".01" min="0" className={field} placeholder="0.00"/></label>
            <label className="block text-xs">Pool share (%) — proposed 25<input required name="pool_percent" type="number" step=".01" min="0" max="100" defaultValue="25" className={field}/></label>
            <label className="block text-xs">Revenue reconciliation evidence URL<input required type="url" name="evidence_url" className={field} placeholder="https://…"/></label>
            <button disabled={busy} className={button}>Save revenue evidence</button>
          </form>
        </section>
        <section className={card}><h2 className="text-xl font-bold">4 · Verified viewing</h2><p className="my-3 text-xs text-white/55">Use trusted stream/CDN analytics, not browser view counts. Usage must have an auditable evidence URL.</p>
          <label className="block text-xs">Reconciliation month<select value={periodChoice} onChange={e=>setPeriodChoice(e.target.value)} className={field}>{[...new Set([periodChoice,...periods.map(p=>p.month.slice(0,7))])].map(m=><option key={m} value={m}>{m}</option>)}</select></label>
          <p className="mt-2 text-xs text-white/55">{currentPeriod?currentPeriod.status:'Save revenue evidence first'}</p>
          <form onSubmit={addUsage} className="mt-4 space-y-3">
            <label className="block text-xs">Registered title<select required name="media_id" className={field} defaultValue=""><option value="">Choose title</option>{titles.filter(t=>t.status==='active').map(t=><option key={t.media_id} value={t.media_id}>{mediaName(t.media_id)} — {profileName(t.creator_id)}</option>)}</select></label>
            <label className="block text-xs">Audited eligible watch seconds<input required type="number" min="0" step="1" name="seconds" className={field}/></label>
            <label className="block text-xs">Playback evidence URL<input required name="evidence_url" type="url" className={field} placeholder="https://…"/></label>
            <button disabled={busy||currentPeriod?.status!=='draft'} className={button}>Save verified watch time</button>
          </form>
          {currentPeriod&&<div className="mt-5 border-t border-white/10 pt-5">
            <p className="text-xs text-white/50">{usage.filter(u=>u.month===currentPeriod.month).length} audited title entries · {money(Math.floor(Number(currentPeriod.eligible_net_revenue_cents)*Number(currentPeriod.pool_rate_bps)/10000))} planned creator pool</p>
            <button disabled={busy||currentPeriod.status!=='draft'} onClick={()=>void closePeriod()} className="mt-3 min-h-11 rounded-xl border border-amber-300/40 px-4 text-sm font-bold text-amber-200 disabled:opacity-40">Close and allocate month</button>
          </div>}
        </section>
      </div>
      <section className={card+' mt-8'}><h2 className="text-2xl font-bold">5 · Payout ledger</h2><p className="mt-2 text-sm text-white/60">Approve accounting records only after review. Actual funds must be sent through a verified external process; “Paid” is strictly a reconciliation entry, not a bank transfer.</p>
        <div className="mt-5 space-y-3">{!earnings.length&&<p className="text-sm text-white/50">No finalized earnings yet.</p>}
          {earnings.map(e=><article key={e.id} className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_auto]">
            <div><p className="font-bold">{profileName(e.creator_id)} · {monthLabel(e.month)}</p><p className="mt-1 text-xs text-white/50">{Number(e.qualified_seconds).toLocaleString()} qualified seconds · {e.status}</p>{e.payment_reference&&<p className="mt-1 break-all text-xs text-white/40">External ref: {e.payment_reference}</p>}{transfers.find(t=>t.earning_id===e.id)&&<p className="mt-1 text-xs text-sky-200">Stripe transfer: {transfers.find(t=>t.earning_id===e.id)?.status} · {transfers.find(t=>t.earning_id===e.id)?.stripe_transfer_id||'Investigation required'}</p>}</div>
            <div className="flex flex-wrap items-center gap-2"><b className="mr-2 text-xl">{money(Number(e.earned_cents))}</b>
              {e.status==='held'&&<button disabled={busy} className={button} onClick={()=>void setPayout(e,'approved')}>Approve</button>}
              {e.status==='approved'&&<>{!transfers.some(t=>t.earning_id===e.id)&&<button disabled={busy||!accounts.find(a=>a.profile_id===e.creator_id)?.stripe_payouts_enabled} className={button} onClick={()=>void transferViaStripe(e)}>Send via Stripe</button>}<input aria-label={'External payment reference for '+profileName(e.creator_id)} value={paymentRefs[e.id]??''} onChange={ev=>setPaymentRefs(p=>({...p,[e.id]:ev.target.value}))} placeholder="Confirmed payment reference" className={field+' max-w-64'}/><button disabled={busy||!paymentRefs[e.id]?.trim()} className={button} onClick={()=>void setPayout(e,'paid')}>Record paid</button></>}
            </div>
          </article>)}
        </div>
      </section>
      <section className={card+' mt-8'}><h2 className="text-lg font-bold">Monthly snapshots</h2>
        <div className="mt-4 space-y-2">{periods.map(p=><div key={p.month} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 py-2 text-sm"><span>{monthLabel(p.month)} · {p.status}</span><span>{money(Number(p.eligible_net_revenue_cents))} revenue · {p.pool_rate_bps/100}% creator share</span></div>)}</div>
      </section>
    </Container>
  </main>;
}
function Stat({label,value}:{label:string;value:string}){return <div className={card}><p className="text-xs text-white/55">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;}
