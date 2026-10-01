'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { FaArrowRight, FaCircleCheck, FaMagnifyingGlass } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';

type FormState = {
  organizationName:string; organizationType:string; city:string; contactName:string; contactEmail:string;
  websiteUrl:string; instagramUrl:string; region:string; planInterest:string; goals:string;
};
type ExistingOrganization={slug:string;name:string;is_claimed:boolean;network_tier:string};

const initialState:FormState={
  organizationName:'',organizationType:'program',city:'',contactName:'',contactEmail:'',websiteUrl:'',instagramUrl:'',
  region:'central-virginia',planInterest:'network',goals:'',
};

export function PartnerInterestForm() {
  const supabase=useMemo(()=>getSupabaseClient(),[]); const db=supabase as any;
  const [form,setForm]=useState<FormState>(initialState); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [sent,setSent]=useState(false); const [existing,setExisting]=useState<ExistingOrganization|null>(null);
  const update=(key:keyof FormState,value:string)=>{setExisting(null);setForm(current=>({...current,[key]:value}));};

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(!db)return setError('RCL Network is temporarily unavailable. Please try again shortly.');
    if(!form.organizationName.trim()||!form.contactName.trim()||!form.contactEmail.trim())return setError('Organization name, contact name, and email are required.');
    setBusy(true);setError('');setExisting(null);

    const {data:matches}=await db.from('network_organizations').select('slug,name,is_claimed,network_tier').ilike('name',form.organizationName.trim()).eq('status','active').limit(1);
    if(matches?.length){setBusy(false);setExisting(matches[0] as ExistingOrganization);return;}

    const {error:insertError}=await db.from('network_partner_inquiries').insert({
      organization_name:form.organizationName.trim(),organization_type:form.organizationType,city:form.city.trim()||null,
      contact_name:form.contactName.trim(),contact_email:form.contactEmail.trim(),website_url:form.websiteUrl.trim()||null,
      instagram_url:form.instagramUrl.trim()||null,region:form.region,plan_interest:form.planInterest,goals:form.goals.trim()||null,
      source:'partner-application',status:'new',
    });
    setBusy(false);
    if(insertError){console.error('Unable to submit RCL Network organization inquiry',insertError);setError('We could not send that request. Please review your information and try again.');return;}
    setSent(true);setForm(initialState);
  }

  if(existing)return <section className="rounded-2xl border border-rcl-orange/25 bg-rcl-orange/[.055] p-6 sm:p-8"><FaMagnifyingGlass className="text-3xl text-rcl-orange"/><p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Already in the Network</p><h2 className="mt-2 font-display text-3xl font-black uppercase">We found {existing.name}.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/55">Instead of creating a duplicate page, use the existing organization listing. {existing.network_tier!=='flagship'&&!existing.is_claimed?'If you represent this organization, you can start the free claim process now.':'You can view the public listing below.'}</p><div className="mt-6 flex flex-wrap gap-3"><Link href={`/organizations/${existing.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black uppercase text-white/65">View listing <FaArrowRight/></Link>{existing.network_tier!=='flagship'&&!existing.is_claimed&&<Link href={`/organizations/${existing.slug}/claim`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase text-black">Claim organization <FaArrowRight/></Link>}<button type="button" onClick={()=>setExisting(null)} className="text-xs font-black uppercase text-rcl-blue">This is a different organization</button></div></section>;

  if(sent)return <section className="rounded-2xl border border-rcl-blue/25 bg-rcl-blue/[.06] p-6 sm:p-8"><FaCircleCheck className="text-3xl text-rcl-blue"/><p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Organization submitted</p><h2 className="mt-2 font-display text-3xl font-black uppercase">The free listing review has started.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">RCL will review the organization details before adding it to the public directory. Once the listing exists, an authorized representative can claim it to edit the public presence, submit events, and measure Network-generated views and clicks. Paid promotion is optional.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/organizations" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-4 text-xs font-black uppercase text-[#03101a]">Browse directory <FaArrowRight/></Link><button type="button" onClick={()=>setSent(false)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/30 px-4 text-xs font-black uppercase text-rcl-blue">Submit another</button></div></section>;

  return <form onSubmit={submit} className="rounded-2xl border border-rcl-blue/20 bg-[#071522]/75 p-5 sm:p-7">
    <div className="mb-6 rounded-2xl border border-rcl-orange/20 bg-rcl-orange/[.04] p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-orange">Start free</p><p className="mt-1 text-sm leading-6 text-white/55">A standard Network listing costs $0. Claiming it later unlocks profile maintenance, event submissions, and RCL exposure analytics. Amplify and Premier are optional upgrades.</p></div>
    <div className="grid gap-5 md:grid-cols-2">
      <Field label="Organization name"><input required value={form.organizationName} onChange={e=>update('organizationName',e.target.value)} maxLength={160} placeholder="Virginia basketball organization" className="rcl-network-input"/></Field>
      <Field label="Organization type"><select value={form.organizationType} onChange={e=>update('organizationType',e.target.value)} className="rcl-network-input">{['league','tournament','program','club','team','training','facility','media','creator','other'].map(value=><option key={value} value={value}>{pretty(value)}</option>)}</select></Field>
      <Field label="City"><input value={form.city} onChange={e=>update('city',e.target.value)} maxLength={120} placeholder="Richmond" className="rcl-network-input"/></Field>
      <Field label="Virginia region"><select value={form.region} onChange={e=>update('region',e.target.value)} className="rcl-network-input"><option value="central-virginia">Central Virginia</option><option value="hampton-roads">Hampton Roads</option><option value="northern-virginia">Northern Virginia</option><option value="shenandoah">Shenandoah Valley</option><option value="southwest-virginia">Southwest Virginia</option><option value="statewide">Statewide</option><option value="other">Other Virginia area</option></select></Field>
      <Field label="Website or primary link"><input type="url" value={form.websiteUrl} onChange={e=>update('websiteUrl',e.target.value)} placeholder="https://" className="rcl-network-input"/></Field>
      <Field label="Instagram"><input type="url" value={form.instagramUrl} onChange={e=>update('instagramUrl',e.target.value)} placeholder="https://instagram.com/..." className="rcl-network-input"/></Field>
      <Field label="Contact name"><input required value={form.contactName} onChange={e=>update('contactName',e.target.value)} maxLength={120} placeholder="Your name" className="rcl-network-input"/></Field>
      <Field label="Contact email"><input required type="email" value={form.contactEmail} onChange={e=>update('contactEmail',e.target.value)} maxLength={320} placeholder="you@organization.com" className="rcl-network-input"/></Field>
      <Field label="Exposure level"><select value={form.planInterest} onChange={e=>update('planInterest',e.target.value)} className="rcl-network-input"><option value="network">Network Listing — Free</option><option value="amplify">Amplify</option><option value="premier">Premier Partner</option><option value="unsure">Not sure yet</option></select></Field>
    </div>
    <Field label="What should Virginia basketball know about this organization?" className="mt-5"><textarea value={form.goals} onChange={e=>update('goals',e.target.value)} maxLength={3000} rows={5} placeholder="Programs, events, age groups, audience, goals, or anything that helps RCL review the listing." className="rcl-network-input resize-y"/></Field>
    {error&&<p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xl text-xs leading-5 text-white/35">Submitting a listing does not transfer control of registration, payments, scheduling, rosters, eligibility, or operations to RCL.</p><button disabled={busy} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wide text-black disabled:cursor-not-allowed disabled:opacity-50">{busy?'Checking…':'Submit free listing'} <FaArrowRight/></button></div>
    <style jsx>{`:global(.rcl-network-input){width:100%;min-height:48px;border-radius:12px;border:1px solid rgba(21,159,255,.18);background:#050b12;padding:12px 14px;color:#f6f8fb;outline:none}:global(.rcl-network-input:focus){border-color:rgba(21,159,255,.68);box-shadow:0 0 0 3px rgba(21,159,255,.08)}:global(textarea.rcl-network-input){min-height:132px}`}</style>
  </form>;
}

function Field({label,children,className=''}:{label:string;children:React.ReactNode;className?:string}) {return <label className={`block ${className}`}><span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/50">{label}</span>{children}</label>}
function pretty(value:string){return value.replaceAll('-',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}
