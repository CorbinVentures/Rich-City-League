'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { SPONSOR_INVENTORY, sponsorInventoryByCode, sponsorMoney } from '@/lib/sponsorship';
import {
  FaArrowLeft, FaArrowRight, FaBullhorn, FaChartLine, FaCircleCheck,
  FaClock, FaHandshake, FaRectangleAd,
} from 'react-icons/fa6';

type Lead={
  id:string;organization_name:string;contact_name:string;contact_email:string;website_url:string|null;city:string|null;region:string;
  plan_interest:string;goals:string|null;status:string;created_at:string;converted_organization_id:string|null;
};
type Campaign={
  id:string;organization_id:string;name:string;package:string;objective:string;requested_placement:string;requested_budget_cents:number|null;
  requested_starts_at:string;requested_ends_at:string;status:string;created_at:string;organization:{name:string;slug:string}|null;
};

const statuses=['new','contacted','qualified','closed'] as const;

export default function AdminSponsorsPage(){
  const {user,profile,loading:authLoading}=useAuth();
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const authorized=Boolean(user&&profile?.role==='admin');
  const [leads,setLeads]=useState<Lead[]>([]);const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState<string|null>(null);const [error,setError]=useState('');const [message,setMessage]=useState('');

  const load=useCallback(async()=>{
    if(!authorized||!db)return;
    setLoading(true);setError('');
    const [leadResult,campaignResult]=await Promise.all([
      db.from('network_partner_inquiries').select('id,organization_name,contact_name,contact_email,website_url,city,region,plan_interest,goals,status,created_at,converted_organization_id').in('plan_interest',['business-advertising','major-sponsor']).order('created_at',{ascending:false}).limit(200),
      db.from('network_campaigns').select('id,organization_id,name,package,objective,requested_placement,requested_budget_cents,requested_starts_at,requested_ends_at,status,created_at,organization:network_organizations!organization_id(name,slug)').order('created_at',{ascending:false}).limit(200),
    ]);
    if(leadResult.error||campaignResult.error)setError(leadResult.error?.message||campaignResult.error?.message||'Unable to load sponsor operations.');
    setLeads(leadResult.data??[]);
    setCampaigns((campaignResult.data??[]).map((row:any)=>({...row,organization:Array.isArray(row.organization)?row.organization[0]:row.organization})));
    setLoading(false);
  },[authorized,db]);

  useEffect(()=>{if(!authLoading){if(authorized)void load();else setLoading(false);}},[authLoading,authorized,load]);

  async function setStatus(id:string,status:(typeof statuses)[number]){
    setBusy(id);setError('');setMessage('');
    const {error:updateError}=await db.from('network_partner_inquiries').update({status}).eq('id',id);
    setBusy(null);if(updateError)return setError(updateError.message);
    setLeads(current=>current.map(item=>item.id===id?{...item,status}:item));setMessage('Sponsor lead moved to '+status+'.');
  }

  if(authLoading||loading)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="xl" className="py-16"><p className="text-sm text-white/45">Loading Sponsorship Center…</p></Container></main>;
  if(!authorized)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-16"><h1 className="font-display text-4xl font-black uppercase">Admin access required.</h1><Link href="/" className="mt-5 inline-flex text-rcl-blue">Return to RCH</Link></Container></main>;

  const pipelineValue=leads.filter(item=>item.status!=='closed').reduce((sum,item)=>sum+(leadProduct(item)?.startingPriceCents??0),0);
  const campaignBudget=campaigns.filter(item=>!['rejected','cancelled'].includes(item.status)).reduce((sum,item)=>sum+(item.requested_budget_cents??0),0);
  const qualified=leads.filter(item=>item.status==='qualified').length;
  const pendingCampaigns=campaigns.filter(item=>item.status==='pending').length;
  const liveCampaigns=campaigns.filter(item=>item.status==='active').length;

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_82%_10%,rgba(21,159,255,.14),transparent_28%),radial-gradient(circle_at_12%_88%,rgba(249,115,22,.07),transparent_26%),linear-gradient(145deg,#071522,#03070d)]">
      <Container maxWidth="xl" className="py-10 sm:py-14">
        <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase text-white/40"><FaArrowLeft/> Admin</Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCH Sponsorship Operations</p><h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-.04em] sm:text-6xl">Sponsor <span className="text-rcl-blue">command center.</span></h1><p className="mt-4 max-w-3xl text-sm leading-6 text-white/45">Move sponsor leads from interest to qualified conversations, watch requested inventory and hand approved campaigns into the existing RCH delivery engine.</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/network/campaigns" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 px-4 text-xs font-black uppercase text-rcl-blue">Campaign control <FaArrowRight/></Link><Link href="/sponsors" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black uppercase text-white/50">Public Sponsor Center</Link></div></div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-8">
      {error&&<p className="mb-5 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
      {message&&<p className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] p-4 text-sm text-emerald-200">{message}</p>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat icon={<FaHandshake/>} label="Open sponsor leads" value={leads.filter(item=>item.status!=='closed').length}/>
        <Stat icon={<FaCircleCheck/>} label="Qualified" value={qualified}/>
        <Stat icon={<FaChartLine/>} label="Starting pipeline" value={sponsorMoney(pipelineValue)}/>
        <Stat icon={<FaClock/>} label="Campaigns to review" value={pendingCampaigns}/>
        <Stat icon={<FaRectangleAd/>} label="Live campaigns" value={liveCampaigns}/>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-rcl-orange">Sales pipeline</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Sponsor leads</h2></div><span className="text-[10px] text-white/30">Starting value excludes custom deals.</span></div>
          <div className="mt-5 space-y-3">{leads.length?leads.map(lead=><LeadCard key={lead.id} lead={lead} busy={busy===lead.id} onStatus={status=>void setStatus(lead.id,status)}/>):<Empty text="No business advertising or major sponsorship leads yet."/>}</div>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/65 p-6"><p className="text-[10px] font-black uppercase tracking-[.15em] text-rcl-blue">Requested media</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Campaign pipeline</h2><div className="mt-5 space-y-3">{campaigns.slice(0,12).map(item=><CampaignCard key={item.id} campaign={item}/>)}</div>{!campaigns.length&&<Empty text="No campaigns have been submitted yet."/>}<Link href="/admin/network/campaigns" className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-blue">Open delivery controls <FaArrowRight/></Link></section>
          <section className="rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.045] p-6"><p className="text-[10px] font-black uppercase tracking-[.15em] text-rcl-orange">Working media value</p><strong className="mt-2 block font-display text-5xl font-black">{sponsorMoney(campaignBudget)}</strong><p className="mt-2 text-xs leading-5 text-white/35">Sum of submitted campaign budget preferences that are not rejected or cancelled. This is not booked revenue.</p></section>
          <section className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-[10px] font-black uppercase tracking-[.15em] text-white/35">Inventory architecture</p><div className="mt-4 grid gap-2">{SPONSOR_INVENTORY.map(item=><div key={item.code} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/15 px-4 py-3"><div><b className="block text-xs text-white/70">{item.name}</b><span className="text-[9px] uppercase text-white/25">{item.kind.replaceAll('-',' ')}</span></div><span className="text-[10px] font-black text-rcl-orange">{item.priceLabel}</span></div>)}</div></section>
        </div>
      </section>
    </Container>
  </main>;
}

function leadProduct(lead:Lead){
  const match=lead.goals?.match(/\(([a-z0-9-]+)\)/i);
  return sponsorInventoryByCode(match?.[1]);
}

function LeadCard({lead,busy,onStatus}:{lead:Lead;busy:boolean;onStatus:(status:(typeof statuses)[number])=>void}){
  const product=leadProduct(lead);
  return <article className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><b className="block text-sm text-white/80">{lead.organization_name}</b><span className="mt-1 block text-[10px] text-white/35">{lead.contact_name} · {lead.contact_email}</span></div><span className={statusClass(lead.status)}>{lead.status}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><p className="text-[10px] text-white/35"><b className="text-white/55">Interest:</b> {product?.name??lead.plan_interest.replaceAll('-',' ')}</p><p className="text-[10px] text-white/35"><b className="text-white/55">Floor:</b> {product?sponsorMoney(product.startingPriceCents):'Custom / unknown'}</p><p className="text-[10px] text-white/35"><b className="text-white/55">Market:</b> {lead.city??lead.region}</p><p className="text-[10px] text-white/35"><b className="text-white/55">Received:</b> {new Date(lead.created_at).toLocaleDateString()}</p></div>{lead.goals&&<p className="mt-3 line-clamp-4 whitespace-pre-line text-[11px] leading-5 text-white/30">{lead.goals}</p>}<div className="mt-4 flex flex-wrap gap-2">{statuses.filter(status=>status!==lead.status).map(status=><button key={status} disabled={busy} onClick={()=>onStatus(status)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[9px] font-black uppercase text-white/45 disabled:opacity-40">{status}</button>)}{lead.website_url&&<a href={lead.website_url} target="_blank" rel="noreferrer" className="rounded-lg border border-rcl-blue/20 px-2.5 py-1.5 text-[9px] font-black uppercase text-rcl-blue">Website</a>}</div></article>;
}

function CampaignCard({campaign}:{campaign:Campaign}){return <article className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex items-start justify-between gap-3"><div><b className="block text-xs text-white/75">{campaign.name}</b><span className="mt-1 block text-[9px] uppercase tracking-wide text-white/25">{campaign.organization?.name??'Organization'} · {campaign.requested_placement}</span></div><span className={statusClass(campaign.status)}>{campaign.status}</span></div><div className="mt-3 flex flex-wrap gap-3 text-[9px] text-white/30"><span>{campaign.requested_budget_cents?sponsorMoney(campaign.requested_budget_cents):'Budget TBD'}</span><span>{new Date(campaign.requested_starts_at).toLocaleDateString()}</span></div></article>;}
function statusClass(status:string){const tone=status==='qualified'||status==='active'?'border-emerald-400/25 text-emerald-300':status==='closed'||status==='rejected'||status==='cancelled'?'border-red-400/25 text-red-300':status==='approved'?'border-rcl-blue/25 text-rcl-blue':'border-rcl-orange/25 text-rcl-orange';return 'rounded-full border px-2.5 py-1 text-[9px] font-black uppercase '+tone;}
function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:number|string}){return <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><span className="text-rcl-blue">{icon}</span><strong className="mt-3 block font-display text-3xl font-black">{typeof value==='number'?value.toLocaleString():value}</strong><span className="text-[9px] font-black uppercase tracking-[.13em] text-white/35">{label}</span></div>;}
function Empty({text}:{text:string}){return <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/30">{text}</p>;}
