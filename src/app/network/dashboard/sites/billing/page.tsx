'use client';

import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {Container} from '@/components/Container';
import {RCH_SITE_PLANS,type RchSiteBillingInterval} from '@/lib/rch-sites-plans';
import {FaArrowLeft,FaCreditCard,FaLock,FaArrowRight} from 'react-icons/fa6';

type Organization={id:string;name:string;eligible:boolean;member_role:string};
type Subscription={tier:string;status:string;interval:string|null;currentPeriodEnd:string|null;cancelAtPeriodEnd:boolean};
type Billing={available:boolean;subscription:Subscription};
const levels=['amateur','professional'] as const;
type PaidTier=(typeof levels)[number];
type CheckoutReview={organizationId:string;tier:PaidTier;interval:RchSiteBillingInterval};

export default function RchSitesBillingPage(){
  const {user,loading:authLoading}=useAuth();
  const [organizations,setOrganizations]=useState<Organization[]>([]);
  const [selected,setSelected]=useState('');
  const [billing,setBilling]=useState<Billing|null>(null);
  const [interval,setInterval]=useState<RchSiteBillingInterval>('monthly');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [review,setReview]=useState<CheckoutReview|null>(null);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{
    if(authLoading)return;
    if(!user){setLoading(false);return;}
    let active=true;
    void fetch('/api/rch-sites',{cache:'no-store'}).then(async r=>{
      const payload=await r.json();
      if(!r.ok)throw Error(payload.error||'Could not load your organizations.');
      if(!active)return;
      const eligible=(payload.organizations||[]).filter((org:Organization)=>
        org.eligible&&['owner','manager'].includes(org.member_role));
      setOrganizations(eligible);
      setSelected(eligible[0]?.id||'');
    }).catch(err=>{if(active)setError(err instanceof Error?err.message:'Unable to load organizations.');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[authLoading,user]);

  const refresh=useCallback(async(id:string)=>{
    if(!id)return;
    const response=await fetch('/api/rch-sites/billing/checkout?organizationId='+encodeURIComponent(id),{cache:'no-store'});
    const payload=await response.json();
    if(!response.ok)throw Error(payload.error||'Could not read website billing.');
    setBilling(payload);
  },[]);
  useEffect(()=>{
    if(!selected){setBilling(null);return;}
    let active=true;
    setBilling(null);setError('');
    void refresh(selected).catch(err=>{if(active)setError(err instanceof Error?err.message:'Cannot load subscription.');});
    return()=>{active=false;};
  },[selected,refresh]);

  const selectedOrganization=organizations.find(org=>org.id===selected);
  const hasExistingSubscription=Boolean(billing?.subscription&&
    !['none','canceled'].includes(billing.subscription.status));
  const currentTier=billing?.subscription&&
    ['active','past_due'].includes(billing.subscription.status)?
    billing.subscription.tier:'free';
  const matchingReview=review?.organizationId===selected&&review.interval===interval?review:null;

  async function act(action:'portal'|'amateur'|'professional'){
    if(!selected||busy)return;
    if(action!=='portal'&&(!matchingReview||matchingReview.tier!==action||
      !billing?.available||hasExistingSubscription)){
      setError('Review the organization, plan and billing period before continuing.');
      return;
    }
    setBusy(action);setError('');setMessage('');
    const endpoint=action==='portal'?'/api/rch-sites/billing/portal':'/api/rch-sites/billing/checkout';
    try{
      const result=await fetch(endpoint,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(action==='portal'?{organizationId:selected}:{
          organizationId:matchingReview!.organizationId,
          tier:matchingReview!.tier,interval:matchingReview!.interval,
        }),
      });
      const payload=await result.json();
      if(!result.ok)throw Error(payload.message||payload.error||'Billing is unavailable.');
      if(typeof payload.url!=='string'||!/^https:\/\/(checkout|billing)\.stripe\.com\//.test(payload.url))
        throw Error('Invalid payment provider URL.');
      window.location.assign(payload.url);
    }catch(err){setError(err instanceof Error?err.message:'Cannot open secure Stripe billing.');}
    finally{setBusy('');}
  }

  if(authLoading||loading)return <Shell><p role="status" className="text-white/60">Opening website billing…</p></Shell>;
  if(!user)return <Shell><h1 className="font-display text-3xl font-black uppercase">Sign in to manage your website</h1><Link className="mt-5 inline-flex rounded-xl bg-sky-400 px-5 py-3 font-bold text-[#071522]" href="/auth/sign-in?next=/network/dashboard/sites/billing">Sign in</Link></Shell>;
  return <Shell>
    <Link href="/network/dashboard/sites" className="inline-flex items-center gap-2 text-xs font-bold text-white/60"><FaArrowLeft/> Website Studio</Link>
    <p className="mt-7 text-xs font-black uppercase tracking-[.2em] text-sky-300">RCH Sites · Subscriptions</p>
    <h1 className="mt-2 font-display text-4xl font-black uppercase">Your website. Your plan.</h1>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">Choose how your organization grows. Website subscriptions are separate from RCH Network advertising and from payments your customers send to your own PayPal Business account.</p>
    {!organizations.length&&<section className="mt-8 rounded-2xl border border-white/15 bg-white/[.04] p-5">
      <p className="text-sm text-white/70">Website billing is for verified organization owners or managers. Start designing your site for free while your organization is reviewed.</p>
      <Link href="/website-creator/start" className="mt-4 inline-flex text-sm font-bold text-sky-300 underline">Start a free website</Link>
    </section>}
    {organizations.length>0&&<>
      <label className="mt-7 block max-w-md text-xs font-bold text-white/65">Organization
        <select value={selected} onChange={e=>{setSelected(e.target.value);setReview(null);}}
          className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#121e2b] p-3 text-sm text-white">
          {organizations.map(org=><option key={org.id} value={org.id}>{org.name}</option>)}
        </select>
      </label>
      {error&&<p role="alert" className="mt-5 rounded-xl border border-amber-300/25 p-4 text-sm text-amber-200">{error}</p>}
      {message&&<p role="status" className="mt-5 text-sm text-sky-300">{message}</p>}
      <section className="mt-6 rounded-2xl border border-white/15 bg-white/[.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-white/50">Current website level</p>
            <h2 className="mt-2 text-2xl font-black capitalize">{currentTier}</h2>
            <p className="mt-2 text-xs text-white/55">Status: {billing?.subscription?.status||'No paid subscription'}</p>
            {billing?.subscription?.status==='past_due'&&
              <p role="alert" className="mt-3 max-w-md text-xs leading-5 text-amber-200">
                Paid features are paused. Your payment or paid-through date needs attention.
                Use Manage billing to update your payment method and review invoices.
              </p>}
            {billing?.subscription?.status==='canceled'&&<p className="mt-1 text-xs text-white/55">Previous {billing.subscription.tier} subscription ended.</p>}
            {billing?.subscription?.currentPeriodEnd&&<p className="mt-1 text-xs text-white/55">Current period ends: {new Date(billing.subscription.currentPeriodEnd).toLocaleDateString()}</p>}
            {billing?.subscription?.cancelAtPeriodEnd&&<p className="mt-1 text-xs text-amber-200">Set to cancel at period end</p>}
          </div>
          {billing?.subscription?.status!=='none'&&billing?.subscription?.status!==undefined&&
            <button disabled={!!busy} onClick={()=>void act('portal')}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-bold disabled:opacity-50"><FaCreditCard/> Manage billing</button>}
        </div>
      </section>
      <div className="mt-7 inline-flex gap-1 rounded-xl border border-white/15 p-1" role="group" aria-label="Billing period">
        {(['monthly','annual'] as const).map(option=>
          <button key={option} type="button" aria-pressed={interval===option} onClick={()=>{setInterval(option);setReview(null);}}
            className={'min-h-11 rounded-lg px-4 text-sm font-bold '+(interval===option?'bg-sky-400 text-[#071522]':'text-white/65')}>
            {option==='monthly'?'Monthly':'Annual · save two months'}
          </button>)}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {levels.map(tier=>{
          const plan=RCH_SITE_PLANS[tier];
          const amount=interval==='annual'?plan.proposedAnnualUsd:plan.proposedMonthlyUsd;
          const current=billing?.subscription?.tier===tier&&billing?.subscription?.status==='active'&&
            billing?.subscription?.interval===interval;
          const isReviewing=matchingReview?.tier===tier;
          const unit=interval==='monthly'?'month':'year';
          const expectedSandbox=/^Sandbox (amateur|professional) (monthly|annual)$/i.exec(selectedOrganization?.name||'');
          const mismatchedSandboxSelection=Boolean(expectedSandbox&&
            (expectedSandbox[1].toLowerCase()!==tier||expectedSandbox[2].toLowerCase()!==interval));
          return <article key={tier} className="rounded-2xl border border-white/15 bg-white/[.04] p-6">
            <p className="font-display text-2xl font-black uppercase">{plan.name}</p>
            <p className="mt-3 text-3xl font-black">{'$'}{amount}<span className="text-xs font-normal text-white/60">/{interval==='monthly'?'month':'year'}</span></p>
            <p className="mt-3 text-xs leading-6 text-white/60">{tier==='amateur'?'For active trainers and developing programs.':'For clubs, academies, leagues and tournament organizers.'} Additional capabilities are being released in phases.</p>
            <button type="button" onClick={()=>{setReview({organizationId:selected,tier,interval});setError('');}}
              disabled={!billing?.available||!!busy||hasExistingSubscription}
              aria-expanded={isReviewing}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 text-sm font-black text-[#061521] disabled:opacity-40">
              <FaArrowRight/> {current?'Current plan':hasExistingSubscription?'Manage existing subscription':
                !billing?.available?'Enrollment not open':'Review $'+amount+'/'+unit}
            </button>
            {isReviewing&&<section aria-label="Review subscription before checkout" className="mt-4 rounded-xl border border-sky-300/40 bg-sky-300/[.07] p-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-sky-200">Review before Stripe</h3>
              <dl className="mt-3 grid gap-2 text-sm">
                <div><dt className="text-xs text-white/55">Organization</dt><dd className="font-semibold">{selectedOrganization?.name}</dd></div>
                <div><dt className="text-xs text-white/55">Plan</dt><dd className="font-semibold">{plan.name} · {interval==='monthly'?'Monthly':'Annual'}</dd></div>
                <div><dt className="text-xs text-white/55">Subscription price (USD)</dt><dd className="text-xl font-black">{'$'}{amount}/{unit}</dd></div>
              </dl>
              {mismatchedSandboxSelection&&
                <p role="alert" className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
                  This test organization is named {selectedOrganization?.name}, but the selected subscription is {plan.name} {interval}. Choose the matching plan and billing period for this test.
                </p>}
              <p className="mt-3 text-xs leading-5 text-white/60">
                You will review the charge again on Stripe. Your organization name does not select the subscription automatically.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={()=>setReview(null)} disabled={!!busy}
                  className="min-h-11 rounded-lg border border-white/25 px-4 text-xs font-bold text-white/80">Change</button>
                <button type="button" onClick={()=>void act(tier)} disabled={!!busy||mismatchedSandboxSelection}
                  className="min-h-11 flex-1 rounded-lg bg-sky-400 px-4 text-xs font-black text-[#061521] disabled:opacity-40">
                  {busy===tier?'Opening secure checkout…':'Confirm '+plan.name+' · $'+amount+'/'+unit}
                </button>
              </div>
            </section>}
          </article>;
        })}
      </div>
      {!billing?.available&&<p className="mt-5 flex items-start gap-2 text-sm text-amber-200"><FaLock className="mt-1 shrink-0"/> Payments are not yet open. Your current site and saved preferences remain available, and no charges will be initiated.</p>}
      <p className="mt-5 text-xs leading-6 text-white/55">Founding rates and optional add-ons are not enrolled automatically. No plan change can be inferred from visiting the payment confirmation page: subscription status updates only after Stripe verifies payment through RCH.</p>
    </>}
  </Shell>;
}
function Shell({children}:{children:React.ReactNode}){
  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <Container maxWidth="xl" className="py-10 sm:py-14">{children}</Container>
  </main>;
}
