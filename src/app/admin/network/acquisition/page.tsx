'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import {
  FaArrowLeft,
  FaArrowRight,
  FaArrowUpRightFromSquare,
  FaBuildingCircleCheck,
  FaCircleCheck,
  FaClock,
  FaFileImport,
  FaGlobe,
  FaMagnifyingGlass,
  FaPeopleGroup,
} from 'react-icons/fa6';

type Inquiry={id:string;organization_name:string;organization_type:string;city:string|null;region:string;contact_name:string;contact_email:string;website_url:string|null;instagram_url:string|null;plan_interest:string;goals:string|null;status:string;source:string;converted_organization_id:string|null;created_at:string};
type Prospect={id:string;organization_name:string;organization_type:string;city:string|null;region:string;description:string|null;website_url:string|null;instagram_url:string|null;source_url:string;source_label:string|null;source_checked_at:string;contact_name:string|null;contact_role:string|null;contact_email:string|null;contact_phone:string|null;contact_instagram_url:string|null;contact_source_url:string|null;contact_checked_at:string|null;notes:string|null;status:string;outreach_status:string;last_contacted_at:string|null;follow_up_at:string|null;published_organization_id:string|null;created_at:string};
type Created={id:string;slug:string};
type ImportRow=Record<string,string>;

const TYPES=['league','tournament','program','club','team','media','creator','facility','training','other'];
const REGIONS=['central-virginia','hampton-roads','northern-virginia','shenandoah','southwest-virginia','statewide','other'];
const PROSPECT_STATUSES=['staged','ready','published','duplicate','archived'];
const OUTREACH=['not-contacted','queued','contacted','replied','interested','claim-sent','claimed','verified','paid-prospect','not-interested'];
const CSV_HEADERS=['organization_name','organization_type','region','city','website_url','instagram_url','facebook_url','x_url','youtube_url','source_url','source_label','description','contact_name','contact_role','contact_email','contact_phone','contact_instagram_url','contact_source_url','contact_checked_at','notes','status','outreach_status'];

export default function NetworkAcquisitionPage(){
  const {user,profile,loading:authLoading}=useAuth();
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const authorized=Boolean(user&&profile?.role==='admin');
  const [prospects,setProspects]=useState<Prospect[]>([]);
  const [inquiries,setInquiries]=useState<Inquiry[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [created,setCreated]=useState<Record<string,Created>>({});
  const [tab,setTab]=useState<'pipeline'|'import'|'inbound'>('pipeline');
  const [query,setQuery]=useState('');
  const [csv,setCsv]=useState(CSV_HEADERS.join(','));

  const load=useCallback(async()=>{
    if(!authorized||!db)return;
    setLoading(true); setError('');
    const [prospectResult,inquiryResult]=await Promise.all([
      db.from('network_acquisition_prospects').select('id,organization_name,organization_type,city,region,description,website_url,instagram_url,source_url,source_label,source_checked_at,contact_name,contact_role,contact_email,contact_phone,contact_instagram_url,contact_source_url,contact_checked_at,notes,status,outreach_status,last_contacted_at,follow_up_at,published_organization_id,created_at').order('created_at',{ascending:false}),
      db.from('network_partner_inquiries').select('id,organization_name,organization_type,city,region,contact_name,contact_email,website_url,instagram_url,plan_interest,goals,status,source,converted_organization_id,created_at').order('created_at',{ascending:false}),
    ]);
    if(prospectResult.error)setError(prospectResult.error.message); else setProspects(prospectResult.data??[]);
    if(inquiryResult.error)setError(current=>current||inquiryResult.error.message); else setInquiries(inquiryResult.data??[]);
    setLoading(false);
  },[authorized,db]);

  useEffect(()=>{if(!authLoading){if(authorized)void load();else setLoading(false)}},[authLoading,authorized,load]);

  const visibleProspects=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return prospects;
    return prospects.filter(item=>[item.organization_name,item.city,item.region,item.organization_type,item.outreach_status,item.contact_name,item.contact_role,item.contact_email,item.contact_phone].some(value=>value?.toLowerCase().includes(q)));
  },[prospects,query]);

  const dueFollowUps=prospects.filter(item=>item.follow_up_at&&new Date(item.follow_up_at)<=new Date()&&!['claimed','verified','paid-prospect','not-interested'].includes(item.outreach_status)).length;
  const notContacted=prospects.filter(item=>item.outreach_status==='not-contacted'||item.outreach_status==='queued').length;
  const publishedCount=prospects.filter(item=>item.published_organization_id).length;
  const contactReady=prospects.filter(item=>item.contact_email||item.contact_phone||item.contact_instagram_url).length;
  const claimPipeline=prospects.filter(item=>['contacted','replied','interested','claim-sent'].includes(item.outreach_status)).length;

  async function updateProspect(id:string,patch:Record<string,unknown>){
    setBusy(id); setError(''); setMessage('');
    const {error:updateError}=await db.from('network_acquisition_prospects').update(patch).eq('id',id);
    setBusy(null);
    if(updateError)return setError(updateError.message);
    setProspects(current=>current.map(item=>item.id===id?{...item,...patch} as Prospect:item));
  }

  async function saveContact(id:string,event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const clean=(key:string)=>{const value=String(form.get(key)??'').trim();return value||null};
    const contactSource=clean('contact_source_url');
    if(contactSource&&!/^https?:\/\//i.test(contactSource)){setError('Contact source must use http or https.');return}
    await updateProspect(id,{
      contact_name:clean('contact_name'),
      contact_role:clean('contact_role'),
      contact_email:clean('contact_email'),
      contact_phone:clean('contact_phone'),
      contact_instagram_url:clean('contact_instagram_url'),
      contact_source_url:contactSource,
      contact_checked_at:new Date().toISOString(),
    });
    setMessage('Contact research saved.');
  }

  async function publishProspect(id:string){
    setBusy(id); setError(''); setMessage('');
    const {data,error:rpcError}=await db.rpc('publish_network_acquisition_prospect',{p_prospect_id:id});
    setBusy(null);
    if(rpcError)return setError(rpcError.message);
    const row=Array.isArray(data)?data[0]:data;
    if(row?.organization_id&&row?.organization_slug){
      setCreated(current=>({...current,[id]:{id:row.organization_id,slug:row.organization_slug}}));
      setMessage(row.reused_existing?'Connected the prospect to an existing directory listing.':'Published a new free, unclaimed Network listing.');
    }
    await load();
  }

  async function convertInquiry(id:string){
    setBusy(id); setError(''); setMessage('');
    const {data,error:rpcError}=await db.rpc('convert_network_partner_inquiry',{p_inquiry_id:id});
    setBusy(null);
    if(rpcError)return setError(rpcError.message);
    const row=Array.isArray(data)?data[0]:data;
    if(row?.organization_id&&row?.organization_slug)setCreated(current=>({...current,[id]:{id:row.organization_id,slug:row.organization_slug}}));
    setMessage('Inbound organization is connected to the directory.');
    await load();
  }

  async function inquiryStatus(id:string,value:string){
    const {error:updateError}=await db.from('network_partner_inquiries').update({status:value}).eq('id',id);
    if(updateError)return setError(updateError.message);
    setInquiries(current=>current.map(item=>item.id===id?{...item,status:value}:item));
  }

  const parsed=useMemo(()=>parseCsv(csv),[csv]);
  const importIssues=parsed.rows.flatMap((row,index)=>validateImportRow(row).map(issue=>`Row ${index+2}: ${issue}`));

  async function runImport(){
    if(!parsed.rows.length||importIssues.length)return;
    setBusy('import'); setError(''); setMessage('');
    const {data,error:rpcError}=await db.rpc('import_network_acquisition_prospects',{p_rows:parsed.rows});
    setBusy(null);
    if(rpcError)return setError(rpcError.message);
    setMessage(`Import complete: ${data?.inserted??0} staged, ${data?.duplicates??0} duplicate${data?.duplicates===1?'':'s'} skipped.`);
    setTab('pipeline');
    await load();
  }

  if(authLoading||loading)return <Shell><p className="text-sm text-white/40">Loading acquisition engine…</p></Shell>;
  if(!authorized)return <Shell><h1 className="font-display text-4xl font-black uppercase">Admin access required.</h1></Shell>;

  return <Shell>
    <Link href="/admin/network" className="inline-flex items-center gap-2 text-xs font-black uppercase text-white/40 hover:text-white"><FaArrowLeft/> Network operations</Link>
    <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">RCL Network · Acquisition Engine</p>
        <h1 className="mt-2 font-display text-5xl font-black uppercase">Research. Publish. Claim.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Stage legitimate Virginia basketball organizations from public sources, publish accurate free listings, then manage outreach through claim, verification and paid-partner readiness.</p>
      </div>
      <Link href="/organizations" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs font-black uppercase text-white/70">View directory <FaArrowRight/></Link>
    </div>

    {error&&<p className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
    {message&&<p className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</p>}

    <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Stat value={prospects.length} label="Research prospects"/>
      <Stat value={contactReady} label="Contact-ready" accent="green"/>
      <Stat value={notContacted} label="Need first contact"/>
      <Stat value={claimPipeline} label="Active outreach"/>
      <Stat value={publishedCount} label="Prospects published" accent="green"/>
    </section>
    {dueFollowUps>0&&<div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[10px] font-black uppercase text-amber-200"><FaClock/> {dueFollowUps} follow-up{dueFollowUps===1?'':'s'} due</div>}

    <nav className="mt-10 flex flex-wrap gap-2" aria-label="Acquisition sections">
      <Tab active={tab==='pipeline'} onClick={()=>setTab('pipeline')}>Prospect pipeline</Tab>
      <Tab active={tab==='import'} onClick={()=>setTab('import')}>Import / stage</Tab>
      <Tab active={tab==='inbound'} onClick={()=>setTab('inbound')}>Inbound applications ({inquiries.length})</Tab>
    </nav>

    {tab==='pipeline'&&<section className="mt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Outbound CRM</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Virginia organization pipeline</h2></div>
        <label className="flex min-h-11 min-w-[260px] items-center gap-2 rounded-xl border border-white/10 bg-[#111820] px-3 text-white/45"><FaMagnifyingGlass/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search prospects…" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"/></label>
      </div>
      <div className="mt-5 space-y-3">
        {visibleProspects.map(item=>{const createdOrg=created[item.id]; const slug=createdOrg?.slug; return <article key={item.id} className="rounded-2xl border border-white/8 bg-[#111820]/75 p-5">
          <div className="grid gap-5 xl:grid-cols-[1.25fr_.72fr_.8fr_.9fr_auto] xl:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-2xl font-black uppercase">{item.organization_name}</h3>{item.published_organization_id&&<Pill tone="green">Listed</Pill>}<Pill>{pretty(item.organization_type)}</Pill></div>
              <p className="mt-2 text-xs text-white/40">{item.city?`${item.city} · `:''}{pretty(item.region)}</p>
              {item.description&&<p className="mt-2 line-clamp-2 max-w-xl text-xs leading-5 text-white/35">{item.description}</p>}
            </div>
            <div className="space-y-2 text-xs text-white/40">
              <a href={item.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-bold text-white/60 hover:text-white">Source verified <FaArrowUpRightFromSquare className="text-[10px]"/></a>
              <p>{item.source_label||'Public source'} · {new Date(item.source_checked_at).toLocaleDateString()}</p>
              {item.website_url&&<a href={item.website_url} target="_blank" rel="noreferrer" className="block font-bold text-white/60 hover:text-white">Official website</a>}
            </div>
            <div className="space-y-2 text-xs text-white/40">
              <p className="font-bold text-white/65">{item.contact_name||'Contact not researched yet'}{item.contact_role?<span className="font-normal text-white/35"> · {item.contact_role}</span>:null}</p>
              {item.contact_email&&<a href={`mailto:${item.contact_email}`} className="block hover:text-white">{item.contact_email}</a>}
              {item.contact_phone&&<a href={`tel:${item.contact_phone}`} className="block hover:text-white">{item.contact_phone}</a>}
              {item.contact_instagram_url&&<a href={item.contact_instagram_url} target="_blank" rel="noreferrer" className="block hover:text-white">Contact Instagram</a>}
              {item.contact_source_url&&<a href={item.contact_source_url} target="_blank" rel="noreferrer" className="block text-[10px] font-black uppercase text-white/50 hover:text-white">Contact source <FaArrowUpRightFromSquare className="ml-1 inline text-[9px]"/></a>}
              {item.contact_checked_at&&<p className="text-[10px] text-white/25">Checked {new Date(item.contact_checked_at).toLocaleDateString()}</p>}
              {item.follow_up_at&&<p className={new Date(item.follow_up_at)<=new Date()?'text-amber-200':'text-white/35'}>Follow up {new Date(item.follow_up_at).toLocaleDateString()}</p>}
            </div>
            <div className="grid gap-2">
              <select aria-label="Research status" disabled={busy===item.id} value={item.status} onChange={e=>void updateProspect(item.id,{status:e.target.value})} className="min-h-10 rounded-xl border border-white/10 bg-[#090D12] px-3 text-[10px] font-black uppercase text-white">{PROSPECT_STATUSES.map(value=><option key={value} value={value}>{pretty(value)}</option>)}</select>
              <select aria-label="Outreach status" disabled={busy===item.id} value={item.outreach_status} onChange={e=>void updateProspect(item.id,{outreach_status:e.target.value,last_contacted_at:['contacted','replied','interested','claim-sent'].includes(e.target.value)?new Date().toISOString():item.last_contacted_at})} className="min-h-10 rounded-xl border border-white/10 bg-[#090D12] px-3 text-[10px] font-black uppercase text-white">{OUTREACH.map(value=><option key={value} value={value}>{pretty(value)}</option>)}</select>
              <input aria-label="Follow-up date" type="date" value={toDateInput(item.follow_up_at)} onChange={e=>void updateProspect(item.id,{follow_up_at:e.target.value?new Date(`${e.target.value}T15:00:00`).toISOString():null})} className="min-h-10 rounded-xl border border-white/10 bg-[#090D12] px-3 text-[10px] font-bold text-white/70"/>
            </div>
            <div className="flex flex-wrap gap-2 xl:justify-end">
              {!item.published_organization_id&&item.status!=='archived'?<button disabled={busy===item.id} onClick={()=>void publishProspect(item.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-rcl-orange px-3 text-[10px] font-black uppercase text-black disabled:opacity-50"><FaBuildingCircleCheck/>{busy===item.id?'Publishing…':'Publish listing'}</button>:<span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-400/20 px-3 text-[10px] font-black uppercase text-emerald-300"><FaGlobe/> Connected</span>}
              {slug&&<Link href={`/organizations/${slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase text-white/65">Open listing <FaArrowRight/></Link>}
            </div>
          </div>
          <details className="mt-4 border-t border-white/8 pt-4">
            <summary className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-white/45 hover:text-white">Edit outreach contact</summary>
            <form onSubmit={e=>void saveContact(item.id,e)} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input name="contact_name" defaultValue={item.contact_name??''} placeholder="Contact name" className="min-h-10 rounded-xl border border-white/10 bg-[#090D12] px-3 text-xs text-white outline-none"/>
              <input name="contact_role" defaultValue={item.contact_role??''} placeholder="Role / title" className="min-h-10 rounded-xl border border-white/10 bg-[#090D12] px-3 text-xs text-white outline-none"/>
              <input name="contact_email" type="email" defaultValue={item.contact_email??''} placeholder="Email" className="min-h-10 rounded-xl border border-white/10 bg-[#090D12] px-3 text-xs text-white outline-none"/>
              <input name="contact_phone" type="tel" defaultValue={item.contact_phone??''} placeholder="Phone" className="min-h-10 rounded-xl border border-white/10 bg-[#090D12] px-3 text-xs text-white outline-none"/>
              <input name="contact_instagram_url" type="url" defaultValue={item.contact_instagram_url??''} placeholder="Instagram URL" className="min-h-10 rounded-xl border border-white/10 bg-[#090D12] px-3 text-xs text-white outline-none md:col-span-1"/>
              <input name="contact_source_url" type="url" defaultValue={item.contact_source_url??''} placeholder="Contact source URL" className="min-h-10 rounded-xl border border-white/10 bg-[#090D12] px-3 text-xs text-white outline-none md:col-span-1 xl:col-span-2"/>
              <button disabled={busy===item.id} className="min-h-10 rounded-xl border border-rcl-orange/35 px-4 text-[10px] font-black uppercase text-rcl-orange disabled:opacity-50">Save contact research</button>
            </form>
          </details>
        </article>})}
        {!visibleProspects.length&&<Empty>{prospects.length?'No prospects match that search.':'No researched prospects yet. Use Import / stage to build the first cohort.'}</Empty>}
      </div>
    </section>}

    {tab==='import'&&<section className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-3xl border border-white/8 bg-[#111820]/75 p-6">
        <p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-orange">Research staging</p>
        <h2 className="mt-2 font-display text-3xl font-black uppercase">Import vetted prospects.</h2>
        <p className="mt-3 text-sm leading-6 text-white/45">Paste CSV with headers. Every row must include an organization name and an authoritative public source URL. Importing does not publish a listing; it creates an internal prospect for review and outreach.</p>
        <textarea value={csv} onChange={e=>setCsv(e.target.value)} spellCheck={false} className="mt-5 min-h-[320px] w-full rounded-2xl border border-white/10 bg-[#090D12] p-4 font-mono text-xs leading-5 text-white/70 outline-none focus:border-rcl-orange/50"/>
        <div className="mt-4 flex flex-wrap items-center gap-3"><button onClick={()=>setCsv(CSV_HEADERS.join(','))} className="min-h-10 rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase text-white/60">Reset headers</button><button disabled={!parsed.rows.length||Boolean(importIssues.length)||busy==='import'} onClick={()=>void runImport()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-[10px] font-black uppercase text-black disabled:cursor-not-allowed disabled:opacity-40"><FaFileImport/>{busy==='import'?'Importing…':`Stage ${parsed.rows.length} prospect${parsed.rows.length===1?'':'s'}`}</button></div>
        {parsed.error&&<p className="mt-4 text-xs text-red-200">{parsed.error}</p>}
        {importIssues.length>0&&<div className="mt-4 rounded-xl border border-red-400/15 bg-red-500/5 p-4 text-xs leading-5 text-red-200">{importIssues.slice(0,8).map(issue=><p key={issue}>{issue}</p>)}{importIssues.length>8&&<p>+ {importIssues.length-8} more issue(s)</p>}</div>}
      </div>
      <div className="rounded-3xl border border-white/8 bg-[#111820]/75 p-6">
        <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Preview</p>
        <h3 className="mt-2 font-display text-2xl font-black uppercase">{parsed.rows.length} parsed row{parsed.rows.length===1?'':'s'}</h3>
        <div className="mt-5 space-y-3">{parsed.rows.slice(0,8).map((row,index)=><div key={`${row.organization_name}-${index}`} className="rounded-xl border border-white/8 bg-[#090D12] p-4"><b className="text-sm">{row.organization_name||'Missing name'}</b><p className="mt-1 text-xs text-white/35">{pretty(row.organization_type||'program')} · {pretty(row.region||'central-virginia')} {row.city?`· ${row.city}`:''}</p><p className="mt-2 truncate text-[10px] text-white/30">{row.source_url||'Missing source URL'}</p></div>)}</div>
        <div className="mt-6 rounded-xl border border-white/8 p-4 text-xs leading-5 text-white/40"><b className="text-white/65">Import guardrails</b><p className="mt-2">Existing directory listings and active prospects are deduplicated by normalized name or official website. Imported prospects remain private until an admin publishes them. Publication always creates an unclaimed, unverified free Network listing.</p></div>
      </div>
    </section>}

    {tab==='inbound'&&<section className="mt-7">
      <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Inbound acquisition</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Organization applications</h2><p className="mt-2 max-w-2xl text-sm text-white/40">Organizations that came to RCL themselves stay separate from researched outbound prospects.</p></div>
      <div className="mt-5 space-y-3">{inquiries.map(item=>{const converted=created[item.id]||null;return <article key={item.id} className="rounded-2xl border border-white/8 bg-[#111820]/75 p-5"><div className="grid gap-5 lg:grid-cols-[1.3fr_.8fr_.7fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-2xl font-black uppercase">{item.organization_name}</h3>{item.converted_organization_id&&<Pill tone="green">Listed</Pill>}<Pill>{pretty(item.organization_type)}</Pill></div><p className="mt-1 text-xs text-white/40">{item.contact_name} · {item.contact_email}</p>{item.goals&&<p className="mt-2 line-clamp-2 text-xs leading-5 text-white/35">{item.goals}</p>}</div><div className="text-xs leading-5 text-white/40"><p>{item.city?`${item.city} · `:''}{pretty(item.region)}</p><p>{pretty(item.plan_interest)} · {new Date(item.created_at).toLocaleDateString()}</p></div><div className="flex flex-col items-start gap-2">{item.website_url&&<a href={item.website_url} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase text-white/60">Website</a>}{item.instagram_url&&<a href={item.instagram_url} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase text-white/60">Instagram</a>}{converted&&<Link href={`/organizations/${converted.slug}`} className="text-[10px] font-black uppercase text-emerald-300">Open listing</Link>}</div><div className="flex flex-wrap gap-2 lg:justify-end">{!item.converted_organization_id?<button disabled={busy===item.id} onClick={()=>void convertInquiry(item.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-rcl-orange px-3 text-[10px] font-black uppercase text-black disabled:opacity-50"><FaBuildingCircleCheck/>{busy===item.id?'Creating…':'Create / connect listing'}</button>:<span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-400/20 px-3 text-[10px] font-black uppercase text-emerald-300"><FaGlobe/> Listing connected</span>}<select value={item.status} onChange={e=>void inquiryStatus(item.id,e.target.value)} className="min-h-10 rounded-xl border border-white/10 bg-[#090D12] px-3 text-[10px] font-black uppercase text-white"><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="closed">Closed</option></select></div></div></article>})}{!inquiries.length&&<Empty>No inbound organization applications yet.</Empty>}</div>
    </section>}
  </Shell>;
}

function parseCsv(input:string):{rows:ImportRow[];error:string}{
  const lines=input.split(/\r?\n/).filter(line=>line.trim().length>0);
  if(lines.length<=1)return {rows:[],error:''};
  const headers=parseCsvLine(lines[0]).map(value=>value.trim());
  if(!headers.includes('organization_name')&&!headers.includes('name'))return {rows:[],error:'CSV must include organization_name (or name).'};
  const rows=lines.slice(1).map(line=>{const values=parseCsvLine(line); return headers.reduce<ImportRow>((acc,key,index)=>{acc[key]=(values[index]??'').trim(); return acc;},{});});
  return {rows,error:''};
}
function parseCsvLine(line:string){const out:string[]=[];let current='';let quoted=false;for(let i=0;i<line.length;i++){const char=line[i];if(char==='"'){if(quoted&&line[i+1]==='"'){current+='"';i++;}else quoted=!quoted;}else if(char===','&&!quoted){out.push(current);current='';}else current+=char;}out.push(current);return out;}
function validateImportRow(row:ImportRow){const issues:string[]=[];const name=row.organization_name||row.name;if(!name||name.trim().length<2)issues.push('organization_name is required');if(!row.source_url||!/^https?:\/\//i.test(row.source_url))issues.push('source_url must be an http(s) URL');if(row.website_url&&!/^https?:\/\//i.test(row.website_url))issues.push('website_url must be an http(s) URL');if(row.contact_source_url&&!/^https?:\/\//i.test(row.contact_source_url))issues.push('contact_source_url must be an http(s) URL');if(row.organization_type&&!TYPES.includes(row.organization_type))issues.push(`organization_type must be one of ${TYPES.join(', ')}`);if(row.region&&!REGIONS.includes(row.region))issues.push(`region must be one of ${REGIONS.join(', ')}`);if(row.status&&!PROSPECT_STATUSES.includes(row.status))issues.push('invalid status');if(row.outreach_status&&!OUTREACH.includes(row.outreach_status))issues.push('invalid outreach_status');return issues;}
function toDateInput(value:string|null){if(!value)return '';const date=new Date(value);if(Number.isNaN(date.getTime()))return '';return date.toISOString().slice(0,10)}
function Stat({value,label,accent}:{value:number;label:string;accent?:'green'}){return <div className="rounded-2xl border border-white/8 bg-[#111820]/75 p-5"><strong className={`font-display text-4xl font-black ${accent==='green'?'text-emerald-300':'text-white'}`}>{value}</strong><span className="mt-1 block text-[10px] font-black uppercase tracking-[.14em] text-white/35">{label}</span></div>}
function Pill({children,tone}:{children:React.ReactNode;tone?:'green'}){return <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${tone==='green'?'border-emerald-400/20 text-emerald-300':'border-white/10 text-white/45'}`}>{children}</span>}
function Tab({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}){return <button onClick={onClick} className={`min-h-10 rounded-xl px-4 text-[10px] font-black uppercase tracking-wider ${active?'bg-rcl-orange text-black':'border border-white/10 bg-white/[.025] text-white/55 hover:text-white'}`}>{children}</button>}
function Empty({children}:{children:React.ReactNode}){return <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/35">{children}</p>}
function Shell({children}:{children:React.ReactNode}){return <main className="min-h-screen bg-[#090D12] pb-24 text-white"><Container maxWidth="xl" className="py-12 sm:py-16">{children}</Container></main>}
function pretty(value:string){return value.replaceAll('-',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}
