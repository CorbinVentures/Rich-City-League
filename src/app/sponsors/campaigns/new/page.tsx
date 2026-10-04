'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { NETWORK_REGIONS } from '@/lib/network-taxonomy';
import { SPONSOR_INVENTORY, sponsorInventoryByCode } from '@/lib/sponsorship';
import { FaArrowLeft, FaArrowRight, FaBullhorn, FaCircleCheck, FaEye, FaShieldHalved } from 'react-icons/fa6';

type Organization={id:string;name:string;slug:string;organization_type:string};
type Membership={organization_id:string;member_role:string;organization:Organization};

const objectives=[
  ['awareness','Brand awareness'],
  ['website-traffic','Website traffic'],
  ['event-traffic','Event attendance'],
  ['media-views','Media views'],
  ['audience-growth','Audience growth'],
] as const;

export default function SponsorCampaignBuilderPage(){
  const {user,loading:authLoading}=useAuth();
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const [memberships,setMemberships]=useState<Membership[]>([]);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [sent,setSent]=useState(false);
  const first=SPONSOR_INVENTORY[0];
  const today=new Date();const end=new Date(today.getTime()+(first.durationDays??7)*86400000);
  const dateValue=(date:Date)=>new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const [form,setForm]=useState({
    organizationId:'',product:first.code,objective:first.objective,region:'central-virginia',
    headline:'',destinationUrl:'',startsAt:dateValue(today),endsAt:dateValue(end),budget:String(first.startingPriceCents??''),
  });

  useEffect(()=>{void (async()=>{
    if(!user||!db){if(!authLoading)setLoading(false);return;}
    const {data,error:membershipError}=await db.from('network_organization_members')
      .select('organization_id,member_role,organization:network_organizations!organization_id(id,name,slug,organization_type)')
      .eq('profile_id',user.id).eq('status','active');
    if(membershipError){setError(membershipError.message);setLoading(false);return;}
    const rows=(data??[]).map((row:any)=>({...row,organization:Array.isArray(row.organization)?row.organization[0]:row.organization})).filter((row:any)=>row.organization) as Membership[];
    setMemberships(rows);setForm(current=>({...current,organizationId:rows[0]?.organization_id??''}));setLoading(false);
  })();},[user,db,authLoading]);

  const product=sponsorInventoryByCode(form.product)??first;
  const organization=memberships.find(item=>item.organization_id===form.organizationId)?.organization??memberships[0]?.organization;

  function chooseProduct(code:string){
    const selected=sponsorInventoryByCode(code);if(!selected)return;
    const start=new Date();const finish=new Date(start.getTime()+(selected.durationDays??30)*86400000);
    setForm(current=>({...current,product:selected.code,objective:selected.objective,startsAt:dateValue(start),endsAt:dateValue(finish),budget:String(selected.startingPriceCents??'')}));
  }

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError('');
    if(!user||!db||!organization)return setError('Choose a verified organization.');
    if(product.kind==='presenting'||product.kind==='exclusive')return setError('Presenting and exclusive sponsorships require a custom sponsorship brief instead of self-service campaign submission.');
    if(!form.headline.trim()||!form.destinationUrl.trim())return setError('Headline and destination URL are required.');
    const start=new Date(form.startsAt+'T12:00:00');const finish=new Date(form.endsAt+'T12:00:00');
    if(!Number.isFinite(start.getTime())||!Number.isFinite(finish.getTime())||finish<=start)return setError('Choose a valid campaign window.');
    setBusy(true);
    const {error:insertError}=await db.from('network_campaigns').insert({
      organization_id:organization.id,
      name:product.name+' — '+form.headline.trim().slice(0,80),
      objective:form.objective,
      package:product.package,
      requested_placement:product.placement,
      destination_url:form.destinationUrl.trim(),
      headline:form.headline.trim(),
      requested_starts_at:start.toISOString(),
      requested_ends_at:finish.toISOString(),
      requested_budget_cents:form.budget?Number(form.budget):null,
      target_regions:form.region==='statewide'?['statewide']:[form.region],
      status:'pending',
      created_by:user.id,
      entitlement_source:'manual',
      payment_status:'not_required',
    });
    setBusy(false);
    if(insertError)return setError(insertError.message);
    setSent(true);
  }

  if(authLoading||loading)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="xl" className="py-16"><p className="text-sm text-white/45">Opening campaign builder…</p></Container></main>;
  if(!user)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="md" className="py-16"><h1 className="font-display text-5xl font-black uppercase">Sign in to build a campaign.</h1><Link href="/auth/sign-in?next=/sponsors/campaigns/new" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black">Sign in <FaArrowRight/></Link></Container></main>;
  if(!memberships.length)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-16"><FaShieldHalved className="text-2xl text-rcl-orange"/><h1 className="mt-3 font-display text-5xl font-black uppercase">Connect your business first.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/45">Self-service sponsorship requests require a verified organization account. Start a sponsorship brief and RCH can connect the business to the platform.</p><Link href="/sponsors/start" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black">Start sponsorship brief <FaArrowRight/></Link></Container></main>;
  if(sent)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-16"><section className="rounded-3xl border border-rcl-blue/25 bg-rcl-blue/[.055] p-8"><FaCircleCheck className="text-3xl text-rcl-blue"/><p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Campaign submitted</p><h1 className="mt-2 font-display text-5xl font-black uppercase">RCH has the request.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/50">The campaign is pending review. RCH will confirm placement availability, creative fit and any payment requirement before delivery begins.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/sponsors/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-5 text-xs font-black uppercase text-[#03101a]">Sponsor dashboard <FaArrowRight/></Link><button onClick={()=>setSent(false)} className="min-h-11 rounded-xl border border-white/10 px-4 text-xs font-black uppercase text-white/55">Build another</button></div></section></Container></main>;

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_82%_10%,rgba(21,159,255,.13),transparent_28%),linear-gradient(145deg,#071522,#03070d)]">
      <Container maxWidth="xl" className="py-10 sm:py-14"><Link href="/sponsors/dashboard" className="inline-flex items-center gap-2 text-xs font-black uppercase text-white/40"><FaArrowLeft/> Sponsor dashboard</Link><p className="mt-7 text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCH Campaign Builder</p><h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-.04em] sm:text-6xl">Build one clear <span className="text-rcl-blue">sponsorship campaign.</span></h1><p className="mt-4 max-w-3xl text-sm leading-6 text-white/45">Choose the inventory, objective, target and creative. Submission does not reserve inventory or trigger payment; RCH reviews it first.</p></Container>
    </section>
    <Container maxWidth="xl" className="py-8">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <form onSubmit={submit} className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/65 p-6">
          <div className="flex items-center gap-3"><FaBullhorn className="text-rcl-orange"/><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-rcl-orange">Campaign brief</p><h2 className="font-display text-3xl font-black uppercase">Configure the request</h2></div></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Sponsor organization"><select value={form.organizationId} onChange={e=>setForm({...form,organizationId:e.target.value})} className="sponsor-campaign-input">{memberships.map(item=><option key={item.organization_id} value={item.organization_id}>{item.organization.name}</option>)}</select></Field>
            <Field label="Sponsorship product"><select value={form.product} onChange={e=>chooseProduct(e.target.value)} className="sponsor-campaign-input">{SPONSOR_INVENTORY.map(item=><option key={item.code} value={item.code}>{item.name} — {item.priceLabel}</option>)}</select></Field>
            <Field label="Objective"><select value={form.objective} onChange={e=>setForm({...form,objective:e.target.value})} className="sponsor-campaign-input">{objectives.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Virginia target"><select value={form.region} onChange={e=>setForm({...form,region:e.target.value})} className="sponsor-campaign-input"><option value="statewide">Statewide Virginia</option>{NETWORK_REGIONS.filter(item=>item.value!=='statewide'&&item.value!=='other').map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
            <Field label="Requested start"><input type="date" value={form.startsAt} onChange={e=>setForm({...form,startsAt:e.target.value})} className="sponsor-campaign-input"/></Field>
            <Field label="Requested end"><input type="date" value={form.endsAt} onChange={e=>setForm({...form,endsAt:e.target.value})} className="sponsor-campaign-input"/></Field>
            <div className="sm:col-span-2"><Field label="Sponsored headline"><input value={form.headline} onChange={e=>setForm({...form,headline:e.target.value})} maxLength={180} placeholder="What should the audience know?" className="sponsor-campaign-input"/></Field></div>
            <div className="sm:col-span-2"><Field label="Destination URL"><input type="url" value={form.destinationUrl} onChange={e=>setForm({...form,destinationUrl:e.target.value})} placeholder="https://" className="sponsor-campaign-input"/></Field></div>
            <Field label="Working budget"><input type="number" min="0" step="1" value={form.budget?String(Math.round(Number(form.budget)/100)):''} onChange={e=>setForm({...form,budget:e.target.value?String(Number(e.target.value)*100):''})} placeholder="USD" className="sponsor-campaign-input"/></Field>
          </div>
          {(product.kind==='presenting'||product.kind==='exclusive')&&<div className="mt-5 rounded-2xl border border-rcl-orange/25 bg-rcl-orange/[.055] p-4"><p className="text-xs font-black uppercase text-rcl-orange">Custom sponsorship required</p><p className="mt-2 text-xs leading-5 text-white/45">{product.name} includes association or exclusivity rights and cannot be activated as a self-service campaign.</p><Link href={'/sponsors/start?product='+product.code} className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-orange">Open sponsorship brief <FaArrowRight/></Link></div>}
          {error&&<p className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
          <button disabled={busy||product.kind==='presenting'||product.kind==='exclusive'} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase tracking-wide text-black disabled:cursor-not-allowed disabled:opacity-40">{busy?'Submitting…':'Submit for RCH review'} <FaArrowRight/></button>
          <style jsx>{':global(.sponsor-campaign-input){width:100%;min-height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:#050b12;padding:11px 13px;color:#f6f8fb;outline:none}:global(.sponsor-campaign-input:focus){border-color:rgba(21,159,255,.6);box-shadow:0 0 0 3px rgba(21,159,255,.08)}'}</style>
        </form>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/65 p-6"><div className="flex items-center gap-3"><FaEye className="text-rcl-blue"/><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-rcl-blue">Creative preview</p><h2 className="font-display text-3xl font-black uppercase">What the audience understands</h2></div></div>
            <div className="mt-5 rounded-2xl border border-rcl-orange/25 bg-[linear-gradient(145deg,rgba(21,159,255,.07),rgba(7,17,27,.96))] p-5"><div className="flex items-center justify-between gap-3"><span className="rounded-full border border-rcl-orange/30 bg-rcl-orange/[.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.16em] text-rcl-orange">Sponsored</span><span className="text-[9px] font-black uppercase tracking-[.15em] text-white/25">RCH</span></div><p className="mt-4 text-[10px] font-black uppercase tracking-wide text-rcl-blue">{organization?.name??'Your brand'}</p><h3 className="mt-1 font-display text-3xl font-black uppercase leading-tight">{form.headline.trim()||'Your sponsored headline appears here.'}</h3><p className="mt-3 text-xs text-white/35">{product.name} · {form.region.replaceAll('-',' ')}</p><span className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-[10px] font-black uppercase text-black">Learn more <FaArrowRight/></span></div>
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-[10px] font-black uppercase tracking-[.15em] text-white/35">Selected inventory</p><h2 className="mt-2 font-display text-3xl font-black uppercase">{product.name}</h2><p className="mt-3 text-sm leading-6 text-white/45">{product.description}</p><div className="mt-5 space-y-2">{product.deliverables.map(item=><p key={item} className="flex gap-2 text-xs text-white/50"><FaCircleCheck className="mt-1 shrink-0 text-rcl-blue"/>{item}</p>)}</div><p className="mt-5 border-t border-white/10 pt-4 text-xs font-black text-rcl-orange">{product.priceLabel}</p></section>
        </aside>
      </div>
    </Container>
  </main>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-white/45">{label}</span>{children}</label>;}
