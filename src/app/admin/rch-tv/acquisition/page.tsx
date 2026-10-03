'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaArrowUpRightFromSquare, FaCircleCheck, FaClock, FaFilm, FaMagnifyingGlass, FaPlus, FaScaleBalanced } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Acquisition={
  id:string;title:string;project_type:string;filmmaker_or_company:string|null;rights_owner:string|null;
  contact_name:string|null;contact_email:string|null;contact_phone:string|null;website_url:string|null;
  trailer_url:string|null;screener_url:string|null;source_url:string|null;runtime_minutes:number|null;release_year:number|null;
  status:string;territory:string;rights_type:string;exclusivity:string;compensation_model:string;revenue_share_percent:number|null;
  flat_fee_cents:number|null;term_start:string|null;term_end:string|null;rights_verified:boolean;license_document_url:string|null;
  last_contacted_at:string|null;next_follow_up_at:string|null;notes:string|null;published_media_id:string|null;created_at:string;updated_at:string;
};

const STAGES=[['prospect','Prospect'],['contacted','Contacted'],['screening','Screening'],['rights_review','Rights Review'],['negotiating','Negotiating'],['licensed','Licensed'],['published','Published']] as const;
const TERMINAL=[['declined','Declined'],['archived','Archived']] as const;
const PROJECT_TYPES=['film','documentary','series','short','special','other'];
const RIGHTS_TYPES=['svod','avod','tvod','free_streaming','mixed','other'];
const COMPENSATION=['revenue_share','flat_fee','hybrid','no_fee','undecided'];
const EXCLUSIVITY=['non-exclusive','exclusive','unknown'];
const field='min-h-11 w-full rounded-xl border border-white/10 bg-[#071018] px-3 text-sm text-white outline-none focus:border-rcl-blue/55';
const area='w-full rounded-xl border border-white/10 bg-[#071018] p-3 text-sm text-white outline-none focus:border-rcl-blue/55';

export default function RchTvAcquisitionPage(){
  const {user,profile,loading:authLoading}=useAuth();
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const authorized=Boolean(user&&profile?.role==='admin');
  const [items,setItems]=useState<Acquisition[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [query,setQuery]=useState('');
  const [stage,setStage]=useState('active');

  const load=useCallback(async()=>{
    if(!authorized||!db){setLoading(false);return;}
    setLoading(true);setError('');
    const {data,error:loadError}=await db.from('rch_tv_acquisitions').select('*').order('updated_at',{ascending:false});
    if(loadError)setError(loadError.message);else setItems((data??[]) as Acquisition[]);
    setLoading(false);
  },[authorized,db]);

  useEffect(()=>{if(!authLoading)void load();},[authLoading,load]);

  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return items.filter(item=>{
      const stageMatch=stage==='active'?STAGES.some(([value])=>value===item.status):stage==='all'?true:item.status===stage;
      const queryMatch=!q||[item.title,item.filmmaker_or_company,item.rights_owner,item.contact_name,item.contact_email,item.project_type,item.territory].some(value=>value?.toLowerCase().includes(q));
      return stageMatch&&queryMatch;
    });
  },[items,query,stage]);

  const due=items.filter(item=>item.next_follow_up_at&&new Date(item.next_follow_up_at)<=new Date()&&!['published','declined','archived'].includes(item.status)).length;
  const licensed=items.filter(item=>item.status==='licensed'||item.status==='published').length;
  const review=items.filter(item=>['rights_review','negotiating'].includes(item.status)).length;
  const screening=items.filter(item=>item.status==='screening').length;

  async function createProspect(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!db||!user)return;
    const form=new FormData(event.currentTarget);
    const title=String(form.get('title')??'').trim();
    if(!title)return setError('Add a title.');
    const sourceUrl=String(form.get('source_url')??'').trim();
    if(sourceUrl&&!/^https?:\/\//i.test(sourceUrl))return setError('Source URL must use http or https.');
    setBusy('create');setError('');setNotice('');
    const {error:insertError}=await db.from('rch_tv_acquisitions').insert({
      title,project_type:String(form.get('project_type')??'documentary'),filmmaker_or_company:clean(form,'filmmaker_or_company'),
      contact_name:clean(form,'contact_name'),contact_email:clean(form,'contact_email'),website_url:clean(form,'website_url'),
      trailer_url:clean(form,'trailer_url'),source_url:sourceUrl||null,notes:clean(form,'notes'),created_by:user.id,updated_by:user.id
    });
    setBusy('');
    if(insertError)return setError(insertError.message);
    event.currentTarget.reset();setNotice('RCH TV prospect added.');await load();
  }

  async function updateItem(id:string,patch:Record<string,unknown>,message?:string){
    if(!db||!user)return;
    setBusy(id);setError('');setNotice('');
    const {error:updateError}=await db.from('rch_tv_acquisitions').update({...patch,updated_by:user.id}).eq('id',id);
    setBusy('');
    if(updateError)return setError(updateError.message);
    setItems(current=>current.map(item=>item.id===id?{...item,...patch,updated_at:new Date().toISOString()} as Acquisition:item));
    if(message)setNotice(message);
  }

  async function saveDeal(item:Acquisition,event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const pct=numberOrNull(form.get('revenue_share_percent'));
    if(pct!==null&&(pct<0||pct>100))return setError('Revenue share must be between 0% and 100%.');
    const flat=numberOrNull(form.get('flat_fee'));
    await updateItem(item.id,{
      filmmaker_or_company:clean(form,'filmmaker_or_company'),rights_owner:clean(form,'rights_owner'),contact_name:clean(form,'contact_name'),
      contact_email:clean(form,'contact_email'),contact_phone:clean(form,'contact_phone'),website_url:clean(form,'website_url'),
      trailer_url:clean(form,'trailer_url'),screener_url:clean(form,'screener_url'),source_url:clean(form,'source_url'),
      runtime_minutes:numberOrNull(form.get('runtime_minutes')),release_year:numberOrNull(form.get('release_year')),
      territory:String(form.get('territory')??'United States').trim()||'United States',rights_type:String(form.get('rights_type')??'svod'),
      exclusivity:String(form.get('exclusivity')??'non-exclusive'),compensation_model:String(form.get('compensation_model')??'undecided'),
      revenue_share_percent:pct,flat_fee_cents:flat===null?null:Math.round(flat*100),term_start:clean(form,'term_start'),term_end:clean(form,'term_end'),
      license_document_url:clean(form,'license_document_url'),next_follow_up_at:dateToIso(clean(form,'next_follow_up_at')),notes:clean(form,'notes')
    },'Rights and deal details saved.');
  }

  if(authLoading||loading)return <Shell><p className="text-sm text-white/45">Loading RCH TV acquisition pipeline…</p></Shell>;
  if(!authorized)return <Shell><h1 className="font-display text-4xl font-black uppercase">Admin access required.</h1></Shell>;

  return <Shell>
    <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase text-white/40 hover:text-white"><FaArrowLeft/>Admin</Link>
    <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCH TV · Rights Acquisition</p><h1 className="mt-2 font-display text-5xl font-black uppercase">Find it. Screen it. License it.</h1><p className="mt-3 text-sm leading-6 text-white/45">Track independent basketball films, documentaries and creator programming from discovery through rights review, negotiation, licensing and publication.</p></div>
      <Link href="/media" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 bg-rcl-blue/10 px-4 text-xs font-black uppercase text-rcl-blue">Open RCH TV <FaArrowRight/></Link>
    </div>

    {error&&<p className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
    {notice&&<p className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</p>}

    <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat value={items.length} label="Total titles"/><Stat value={screening} label="In screening"/><Stat value={review} label="Rights / negotiation"/><Stat value={licensed} label="Licensed or published" accent/></section>
    {due>0&&<p className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[10px] font-black uppercase text-amber-200"><FaClock/>{due} follow-up{due===1?'':'s'} due</p>}

    <section className="mt-8 rounded-3xl border border-white/10 bg-white/[.025] p-6">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaPlus/></span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">New prospect</p><h2 className="font-display text-2xl font-black uppercase">Add something worth screening.</h2></div></div>
      <form onSubmit={createProspect} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Title"><input name="title" required maxLength={180} className={field} placeholder="Film / series title"/></Field>
        <Field label="Type"><select name="project_type" className={field}>{PROJECT_TYPES.map(v=><option key={v} value={v}>{pretty(v)}</option>)}</select></Field>
        <Field label="Filmmaker / company"><input name="filmmaker_or_company" className={field} placeholder="Producer, studio or creator"/></Field>
        <Field label="Contact email"><input name="contact_email" type="email" className={field} placeholder="producer@example.com"/></Field>
        <Field label="Contact name"><input name="contact_name" className={field}/></Field>
        <Field label="Website"><input name="website_url" type="url" className={field} placeholder="https://…"/></Field>
        <Field label="Trailer"><input name="trailer_url" type="url" className={field} placeholder="https://…"/></Field>
        <Field label="Research source"><input name="source_url" type="url" className={field} placeholder="https://…"/></Field>
        <label className="md:col-span-2 xl:col-span-3 text-[10px] font-black uppercase tracking-wider text-white/35">Initial notes<textarea name="notes" rows={3} className={area} placeholder="Why it fits RCH TV, audience, story, rights lead…"/></label>
        <button disabled={busy==='create'} className="min-h-12 self-end rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black disabled:opacity-50">{busy==='create'?'Adding…':'Add prospect'}</button>
      </form>
    </section>

    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-white/35">Acquisition CRM</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Programming pipeline</h2></div><label className="flex min-h-11 min-w-[260px] items-center gap-2 rounded-xl border border-white/10 bg-[#071018] px-3 text-white/45"><FaMagnifyingGlass/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search titles, creators, rights owners…" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"/></label></div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        <StageButton active={stage==='active'} onClick={()=>setStage('active')} label="Active" count={items.filter(i=>STAGES.some(([s])=>s===i.status)).length}/>
        {STAGES.map(([value,label])=><StageButton key={value} active={stage===value} onClick={()=>setStage(value)} label={label} count={items.filter(i=>i.status===value).length}/>)}
        {TERMINAL.map(([value,label])=><StageButton key={value} active={stage===value} onClick={()=>setStage(value)} label={label} count={items.filter(i=>i.status===value).length}/>)}
        <StageButton active={stage==='all'} onClick={()=>setStage('all')} label="All" count={items.length}/>
      </div>

      <div className="mt-5 space-y-4">
        {visible.map(item=><article key={item.id} className="rounded-3xl border border-white/10 bg-[#111820]/75 p-5 sm:p-6">
          <div className="grid gap-5 xl:grid-cols-[1.2fr_.7fr_.8fr_auto] xl:items-center">
            <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-2xl font-black uppercase">{item.title}</h3>{item.rights_verified&&<Pill>Rights verified</Pill>}</div><p className="mt-2 text-xs text-white/40">{pretty(item.project_type)}{item.release_year?' · '+item.release_year:''}{item.runtime_minutes?' · '+item.runtime_minutes+' min':''}</p><p className="mt-1 text-sm text-white/55">{item.filmmaker_or_company||'Filmmaker / company not researched yet'}</p></div>
            <div className="text-xs leading-5 text-white/40"><p className="font-black uppercase text-white/60">{pretty(item.compensation_model)}</p><p>{item.rights_type.toUpperCase()} · {pretty(item.exclusivity)}</p><p>{item.territory}</p></div>
            <div className="text-xs leading-5 text-white/40"><p>{item.contact_name||'No contact name'}</p>{item.contact_email&&<a href={'mailto:'+item.contact_email} className="block text-rcl-blue">{item.contact_email}</a>}{item.next_follow_up_at&&<p className={new Date(item.next_follow_up_at)<=new Date()?'text-amber-200':'text-white/35'}>Follow up {new Date(item.next_follow_up_at).toLocaleDateString()}</p>}</div>
            <select aria-label="Pipeline status" value={item.status} disabled={busy===item.id} onChange={e=>void updateItem(item.id,{status:e.target.value,...(e.target.value==='contacted'?{last_contacted_at:new Date().toISOString()}: {})},'Moved '+item.title+' to '+pretty(e.target.value)+'.')} className="min-h-11 rounded-xl border border-white/10 bg-[#071018] px-3 text-[10px] font-black uppercase text-white">{[...STAGES,...TERMINAL].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
            {item.trailer_url&&<a href={item.trailer_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase text-white/60">Trailer <FaArrowUpRightFromSquare/></a>}
            {item.screener_url&&<a href={item.screener_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rcl-blue/20 px-3 text-[10px] font-black uppercase text-rcl-blue">Screener <FaFilm/></a>}
            {item.source_url&&<a href={item.source_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase text-white/60">Research source <FaArrowUpRightFromSquare/></a>}
            {item.license_document_url&&<a href={item.license_document_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-400/20 px-3 text-[10px] font-black uppercase text-emerald-300">License <FaScaleBalanced/></a>}
            <button type="button" disabled={busy===item.id} onClick={()=>void updateItem(item.id,{rights_verified:!item.rights_verified},item.rights_verified?'Rights verification removed.':'Rights marked verified.')} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rcl-orange/20 px-3 text-[10px] font-black uppercase text-rcl-orange">{item.rights_verified?<><FaCircleCheck/>Verified</>:<>Verify rights</>}</button>
          </div>
          <details className="mt-4 rounded-2xl border border-white/8 bg-black/15 p-4">
            <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[.18em] text-white/50">Rights, deal & contact details</summary>
            <form onSubmit={e=>void saveDeal(item,e)} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Filmmaker / company"><input name="filmmaker_or_company" defaultValue={item.filmmaker_or_company??''} className={field}/></Field><Field label="Rights owner"><input name="rights_owner" defaultValue={item.rights_owner??''} className={field}/></Field><Field label="Contact name"><input name="contact_name" defaultValue={item.contact_name??''} className={field}/></Field><Field label="Contact email"><input name="contact_email" type="email" defaultValue={item.contact_email??''} className={field}/></Field>
              <Field label="Contact phone"><input name="contact_phone" type="tel" defaultValue={item.contact_phone??''} className={field}/></Field><Field label="Website"><input name="website_url" type="url" defaultValue={item.website_url??''} className={field}/></Field><Field label="Trailer URL"><input name="trailer_url" type="url" defaultValue={item.trailer_url??''} className={field}/></Field><Field label="Screener URL"><input name="screener_url" type="url" defaultValue={item.screener_url??''} className={field}/></Field>
              <Field label="Research source"><input name="source_url" type="url" defaultValue={item.source_url??''} className={field}/></Field><Field label="Runtime minutes"><input name="runtime_minutes" type="number" min="1" max="600" defaultValue={item.runtime_minutes??''} className={field}/></Field><Field label="Release year"><input name="release_year" type="number" min="1900" max="2100" defaultValue={item.release_year??''} className={field}/></Field><Field label="Territory"><input name="territory" defaultValue={item.territory} className={field}/></Field>
              <Field label="Rights type"><select name="rights_type" defaultValue={item.rights_type} className={field}>{RIGHTS_TYPES.map(v=><option key={v} value={v}>{pretty(v)}</option>)}</select></Field><Field label="Exclusivity"><select name="exclusivity" defaultValue={item.exclusivity} className={field}>{EXCLUSIVITY.map(v=><option key={v} value={v}>{pretty(v)}</option>)}</select></Field><Field label="Compensation"><select name="compensation_model" defaultValue={item.compensation_model} className={field}>{COMPENSATION.map(v=><option key={v} value={v}>{pretty(v)}</option>)}</select></Field><Field label="Revenue share %"><input name="revenue_share_percent" type="number" min="0" max="100" step="0.01" defaultValue={item.revenue_share_percent??''} className={field}/></Field>
              <Field label="Flat fee ($)"><input name="flat_fee" type="number" min="0" step="0.01" defaultValue={item.flat_fee_cents===null?'':(item.flat_fee_cents/100).toFixed(2)} className={field}/></Field><Field label="Term starts"><input name="term_start" type="date" defaultValue={item.term_start??''} className={field}/></Field><Field label="Term ends"><input name="term_end" type="date" defaultValue={item.term_end??''} className={field}/></Field><Field label="Next follow-up"><input name="next_follow_up_at" type="date" defaultValue={toDateInput(item.next_follow_up_at)} className={field}/></Field>
              <Field label="License document URL"><input name="license_document_url" type="url" defaultValue={item.license_document_url??''} className={field}/></Field>
              <label className="md:col-span-2 xl:col-span-4 text-[10px] font-black uppercase tracking-wider text-white/35">Internal notes<textarea name="notes" rows={4} defaultValue={item.notes??''} className={area}/></label>
              <button disabled={busy===item.id} className="min-h-12 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black disabled:opacity-50">{busy===item.id?'Saving…':'Save deal details'}</button>
              <button type="button" disabled={busy===item.id} onClick={()=>void updateItem(item.id,{last_contacted_at:new Date().toISOString(),status:item.status==='prospect'?'contacted':item.status},'Contact logged.')} className="min-h-12 rounded-xl border border-rcl-blue/25 px-5 text-xs font-black uppercase text-rcl-blue disabled:opacity-50">Log contact</button>
              <button type="button" disabled={busy===item.id} onClick={()=>void updateItem(item.id,{status:'archived'},'Acquisition archived.')} className="min-h-12 rounded-xl border border-white/10 px-5 text-xs font-black uppercase text-white/45 disabled:opacity-50">Archive</button>
            </form>
          </details>
        </article>)}
        {!visible.length&&<div className="rounded-3xl border border-dashed border-white/10 p-10 text-center"><FaFilm className="mx-auto text-3xl text-rcl-blue"/><h3 className="mt-3 font-display text-2xl font-black uppercase">No titles here yet.</h3><p className="mt-2 text-sm text-white/35">Add a prospect above or choose another pipeline stage.</p></div>}
      </div>
    </section>
  </Shell>;
}

function Shell({children}:{children:React.ReactNode}){return <main className="min-h-screen bg-[#03070d] pb-28 text-white"><Container maxWidth="xl" className="py-10 sm:py-14">{children}</Container></main>;}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block text-[10px] font-black uppercase tracking-wider text-white/35">{label}<span className="mt-2 block">{children}</span></label>;}
function Stat({value,label,accent=false}:{value:number;label:string;accent?:boolean}){return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className={'font-display text-4xl font-black '+(accent?'text-emerald-300':'')}>{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.15em] text-white/35">{label}</p></div>;}
function StageButton({active,onClick,label,count}:{active:boolean;onClick:()=>void;label:string;count:number}){return <button type="button" onClick={onClick} className={'min-h-10 shrink-0 rounded-xl border px-3 text-[10px] font-black uppercase tracking-wider '+(active?'border-rcl-orange bg-rcl-orange text-black':'border-white/10 bg-white/[.02] text-white/45')}>{label} · {count}</button>;}
function Pill({children}:{children:React.ReactNode}){return <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">{children}</span>;}
function clean(form:FormData,key:string){const value=String(form.get(key)??'').trim();return value||null;}
function numberOrNull(value:FormDataEntryValue|null){const text=String(value??'').trim();if(!text)return null;const number=Number(text);return Number.isFinite(number)?number:null;}
function pretty(value:string){return value.replaceAll('_',' ').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());}
function toDateInput(value:string|null){return value?value.slice(0,10):'';}
function dateToIso(value:string|null){return value?new Date(value+'T15:00:00').toISOString():null;}
