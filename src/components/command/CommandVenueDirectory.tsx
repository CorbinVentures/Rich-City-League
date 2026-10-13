'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import {
 FaArrowUpRightFromSquare, FaBasketball, FaBuilding, FaCalendarCheck, FaCheck,
 FaChevronLeft, FaChevronRight, FaCircleExclamation, FaFilter, FaLocationDot,
 FaMagnifyingGlass, FaMapLocationDot, FaPhone, FaEnvelope, FaRotate, FaShield,
 FaXmark, FaPenToSquare, FaCalendarDays,
} from 'react-icons/fa6';

type Gym = {
 id:string;name:string;city:string;address:string;region_group:string|null;
 venue_kind:string|null;state:string;source_verification:string|null;
 hourly_rate:number|null;effective_hourly_rate:number|null;budget_status:string|null;
 rate_basis:string|null;rate_details:string|null;availability_status:string|null;
 availability_details:string|null; source_url:string|null;source_label:string|null;
 source_checked_on:string|null; availability_checked_on:string|null;
 phone:string|null;email:string|null;website:string|null;contact:string|null;
 court_count:number|null;capacity:number|null;home_team_id:string|null;notes:string|null;
 rental_allowed:boolean|null;last_contacted_on:string|null;
 latitude:number|null;longitude:number|null;
};
const PAGE_SIZE=18;
const regions=['Richmond Metro','Hampton Roads','Northern Virginia','Shenandoah Valley','Central Virginia','Southside & Southwest','New River Valley'];
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const kindLabel=(s:string|null)=>({recreation_center:'Recreation center',school_gym:'School gym',fieldhouse:'Fieldhouse',indoor_gym:'Indoor gym',arena:'Arena',mixed:'Mixed use'}[s||'']||'Indoor facility');
const regionLabel=(s:string|null)=>s||'Virginia';
const formatDay=(s:string|null)=>s?new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Not checked';
const safeLink=(s:string|null)=>{if(!s)return null;try{const url=new URL(s);return url.protocol==='https:'?url.href:null}catch{return null}};
const statusInfo=(row:Gym)=>{
 switch(row.budget_status){
 case 'within_limit':return {label:'AT OR UNDER $75',tone:'good',description:'Published rate meets base-rate limit. Ask about mandatory extras.'};
 case 'conditional':return {label:'CONDITIONAL FIT',tone:'conditional',description:'At least one published condition may fit $75/hr. Review terms.'};
 case 'over_limit':return {label:'ABOVE $75',tone:'over',description:'Quoted standard or nonresident base pricing above ceiling.'};
 case 'not_rentable':return {label:'NOT RENTABLE',tone:'muted',description:'Gym not available for rental per published operator guidance.'};
 default:return {label:'QUOTE NEEDED',tone:'unknown',description:'No confirmed hourly gym rental quote.'};
 }
};
const availabilityInfo=(v:string|null)=>({
 published_windows:'Published rental windows',
 staff_confirmed:'Staff-confirmed inquiry',
 inquiry_required:'Call to check availability',
 not_rentable:'Cannot rent',
 unverified:'No dates verified',
}[v||'']||'No dates verified');
const searchGuard=(q:string)=>q.replace(/[%_,()"'\\]/g,' ').trim().slice(0,80);
type FilterBudget='all'|'fits'|'quoted'|'quote_needed'|'not_rentable';
type UpdateDraft={phone:string;email:string;hourly_rate:string;effective_hourly_rate:string;rate_basis:string;rate_details:string;availability_status:string;availability_details:string;last_contacted_on:string;notes:string;};
export function CommandVenueDirectory(){
 const db=useMemo(()=>getSupabaseClient() as unknown as SupabaseClient<any>|null,[]);
 const [search,setSearch]=useState('');
 const [debounced,setDebounced]=useState('');
 const [region,setRegion]=useState('');
 const [budget,setBudget]=useState<FilterBudget>('all');
 const [kind,setKind]=useState('');
 const [page,setPage]=useState(0);
 const [rows,setRows]=useState<Gym[]>([]);
 const [count,setCount]=useState(0);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [selected,setSelected]=useState<Gym|null>(null);
 const [editing,setEditing]=useState(false);
 const [saving,setSaving]=useState(false);
 const [draft,setDraft]=useState<UpdateDraft|null>(null);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{const timer=window.setTimeout(()=>setDebounced(searchGuard(search)),290);return()=>clearTimeout(timer)},[search]);
 useEffect(()=>{setPage(0)},[debounced,region,budget,kind]);
 const load=useCallback(async()=>{
  if(!db){setError('Secure database is not available.');setLoading(false);return}
  setLoading(true);setError('');
  try{
   let query=db.from('rcl_command_venues').select('*',{count:'exact'})
    .order('name',{ascending:true});
   if(region)query=query.eq('region_group',region);
   if(kind)query=query.eq('venue_kind',kind);
   if(budget==='fits')query=query.in('budget_status',['within_limit','conditional']);
   if(budget==='quoted')query=query.not('hourly_rate','is',null);
   if(budget==='quote_needed')query=query.eq('budget_status','needs_quote');
   if(budget==='not_rentable')query=query.eq('budget_status','not_rentable');
   if(debounced)query=query.or('name.ilike.%'+debounced+'%,city.ilike.%'+debounced+'%,address.ilike.%'+debounced+'%');
   const {data,count:total,error:dbError}=await query.range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1);
   if(dbError)throw dbError;
   setRows((data||[]) as Gym[]);
   setCount(total||0);
  }catch(e){setError(e instanceof Error?e.message:'Could not load Virginia gym records.')}
  finally{setLoading(false)}
 },[db,region,kind,budget,debounced,page,refresh]);
 useEffect(()=>{void load()},[load]);
 const clear=()=>{setSearch('');setRegion('');setKind('');setBudget('all');setPage(0)};
 const detail=(row:Gym)=>{setSelected(row);setEditing(false);setDraft(null)};
 const startEdit=()=>{if(!selected)return;setDraft({
  phone:selected.phone||'',email:selected.email||'',
  hourly_rate:selected.hourly_rate==null?'':String(selected.hourly_rate),
  effective_hourly_rate:selected.effective_hourly_rate==null?'':String(selected.effective_hourly_rate),
  rate_basis:selected.rate_basis||'unknown',rate_details:selected.rate_details||'',
  availability_status:selected.availability_status||'unverified',
  availability_details:selected.availability_details||'',
  last_contacted_on:selected.last_contacted_on||'',notes:selected.notes||'',
 });setEditing(true)};
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!selected||!draft||!db||saving)return;
  const price=draft.hourly_rate.trim()?Number(draft.hourly_rate):null;
  const full=draft.effective_hourly_rate.trim()?Number(draft.effective_hourly_rate):null;
  if((price!==null&&(!Number.isFinite(price)||price<0))||(full!==null&&(!Number.isFinite(full)||full<0))){setError('Please provide a valid, nonnegative rental price.');return}
  if(price!==null&&draft.rate_basis==='unknown'){setError('Select Published or Quoted as the price evidence.');return}
  setSaving(true);setError('');
  // Any conditional fee or unknown extras should never be classified as an
  // unconditional $75 fit just because the published BASE price is small.
  const budgetStatus=selected.rental_allowed===false?'not_rentable':
    price===null?'needs_quote':
    (selected.budget_status==='conditional'||(draft.rate_details.match(/peak|resident|minimum|package|addit|approval|staff/i)))?'conditional':
    (full??price)<=75?'within_limit':'over_limit';
  const values={
   phone:draft.phone.trim()||null,email:draft.email.trim()||null,
   hourly_rate:price,effective_hourly_rate:full,
   rate_basis:price===null?'unknown':draft.rate_basis,
   rate_details:draft.rate_details.trim(),availability_status:draft.availability_status,
   availability_details:draft.availability_details.trim(),last_contacted_on:draft.last_contacted_on||null,
   notes:draft.notes.trim(),budget_status:budgetStatus,
  };
  const result=await db.from('rcl_command_venues').update(values).eq('id',selected.id).select('*').single();
  if(result.error){setError(result.error.message);setSaving(false);return}
  setSelected(result.data as Gym);setEditing(false);setSaving(false);setRefresh(n=>n+1);
 }
 const filterActive=Boolean(search||region||kind||budget!=='all');
 return <div className="cmd-directory">
  <div className="cmd-directory-intro">
   <div className="cmd-directory-intro-title"><FaMapLocationDot size={20}/><div><b>THE COMMONWEALTH FACILITY NETWORK</b><span>Gym intelligence, rental economics & franchise home-court scouting</span></div></div>
   <div className="cmd-directory-note"><FaShield size={13}/><span>Research listings only — open-gym schedules are not confirmed private rentals.</span></div>
  </div>
  <div className="cmd-directory-controls">
   <label className="cmd-directory-search"><FaMagnifyingGlass size={14}/><span className="cmd-sr-only">Search gyms, cities and addresses</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a city, gym or address…" type="search" aria-label="Search gyms, cities and addresses"/></label>
   <label className="cmd-directory-select"><FaLocationDot size={12}/><span className="cmd-sr-only">Filter by Virginia region</span><select value={region} onChange={e=>setRegion(e.target.value)} aria-label="Filter by Virginia region"><option value="">All regions</option>{regions.map(x=><option value={x} key={x}>{x}</option>)}</select></label>
   <label className="cmd-directory-select"><FaFilter size={12}/><span className="cmd-sr-only">Filter rental affordability</span><select value={budget} onChange={e=>setBudget(e.target.value as FilterBudget)} aria-label="Filter rental affordability"><option value="all">All prices</option><option value="fits">Potential ≤ $75/hr</option><option value="quoted">Published or quoted rate</option><option value="quote_needed">Quote needed</option><option value="not_rentable">Not rentable</option></select></label>
   <label className="cmd-directory-select"><FaBuilding size={12}/><span className="cmd-sr-only">Filter facility type</span><select value={kind} onChange={e=>setKind(e.target.value)} aria-label="Filter facility type"><option value="">All facility types</option>{['indoor_gym','school_gym','recreation_center','fieldhouse','arena','mixed'].map(x=><option key={x} value={x}>{kindLabel(x)}</option>)}</select></label>
   <button className="cmd-dir-refresh" type="button" onClick={()=>setRefresh(n=>n+1)} aria-label="Refresh gym data" disabled={loading}><FaRotate/></button>
  </div>
  <div className="cmd-directory-subheader"><p><strong>{count.toLocaleString('en-US')}</strong> matching facility {count===1?'lead':'leads'} across Virginia <span>· Pricing reflects published conditions; never guaranteed event slots</span></p>{filterActive&&<button type="button" onClick={clear}>Clear filters <FaXmark size={9}/></button>}</div>
  {error&&<div className="cmd-directory-error" role="alert"><FaCircleExclamation/> {error}</div>}
  {loading?<div className="cmd-directory-loading" role="status"><span className="cmd-loading-r">R</span><span>Scanning Virginia facility records…</span></div>:rows.length===0?<div className="cmd-directory-noresults"><FaBasketball size={28}/><h4>No gyms match these filters.</h4><p>Try a different city or remove price restrictions.</p><button type="button" onClick={clear}>Reset search</button></div>:
   <div className="cmd-gym-grid">{rows.map(row=>{
    const info=statusInfo(row);const contact=[row.phone,row.email].filter(Boolean).join(' · ');
    return <article key={row.id} className="cmd-gym-card">
      <div className="cmd-gym-card-top"><span className="cmd-gym-type"><FaBuilding size={11}/>{kindLabel(row.venue_kind)}</span><span className={'cmd-gym-budget '+info.tone} title={info.description}>{info.label}</span></div>
      <div className="cmd-gym-card-body"><h4>{row.name}</h4><div className="cmd-gym-location"><FaLocationDot size={11}/><span>{row.address?row.address+', ':''}{row.city}, VA</span></div>
       <div className="cmd-gym-price-row"><div><small>HOURLY BASE RENTAL</small><strong>{row.hourly_rate==null?'Contact for quote':money(row.hourly_rate)}{row.hourly_rate!=null&&<em>/hr</em>}</strong></div>{row.effective_hourly_rate!=null&&<div className="cmd-gym-effective"><small>KNOWN ALL-IN</small><strong>{money(row.effective_hourly_rate)}</strong></div>}</div>
       <div className="cmd-gym-availability"><FaCalendarDays size={12}/><span>{availabilityInfo(row.availability_status)}</span></div>
       <p className="cmd-gym-conditions">{row.rate_details||'No confirmed exclusive rental hourly rate. Contact facility for a current quote.'}</p>
       {contact&&<p className="cmd-gym-contact">{contact}</p>}
      </div>
      <div className="cmd-gym-card-bottom"><span className="cmd-gym-source">{row.source_verification==='official'?'OFFICIAL SOURCE':row.source_verification==='provider'?'PROVIDER SOURCE':row.source_verification==='community'?'COMMUNITY LISTING':'STAFF RECORD'}{row.source_checked_on?' · '+formatDay(row.source_checked_on):''}</span><button type="button" onClick={()=>detail(row)}>VIEW VENUE <FaArrowUpRightFromSquare size={10}/></button></div>
    </article>
   })}</div>}
  {count>PAGE_SIZE&&<div className="cmd-dir-pagination"><span>Showing {Math.min(page*PAGE_SIZE+1,count)}–{Math.min((page+1)*PAGE_SIZE,count)} of {count}</span><div><button type="button" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0||loading}><FaChevronLeft/> Previous</button><b>Page {page+1} of {Math.ceil(count/PAGE_SIZE)}</b><button type="button" onClick={()=>setPage(p=>p+1)} disabled={(page+1)*PAGE_SIZE>=count||loading}>Next <FaChevronRight/></button></div></div>}
  {selected&&<div className="cmd-gym-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setSelected(null);setEditing(false)}}} role="presentation"><section className="cmd-gym-detail" role="dialog" aria-modal="true" aria-labelledby="cmd-gym-detail-heading"><header><div><p className="cmd-eyebrow">RCL COMMAND · GYM INTELLIGENCE</p><h3 id="cmd-gym-detail-heading">{selected.name}</h3><span>{selected.city}, Virginia · {regionLabel(selected.region_group)}</span></div><button type="button" onClick={()=>{setSelected(null);setEditing(false)}} aria-label="Close venue details"><FaXmark/></button></header>
   {editing&&draft?<form className="cmd-gym-edit" onSubmit={e=>void save(e)}>
    <p>Update only verified information. Staff-confirmed availability must be based on a real venue conversation; this does not create a confirmed booking.</p>
    <div className="cmd-gym-edit-grid"><label>Rental base $/hr<input type="number" min="0" step=".01" value={draft.hourly_rate} onChange={e=>setDraft(x=>x?{...x,hourly_rate:e.target.value}:x)}/></label><label>Effective all-in $/hr<input type="number" min="0" step=".01" value={draft.effective_hourly_rate} onChange={e=>setDraft(x=>x?{...x,effective_hourly_rate:e.target.value}:x)}/></label>
    <label>Price evidence<select value={draft.rate_basis} onChange={e=>setDraft(x=>x?{...x,rate_basis:e.target.value}:x)}><option value="unknown">Unknown</option><option value="published">Published by venue</option><option value="quoted">Staff received a quote</option></select></label><label>Availability evidence<select value={draft.availability_status} onChange={e=>setDraft(x=>x?{...x,availability_status:e.target.value}:x)}><option value="unverified">Unverified</option><option value="inquiry_required">Call to check</option><option value="published_windows">Published rental windows</option><option value="staff_confirmed">Staff-confirmed inquiry</option><option value="not_rentable">Not rentable</option></select></label>
    <label>Phone<input type="tel" value={draft.phone} onChange={e=>setDraft(x=>x?{...x,phone:e.target.value}:x)}/></label><label>Email<input type="email" value={draft.email} onChange={e=>setDraft(x=>x?{...x,email:e.target.value}:x)}/></label><label>Last contacted<input type="date" value={draft.last_contacted_on} onChange={e=>setDraft(x=>x?{...x,last_contacted_on:e.target.value}:x)}/></label></div>
    <label>Rate conditions<textarea rows={3} value={draft.rate_details} onChange={e=>setDraft(x=>x?{...x,rate_details:e.target.value}:x)}/></label>
    <label>Availability / scheduling intelligence<textarea rows={3} value={draft.availability_details} onChange={e=>setDraft(x=>x?{...x,availability_details:e.target.value}:x)}/></label>
    <label>Administrative notes<textarea rows={3} value={draft.notes} onChange={e=>setDraft(x=>x?{...x,notes:e.target.value}:x)}/></label>
    <div className="cmd-gym-edit-buttons"><button type="submit" disabled={saving} className="cmd-button">{saving?'Saving…':'Save verified changes'} <FaCheck/></button><button type="button" onClick={()=>setEditing(false)}>Cancel</button></div>
   </form>:<div className="cmd-gym-detail-body">
     <div className="cmd-gym-detail-status"><span className={'cmd-gym-budget '+statusInfo(selected).tone}>{statusInfo(selected).label}</span><span className="cmd-gym-type">{kindLabel(selected.venue_kind)}</span><span className="cmd-gym-type">{selected.source_verification==='official'?'Official source':selected.source_verification==='provider'?'Provider listing':'Research lead'}</span></div>
     <div className="cmd-gym-detail-stats"><div><small>BASE COURT RATE</small><strong>{selected.hourly_rate==null?'Needs quote':money(selected.hourly_rate)+'/hr'}</strong></div><div><small>KNOWN ALL-IN RATE</small><strong>{selected.effective_hourly_rate==null?'Unconfirmed':money(selected.effective_hourly_rate)+'/hr'}</strong></div><div><small>AVAILABILITY EVIDENCE</small><strong className="cmd-gym-status-text">{availabilityInfo(selected.availability_status)}</strong></div><div><small>LAST SOURCE CHECK</small><strong className="cmd-gym-status-text">{formatDay(selected.source_checked_on)}</strong></div></div>
     <div className="cmd-gym-detail-section"><h4>Rental conditions</h4><p>{selected.rate_details||'No published exclusive gym rental tariff. Contact the operator for league pricing, deposits and staffing.'}</p></div>
     <div className="cmd-gym-detail-section"><h4>Booking and schedule</h4><p>{selected.availability_details||'No live reservation availability. Request your specific dates and times directly.'}</p><p className="cmd-gym-disclaimer">Published operating hours and open-play times are NOT confirmed exclusive rental availability.</p></div>
     <div className="cmd-gym-detail-section"><h4>Venue contact</h4><p>{selected.address?selected.address+', ':''}{selected.city}, VA</p><div className="cmd-gym-links">{selected.phone&&<a href={'tel:'+selected.phone.replace(/[^+0-9]/g,'')}><FaPhone/> {selected.phone}</a>}{selected.email&&<a href={'mailto:'+selected.email}><FaEnvelope/> {selected.email}</a>}{safeLink(selected.website)&&<a href={safeLink(selected.website)||'#'} target="_blank" rel="noopener noreferrer"><FaArrowUpRightFromSquare/> Venue website</a>}{safeLink(selected.source_url)&&<a href={safeLink(selected.source_url)||'#'} target="_blank" rel="noopener noreferrer"><FaShield/> Evidence / rental terms</a>}<a href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([selected.name,selected.address,selected.city,'VA'].filter(Boolean).join(' '))} target="_blank" rel="noopener noreferrer"><FaMapLocationDot/> Map & directions</a></div></div>
     {selected.notes&&<div className="cmd-gym-detail-section"><h4>Research and staff notes</h4><p>{selected.notes}</p></div>}
     <div className="cmd-gym-detail-footer"><span>{selected.source_label||'Directory research'} · {selected.last_contacted_on?'Last contacted '+formatDay(selected.last_contacted_on):'No staff contact logged'}</span><button type="button" className="cmd-button" onClick={startEdit}><FaPenToSquare/> Edit facility details</button></div>
   </div>}
  </section></div>}
 </div>
}
