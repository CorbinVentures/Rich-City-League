'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { FaArrowRight, FaCircleCheck, FaHandshake } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import {
  SPONSOR_BUDGET_OPTIONS,
  SPONSOR_CATEGORIES,
  SPONSOR_INVENTORY,
  sponsorInventoryByCode,
} from '@/lib/sponsorship';
import { NETWORK_REGIONS } from '@/lib/network-taxonomy';

type FormState={
  businessName:string;contactName:string;contactEmail:string;phone:string;website:string;instagram:string;
  category:string;city:string;region:string;inventoryCode:string;budget:string;goals:string;
};

export function SponsorInterestForm({initialProduct=''}:{initialProduct?:string}){
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const validInitial=sponsorInventoryByCode(initialProduct)?.code??'';
  const [form,setForm]=useState<FormState>({
    businessName:'',contactName:'',contactEmail:'',phone:'',website:'',instagram:'',
    category:'Automotive',city:'Richmond',region:'central-virginia',inventoryCode:validInitial,budget:'250-499',goals:'',
  });
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [sent,setSent]=useState(false);
  const selected=sponsorInventoryByCode(form.inventoryCode);

  const update=(key:keyof FormState,value:string)=>setForm(current=>({...current,[key]:value}));

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError('');
    if(!db)return setError('Sponsorship requests are temporarily unavailable.');
    if(!form.businessName.trim()||!form.contactName.trim()||!form.contactEmail.trim())return setError('Business name, contact name, and email are required.');
    setBusy(true);
    const major=selected?.kind==='presenting'||selected?.kind==='exclusive';
    const budgetLabel=SPONSOR_BUDGET_OPTIONS.find(([value])=>value===form.budget)?.[1]??form.budget;
    const detail=[
      'Requested opportunity: '+(selected?selected.name+' ('+selected.code+')':'Not sure yet'),
      'Business category: '+form.category,
      'Budget: '+budgetLabel,
      form.phone.trim()?'Phone: '+form.phone.trim():'',
      form.goals.trim()?'Goals / notes: '+form.goals.trim():'',
    ].filter(Boolean).join('\n');
    const {error:insertError}=await db.from('network_partner_inquiries').insert({
      organization_name:form.businessName.trim(),
      organization_type:'business',
      city:form.city.trim()||null,
      region:form.region,
      contact_name:form.contactName.trim(),
      contact_email:form.contactEmail.trim(),
      website_url:form.website.trim()||null,
      instagram_url:form.instagram.trim()||null,
      plan_interest:major?'major-sponsor':'business-advertising',
      goals:detail,
      source:'partner-application',
      status:'new',
    });
    setBusy(false);
    if(insertError){console.error('Unable to submit sponsorship interest',insertError);return setError('We could not send that request. Please review your information and try again.');}
    setSent(true);
  }

  if(sent)return <section className="rounded-3xl border border-rcl-blue/25 bg-rcl-blue/[.055] p-7 sm:p-9">
    <FaCircleCheck className="text-3xl text-rcl-blue"/>
    <p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Sponsorship request received</p>
    <h2 className="mt-2 font-display text-4xl font-black uppercase">We have the brief.</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">RCH will review fit, inventory, timing and pricing before anything is activated or billed. Sponsorship buys distribution and association—not basketball credibility, rankings, REP, awards or competitive outcomes.</p>
    <div className="mt-6 flex flex-wrap gap-3"><Link href="/sponsors" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-4 text-xs font-black uppercase text-[#03101a]">Back to Sponsor Center <FaArrowRight/></Link><button type="button" onClick={()=>setSent(false)} className="min-h-11 rounded-xl border border-white/10 px-4 text-xs font-black uppercase text-white/55">Submit another</button></div>
  </section>;

  return <form onSubmit={submit} className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/70 p-5 sm:p-7">
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rcl-orange/20 bg-rcl-orange/[.045] p-4"><FaHandshake className="mt-1 shrink-0 text-rcl-orange"/><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-orange">Start with the goal, not a contract</p><p className="mt-1 text-sm leading-6 text-white/50">Tell us what you want to accomplish. RCH will confirm available inventory and final commercial terms before activation.</p></div></div>
    <div className="grid gap-5 md:grid-cols-2">
      <Field label="Business / brand name"><input required value={form.businessName} onChange={e=>update('businessName',e.target.value)} maxLength={160} placeholder="Your business" className="sponsor-input"/></Field>
      <Field label="Business category"><select value={form.category} onChange={e=>update('category',e.target.value)} className="sponsor-input">{SPONSOR_CATEGORIES.map(item=><option key={item} value={item}>{item}</option>)}</select></Field>
      <Field label="Contact name"><input required value={form.contactName} onChange={e=>update('contactName',e.target.value)} maxLength={120} placeholder="Decision maker or contact" className="sponsor-input"/></Field>
      <Field label="Contact email"><input required type="email" value={form.contactEmail} onChange={e=>update('contactEmail',e.target.value)} maxLength={320} placeholder="you@business.com" className="sponsor-input"/></Field>
      <Field label="Phone"><input value={form.phone} onChange={e=>update('phone',e.target.value)} maxLength={40} placeholder="Optional" className="sponsor-input"/></Field>
      <Field label="City"><input value={form.city} onChange={e=>update('city',e.target.value)} maxLength={120} placeholder="Richmond" className="sponsor-input"/></Field>
      <Field label="Virginia target"><select value={form.region} onChange={e=>update('region',e.target.value)} className="sponsor-input">{NETWORK_REGIONS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
      <Field label="Budget range"><select value={form.budget} onChange={e=>update('budget',e.target.value)} className="sponsor-input">{SPONSOR_BUDGET_OPTIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Website"><input type="url" value={form.website} onChange={e=>update('website',e.target.value)} placeholder="https://" className="sponsor-input"/></Field>
      <Field label="Instagram"><input type="url" value={form.instagram} onChange={e=>update('instagram',e.target.value)} placeholder="https://instagram.com/..." className="sponsor-input"/></Field>
      <div className="md:col-span-2"><Field label="Opportunity"><select value={form.inventoryCode} onChange={e=>update('inventoryCode',e.target.value)} className="sponsor-input"><option value="">Help me choose</option>{SPONSOR_INVENTORY.map(item=><option key={item.code} value={item.code}>{item.name} — {item.priceLabel}</option>)}</select></Field></div>
      <div className="md:col-span-2"><Field label="What do you want this sponsorship to do?"><textarea value={form.goals} onChange={e=>update('goals',e.target.value)} rows={5} maxLength={2200} placeholder="Examples: drive traffic to our dealership, fill an event, promote an offer, own a recurring RCH category, reach Richmond basketball fans…" className="sponsor-input resize-y"/></Field></div>
    </div>
    {selected&&<div className="mt-5 rounded-2xl border border-rcl-blue/15 bg-black/15 p-4"><p className="text-[9px] font-black uppercase tracking-[.16em] text-rcl-blue">Selected opportunity</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><b className="font-display text-2xl font-black uppercase">{selected.name}</b><p className="mt-1 max-w-2xl text-xs leading-5 text-white/40">{selected.description}</p></div><span className="text-sm font-black text-rcl-orange">{selected.priceLabel}</span></div></div>}
    {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
    <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xl text-[11px] leading-5 text-white/30">Submitting a request does not reserve inventory or create a payment obligation. RCH confirms availability and terms first.</p><button disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase tracking-wide text-black disabled:opacity-50">{busy?'Sending…':'Request sponsorship'} <FaArrowRight/></button></div>
    <style jsx>{':global(.sponsor-input){width:100%;min-height:48px;border-radius:12px;border:1px solid rgba(21,159,255,.18);background:#050b12;padding:12px 14px;color:#f6f8fb;outline:none}:global(.sponsor-input:focus){border-color:rgba(21,159,255,.68);box-shadow:0 0 0 3px rgba(21,159,255,.08)}:global(textarea.sponsor-input){min-height:132px}'}</style>
  </form>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.15em] text-white/45">{label}</span>{children}</label>;}
