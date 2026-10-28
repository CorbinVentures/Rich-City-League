'use client';

import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {Container} from '@/components/Container';
import {RCH_SITE_PLANS,type RchSiteBillingInterval,type RchSitePlanTier} from '@/lib/rch-sites-plans';

type Org={id:string;name:string;eligible:boolean};
type Billing={organization:{id:string;name:string};
  subscription:{tier:RchSitePlanTier;status:string;interval:string|null;
    currentPeriodEnd:string|null;cancelAtPeriodEnd:boolean;canManage:boolean}};
const plans=['amateur','professional'] as const;
export default function RchSitesBillingPage(){
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [selected,setSelected]=useState('');
  const [billing,setBilling]=useState<Billing|null>(null);
  const [interval,setInterval]=useState<RchSiteBillingInterval>('monthly');
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    let open=true;
    void fetch('/api/rch-sites',{cache:'no-store'}).then(async r=>{
      const result=await r.json();
      if(!r.ok)throw Error(result.error||'Could not load organizations.');
      if(!open)return;
      const list=(result.organizations||[]) as Org[];
      setOrgs(list.filter(org=>org.eligible));
      setSelected(current=>current||list.find(org=>org.eligible)?.id||'');
    }).catch(e=>{if(open)setError(e instanceof Error?e.message:'Unable to load websites.');})
      .finally(()=>{if(open)setLoaded(true)});
    return()=>{open=false;};
  },[]);
  const refresh=useCallback(async(id:string)=>{
    if(!id)return;
    setError('');setBilling(null);
    try{
      const r=await fetch('/api/rch-sites/billing/status?organizationId='+encodeURIComponent(id),{cache:'no-store'});
      const data=await r.json();
      if(!r.ok)throw Error(data.error||'Cannot read billing.');
      setBilling(data as Billing);
    }catch(e){setError(e instanceof Error?e.message:'Unable to load billing.');}
  },[]);
  useEffect(()=>{void refresh(selected);},[selected,refresh]);
  async function action(kind:'checkout'|'portal',tier?:typeof plans[number]){
    if(!selected||busy)return;
    setBusy(kind);setError('');
    try{
      const r=await fetch('/api/rch-sites/billing/'+kind,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({organizationId:selected,...(tier?{tier,interval}:{})})
      });
      const body=await r.json();
      if(!r.ok)throw Error(body.message||body.error||'Billing is temporarily unavailable.');
      if(typeof body.url!=='string')throw Error('Billing destination is unavailable.');
      const u=new URL(body.url);
      if(u.protocol!=='https:'||!(u.hostname==='stripe.com'||u.hostname.endsWith('.stripe.com')))
        throw Error('Invalid billing destination.');
      window.location.assign(u.toString());
    }catch(e){setError(e instanceof Error?e.message:'Unable to open billing.');setBusy('');}
  }
  const sub=billing?.subscription;
  return <main className="min-h-screen bg-[#071522] py-12 text-white">
    <Container maxWidth="xl">
      <Link className="text-sm font-bold text-sky-300" href="/network/dashboard/sites">← Website Studio</Link>
      <p className="mt-9 text-xs font-black uppercase tracking-[.2em] text-sky-300">RCH Sites · Billing</p>
      <h1 className="mt-3 font-display text-4xl font-black uppercase">Your website plan</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">Your website membership is separate from RCH Network advertising and your organization&apos;s own PayPal Business payments.</p>
      {!loaded?<p role="status" className="mt-7">Loading organizations…</p>:orgs.length===0?
        <p className="mt-7 rounded-xl border border-white/20 p-5">A verified and claimed basketball organization is required to manage website billing.</p>:
        <>
          <label className="mt-8 block max-w-lg text-sm font-semibold">Your organization
            <select value={selected} onChange={e=>setSelected(e.target.value)}
              className="mt-2 block min-h-12 w-full rounded-xl border border-white/25 bg-[#162b3c] p-3">
              {orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          {sub&&<section className="mt-6 rounded-2xl border border-sky-400/30 bg-sky-400/[.05] p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-300">Current website plan</p>
            <p className="mt-2 text-2xl font-black">{RCH_SITE_PLANS[sub.tier]?.name||'Free'} <span className="text-sm font-normal text-white/60">· {sub.status==='none'?'Free':sub.status.replace('_',' ')}</span></p>
            {sub.currentPeriodEnd&&<p className="mt-2 text-xs text-white/60">{sub.cancelAtPeriodEnd?'Access scheduled to end':'Current billing period ends'} {new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>}
            {sub.canManage&&<button type="button" disabled={!!busy} onClick={()=>void action('portal')}
              className="mt-5 min-h-12 rounded-xl border border-sky-400/50 px-5 text-sm font-black disabled:opacity-50">
              Manage payments, plan or cancellation
            </button>}
          </section>}
          <div className="mt-9 flex gap-2" role="group" aria-label="Billing interval">
            {(['monthly','annual'] as const).map(v=><button key={v} type="button" onClick={()=>setInterval(v)}
              aria-pressed={interval===v} className={'min-h-11 rounded-xl border px-5 text-sm font-bold '+(interval===v?'border-sky-400 bg-sky-400 text-[#071522]':'border-white/20 text-white/70')}>
              {v==='monthly'?'Monthly':'Annual · save 2 months'}
            </button>)}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/20 p-6">
              <h2 className="text-lg font-black">Free</h2><p className="mt-2 text-3xl font-black">$0</p>
              <p className="mt-5 text-sm leading-6 text-white/60">Start designing at no cost. Organization verification is required to publish.</p>
            </div>
            {plans.map(tier=><div key={tier} className="rounded-2xl border border-sky-400/30 bg-sky-400/[.05] p-6">
              <h2 className="text-lg font-black">{RCH_SITE_PLANS[tier].name}</h2>
              <p className="mt-2 text-3xl font-black">
                ${interval==='annual'?RCH_SITE_PLANS[tier].proposedAnnualUsd:RCH_SITE_PLANS[tier].proposedMonthlyUsd}
                <span className="text-sm font-normal text-white/60">/{interval==='annual'?'year':'month'}</span>
              </p>
              <p className="mt-5 text-sm leading-6 text-white/60">Premium website plan. Additional features roll out as they become available; check the feature list before subscribing.</p>
              <button type="button" disabled={!!busy||(!sub?true:sub.status!=='none'&&sub.canManage)} onClick={()=>void action('checkout',tier)}
                className="mt-6 min-h-12 w-full rounded-xl bg-sky-400 px-4 text-sm font-black text-[#071522] disabled:cursor-not-allowed disabled:opacity-40">
                {sub?.canManage&&sub.status!=='none'?'Manage existing plan':busy?'Opening checkout…':'Choose '+RCH_SITE_PLANS[tier].name}
              </button>
            </div>)}
          </div>
          {error&&<p role="alert" className="mt-6 rounded-xl border border-rose-400/40 p-4 text-sm text-rose-200">{error}</p>}
          <p className="mt-7 text-xs leading-6 text-white/55">Paid checkout is enabled only after RCH completes billing validation. Selecting a plan cannot charge you until you confirm payment on Stripe. Founder pricing and add-ons are not yet available.</p>
        </>}
    </Container>
  </main>;
}
