'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { FaArrowRight, FaCircleCheck } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';

const CONTENT_TYPES = [
  'Shorts / Reels',
  'Game coverage',
  'Documentaries / series',
  'Interviews / podcasts',
  'Analysis / breakdowns',
  'Photography',
  'Basketball culture',
] as const;

type FormState = {
  creatorName:string;
  contactName:string;
  contactEmail:string;
  city:string;
  region:string;
  websiteUrl:string;
  instagramUrl:string;
  otherPlatforms:string;
  pitch:string;
  ageBand:'18-plus'|'under-18';
  guardianEmail:string;
  contentTypes:string[];
  rightsConfirmed:boolean;
};

const initialState:FormState = {
  creatorName:'',
  contactName:'',
  contactEmail:'',
  city:'',
  region:'central-virginia',
  websiteUrl:'',
  instagramUrl:'',
  otherPlatforms:'',
  pitch:'',
  ageBand:'18-plus',
  guardianEmail:'',
  contentTypes:['Shorts / Reels'],
  rightsConfirmed:false,
};

export function CreatorInterestForm(){
  const supabase=useMemo(()=>getSupabaseClient(),[]);
  const db=supabase as any;
  const [form,setForm]=useState<FormState>(initialState);
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  const [error,setError]=useState('');

  const update=<K extends keyof FormState>(key:K,value:FormState[K])=>setForm(current=>({...current,[key]:value}));
  const toggle=(value:string)=>update('contentTypes',form.contentTypes.includes(value)?form.contentTypes.filter(item=>item!==value):[...form.contentTypes,value]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!db)return setError('RCH creator applications are temporarily unavailable. Please try again shortly.');
    if(!form.creatorName.trim()||!form.contactName.trim()||!form.contactEmail.trim())return setError('Creator name, contact name and email are required.');
    if(!form.contentTypes.length)return setError('Choose at least one type of content you want to create.');
    if(form.ageBand==='under-18'&&!form.guardianEmail.trim())return setError('A parent or guardian email is required for applicants under 18.');
    if(!form.rightsConfirmed)return setError('Please confirm that you will only submit work you own or have permission to publish.');

    setBusy(true);setError('');
    const details=[
      'RCH FOUNDING CREATOR APPLICATION',
      `Content: ${form.contentTypes.join(', ')}`,
      `Age: ${form.ageBand==='18-plus'?'18+':'Under 18'}`,
      form.guardianEmail.trim()?`Parent/guardian email: ${form.guardianEmail.trim()}`:'',
      form.otherPlatforms.trim()?`Other platforms: ${form.otherPlatforms.trim()}`:'',
      form.pitch.trim()?`Pitch: ${form.pitch.trim()}`:'',
      'Rights acknowledgement: confirmed',
    ].filter(Boolean).join('\n');

    const {error:insertError}=await db.from('network_partner_inquiries').insert({
      organization_name:form.creatorName.trim(),
      organization_type:'creator',
      city:form.city.trim()||null,
      contact_name:form.contactName.trim(),
      contact_email:form.contactEmail.trim(),
      website_url:form.websiteUrl.trim()||null,
      instagram_url:form.instagramUrl.trim()||null,
      region:form.region,
      plan_interest:'unsure',
      goals:details,
      source:'partner-application',
      status:'new',
    });
    setBusy(false);
    if(insertError){
      console.error('Unable to submit RCH creator application',insertError);
      setError('We could not send the application. Please review your information and try again.');
      return;
    }
    setSent(true);setForm(initialState);
  }

  if(sent)return <section className="rounded-3xl border border-rcl-blue/25 bg-rcl-blue/[.06] p-7 sm:p-9">
    <FaCircleCheck className="text-3xl text-rcl-blue"/>
    <p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Application received</p>
    <h2 className="mt-2 font-display text-3xl font-black">You&apos;re in the Founding Creator review.</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">RCH will review your work, region and content fit. The program is curated, so an application is not an automatic acceptance. Selected creators will be contacted about pilots, original concepts and publishing opportunities.</p>
    <div className="mt-6 flex flex-wrap gap-3"><Link href="/media" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-4 text-xs font-black text-white">Explore RCH TV <FaArrowRight/></Link><button type="button" onClick={()=>setSent(false)} className="inline-flex min-h-11 items-center rounded-xl border border-rcl-blue/25 px-4 text-xs font-black text-rcl-blue">Submit another</button></div>
  </section>;

  return <form onSubmit={submit} className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/60 p-6 sm:p-8">
    <div className="mb-7"><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Founding RCH Creators</p><h2 className="mt-2 font-display text-3xl font-black">Bring your corner of Virginia basketball with you.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">Follower count is not the gate. RCH is looking for original voices, reliable creators and people with real access to Virginia basketball culture.</p></div>
    <div className="grid gap-5 md:grid-cols-2">
      <Field label="Creator / brand name"><input required value={form.creatorName} onChange={e=>update('creatorName',e.target.value)} maxLength={160} placeholder="Your creator name or media brand" className="rcl-creator-input"/></Field>
      <Field label="Your name"><input required value={form.contactName} onChange={e=>update('contactName',e.target.value)} maxLength={120} placeholder="Contact name" className="rcl-creator-input"/></Field>
      <Field label="Email"><input required type="email" value={form.contactEmail} onChange={e=>update('contactEmail',e.target.value)} maxLength={320} placeholder="you@example.com" className="rcl-creator-input"/></Field>
      <Field label="City"><input value={form.city} onChange={e=>update('city',e.target.value)} maxLength={120} placeholder="Richmond, Norfolk, Fairfax…" className="rcl-creator-input"/></Field>
      <Field label="Virginia region"><select value={form.region} onChange={e=>update('region',e.target.value)} className="rcl-creator-input"><option value="central-virginia">Central Virginia / 804</option><option value="hampton-roads">Hampton Roads / 757</option><option value="northern-virginia">Northern Virginia / NOVA</option><option value="shenandoah">Shenandoah Valley / 540</option><option value="southwest-virginia">Southwest Virginia</option><option value="statewide">Statewide</option><option value="other">Other Virginia area</option></select></Field>
      <Field label="Age"><select value={form.ageBand} onChange={e=>update('ageBand',e.target.value as FormState['ageBand'])} className="rcl-creator-input"><option value="18-plus">18 or older</option><option value="under-18">Under 18</option></select></Field>
      {form.ageBand==='under-18'&&<Field label="Parent / guardian email"><input required type="email" value={form.guardianEmail} onChange={e=>update('guardianEmail',e.target.value)} maxLength={320} placeholder="guardian@example.com" className="rcl-creator-input"/></Field>}
      <Field label="Portfolio / website"><input type="url" value={form.websiteUrl} onChange={e=>update('websiteUrl',e.target.value)} placeholder="https://" className="rcl-creator-input"/></Field>
      <Field label="Instagram"><input type="url" value={form.instagramUrl} onChange={e=>update('instagramUrl',e.target.value)} placeholder="https://instagram.com/..." className="rcl-creator-input"/></Field>
      <Field label="YouTube / TikTok / other links" className="md:col-span-2"><input value={form.otherPlatforms} onChange={e=>update('otherPlatforms',e.target.value)} maxLength={800} placeholder="Paste handles or links separated by commas" className="rcl-creator-input"/></Field>
    </div>

    <fieldset className="mt-7"><legend className="text-[10px] font-black uppercase tracking-[.16em] text-white/50">What do you want to make?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{CONTENT_TYPES.map(item=><label key={item} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] px-4 text-sm font-bold"><input type="checkbox" checked={form.contentTypes.includes(item)} onChange={()=>toggle(item)} className="h-4 w-4"/><span>{item}</span></label>)}</div></fieldset>

    <Field label="What would you create for RCH TV?" className="mt-7"><textarea value={form.pitch} onChange={e=>update('pitch',e.target.value)} maxLength={3000} rows={6} placeholder="Tell us the series, Shorts/Reels concept, coverage lane, interviews, documentary idea, analysis show, or basketball community you can bring to RCH." className="rcl-creator-input resize-y"/></Field>

    <label className="mt-5 flex items-start gap-3 rounded-xl border border-rcl-blue/15 bg-rcl-blue/[.035] p-4 text-sm leading-6 text-white/55"><input type="checkbox" checked={form.rightsConfirmed} onChange={e=>update('rightsConfirmed',e.target.checked)} className="mt-1 h-4 w-4 shrink-0"/><span>I will only submit content I own or have permission to publish. If I create content for a school, team, employer or client, I understand that their footage may require separate permission.</span></label>

    {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">{error}</p>}
    <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl text-xs leading-5 text-white/35">RCH creator participation is curated. Applying does not guarantee selection, compensation or exclusivity. Any paid or exclusive original will use a separate written agreement.</p><button disabled={busy} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{busy?'Sending…':'Apply to create'} <FaArrowRight/></button></div>
    <style jsx>{`:global(.rcl-creator-input){width:100%;min-height:48px;border-radius:12px;border:1px solid rgba(59,130,246,.18);background:#fff;padding:12px 14px;color:#0F2547;outline:none}:global(.rcl-creator-input:focus){border-color:rgba(59,130,246,.68);box-shadow:0 0 0 3px rgba(59,130,246,.10)}:global(textarea.rcl-creator-input){min-height:150px}`}</style>
  </form>;
}

function Field({label,children,className=''}:{label:string;children:React.ReactNode;className?:string}){return <label className={`block ${className}`}><span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-white/50">{label}</span>{children}</label>}
