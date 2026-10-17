'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';
import {verifiedParksRecFacility} from '@/lib/runs-world-game';
import {FaArrowLeft,FaArrowRotateRight,FaMapLocationDot,FaTriangleExclamation,FaCheck,FaArrowUpRightFromSquare} from 'react-icons/fa6';

type Court={slug:string;name:string;address:string;locality:string;latitude:number|null;longitude:number|null;
 source_url:string|null;source_label:string|null;verification_status:string;access_type:string;
 venue_type:string;is_active:boolean;last_verified_on:string|null};
type Proposal={id:string;court_slug:string;proposed_latitude:number;proposed_longitude:number;
 evidence_url:string;evidence_notes:string;status:string;submitted_at:string;submitted_by:string;reviewed_at:string|null};
type Audit={id:number;court_slug:string;action:string;occurred_at:string;review_notes:string};
type CensusLocality={geoid:string;name:string};
const matchesChesterfield=(locality:string)=>['chesterfield','north chesterfield','south chesterfield'].includes(locality.toLowerCase());
function qualified(r:Court){return r.is_active&&verifiedParksRecFacility(r);}
function coords(r:Court){return r.latitude!==null&&r.longitude!==null&&Number.isFinite(r.latitude)&&Number.isFinite(r.longitude);}
const blank={lat:'',lon:'',url:'',notes:'',decision:''};
export default function StatewideCourtMapQuality(){
 const {user,loading:authLoading}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [allowed,setAllowed]=useState(false),[checked,setChecked]=useState(false),[loading,setLoading]=useState(true);
 const [items,setItems]=useState<Court[]>([]),[proposals,setProposals]=useState<Proposal[]>([]),[history,setHistory]=useState<Audit[]>([]);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [region,setRegion]=useState('Chesterfield'),[query,setQuery]=useState('');
 const [officialLocalities,setOfficialLocalities]=useState<CensusLocality[]>([]),[censusUnavailable,setCensusUnavailable]=useState(false);
 const [mode,setMode]=useState<'needs-pin'|'mapped'|'community'|'all'|'reviews'>('needs-pin');
 const [selected,setSelected]=useState<string|null>(null),[decisionId,setDecisionId]=useState<string|null>(null);
 const [form,setForm]=useState(blank);
 useEffect(()=>{
  if(authLoading)return;
  if(!user||!db){setAllowed(false);setChecked(true);return;}
  let active=true;void db.rpc('is_staff_or_admin').then(({data,error}:{data:boolean|null;error:any})=>{
   if(active){setAllowed(!error&&data===true);setChecked(true);}
  });
  return()=>{active=false;};
 },[user?.id,db,authLoading]);
 const refresh=useCallback(async()=>{
  if(!db||!allowed)return;
  setLoading(true);setError('');
  try{
   const [reviewRows,auditRows]=await Promise.all([
    db.from('rch_court_coordinate_reviews').select('id,court_slug,proposed_latitude,proposed_longitude,evidence_url,evidence_notes,status,submitted_at,submitted_by,reviewed_at')
     .order('submitted_at',{ascending:false}).limit(200),
    db.from('rch_court_coordinate_audit').select('id,court_slug,action,occurred_at,review_notes').order('occurred_at',{ascending:false}).limit(40)
   ]);
   if(reviewRows.error)throw reviewRows.error;
   if(auditRows.error)throw auditRows.error;
   const all:Court[]=[];
   for(let start=0;start<6000;start+=500){
    const {data,error}=await db.from('basketball_locations')
     .select('slug,name,address,locality,latitude,longitude,source_url,source_label,verification_status,access_type,venue_type,is_active,last_verified_on')
     .order('slug').range(start,start+499);
    if(error)throw error;
    all.push(...(data||[]));
    if((data||[]).length<500)break;
   }
   setItems(all);setProposals(reviewRows.data||[]);setHistory(auditRows.data||[]);
  }catch(e){setError(e instanceof Error?e.message:'Unable to read geographic review records.');}
  finally{setLoading(false);}
 },[db,allowed]);
 useEffect(()=>{if(allowed)void refresh();},[allowed,refresh]);
 useEffect(()=>{
  if(!allowed)return;
  let active=true;
  void fetch('/api/geo/virginia?layer=counties',{cache:'force-cache'})
   .then(r=>{if(!r.ok)throw Error('County data unavailable');return r.json();})
   .then(data=>{
    if(!active||!Array.isArray(data?.features))return;
    const jurisdictions=data.features.map((f:{properties?:{GEOID?:string;NAME?:string}})=>({
     geoid:f.properties?.GEOID||'',name:f.properties?.NAME||''
    })).filter((c:CensusLocality)=>/^51[0-9]{3}$/.test(c.geoid)&&c.name)
      .sort((a:CensusLocality,b:CensusLocality)=>a.name.localeCompare(b.name));
    setOfficialLocalities(jurisdictions);setCensusUnavailable(false);
   }).catch(()=>{if(active)setCensusUnavailable(true);});
  return()=>{active=false;};
 },[allowed]);
 if(!checked)return <main className="min-h-screen bg-[#071727] p-8 text-white">Verifying staff authorization…</main>;
 if(!allowed)return <main className="min-h-screen bg-[#071727] p-8 text-white"><h1 className="text-2xl font-black">Staff access required</h1><Link href="/runs" className="mt-4 inline-block text-sky-300">Return to Runs</Link></main>;
 const regions=[...new Set(items.map(c=>c.locality))].sort((a,b)=>a.localeCompare(b));
 const regional=items.filter(c=>region==='Virginia'||(region==='Chesterfield'?matchesChesterfield(c.locality):c.locality===region));
 const regionalQualified=regional.filter(qualified);
 const mapped=regionalQualified.filter(coords);
 const pending=proposals.filter(r=>r.status==='pending');
 // Postal-locality matching is a coverage lead, NOT a GIS county assignment.
 const sourceCountFor=(name:string)=>{
  const clean=name.toLowerCase().replace(/\s+(county|city)$/,'');
  return items.filter(c=>qualified(c)&&(
   c.locality.toLowerCase()===clean
   ||clean==='chesterfield'&&['chesterfield','north chesterfield','south chesterfield','chester'].includes(c.locality.toLowerCase())
   ||clean==='henrico'&&['henrico','glen allen','sandston'].includes(c.locality.toLowerCase())
  )).length;
 };
 const countiesWithListedSources=officialLocalities.filter(c=>sourceCountFor(c.name)>0).length;
 const normalized=query.trim().toLowerCase();
 const duplicateKeys=new Map<string,number>();
 regional.forEach(c=>{const key=(c.name+'|'+c.locality).toLowerCase().replace(/[^a-z0-9|]/g,'');duplicateKeys.set(key,(duplicateKeys.get(key)||0)+1);});
 const matches=regional.filter(c=>{
  if(normalized&&!([c.name,c.address,c.locality,c.slug].join(' ').toLowerCase().includes(normalized)))return false;
  return mode==='all'||mode==='reviews'?false:mode==='community'?c.verification_status==='community':
   mode==='needs-pin'?qualified(c)&&!coords(c):qualified(c)&&coords(c);
 }).slice(0,300);
 const target=items.find(c=>c.slug===selected);
 const propose=async()=>{
  if(!db||!target||busy)return;
  setBusy(true);setError('');setNotice('');
  const lat=Number(form.lat),lon=Number(form.lon);
  if(!form.lat||!form.lon||!Number.isFinite(lat)||!Number.isFinite(lon)){setError('Enter both valid numeric coordinates.');setBusy(false);return;}
  const {error}=await db.rpc('rch_propose_court_coordinates',{p_court:target.slug,p_lat:lat,p_lon:lon,
   p_evidence_url:form.url,p_notes:form.notes});
  if(error)setError(error.message);
  else{setNotice('Source-backed coordinate proposal queued for staff review. No location was changed.');setSelected(null);setForm(blank);await refresh();}
  setBusy(false);
 };
 const resolve=async(review:Proposal,approve:boolean)=>{
  if(!db||busy)return;
  setBusy(true);setError('');setNotice('');
  const {error}=await db.rpc('rch_resolve_court_coordinate_review',{p_review:review.id,p_approve:approve,p_reason:form.decision});
  if(error)setError(error.message);
  else{setNotice(approve?'Coordinates approved and audit-recorded.':'Proposal rejected and audit-recorded.');setDecisionId(null);setForm(blank);await refresh();}
  setBusy(false);
 };
 return <main className="min-h-screen bg-[#061422] px-4 pb-32 pt-9 text-white">
  <div className="mx-auto max-w-6xl">
   <div className="flex items-center justify-between gap-3"><Link href="/admin/runs/weekend-circuit" className="inline-flex items-center gap-2 text-sm text-sky-200"><FaArrowLeft/> Weekend Circuit HQ</Link>
    <button onClick={()=>void refresh()} type="button" disabled={busy} className="rounded-lg border border-sky-500/50 bg-sky-900/50 px-3 py-2 text-xs"><FaArrowRotateRight className="inline"/> Refresh</button>
   </div>
   <header className="mt-5">
    <p className="text-xs font-black uppercase tracking-[.15em] text-sky-300">RCH Geography Office · Staff Only</p>
    <h1 className="mt-2 text-3xl font-black">Virginia Court Map Operations</h1>
    <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">Official city/county Parks & Recreation basketball courts, indoor gyms and mixed centers are verified facilities when supported by their Parks & Rec listing. Access and open-play schedules remain separate. Community map leads and private providers are not automatically Parks & Rec verified. Coordinate changes require evidence, review and an audit entry.</p>
   </header>
   {error&&<p className="mt-5 rounded-xl border border-red-400/60 bg-red-900/30 p-4 text-sm" role="alert">{error}</p>}
   {notice&&<p className="mt-5 rounded-xl border border-emerald-400/60 bg-emerald-900/30 p-4 text-sm" role="status">{notice}</p>}
   <div className="mt-6 grid gap-3 md:grid-cols-4">
    {[[regional.length,'Recorded leads and venues'],[regionalQualified.length,'Parks & Rec basketball facilities'],[mapped.length,'Parks & Rec sites with coordinates'],[regionalQualified.length-mapped.length,'Parks & Rec pins to review']].map(([n,label])=><div key={label} className="rounded-2xl border border-sky-800 bg-[#103049] p-4"><strong className="text-3xl font-black">{loading?'…':n}</strong><p className="mt-1 text-xs text-slate-300">{label}</p></div>)}
   </div>
   <section className="mt-6 rounded-2xl border border-sky-800 bg-[#0d2940] p-4" aria-label="Statewide Parks and Recreation geographic coverage">
    <h2 className="text-lg font-black">Statewide official-source coverage</h2>
    <p className="mt-2 text-xs leading-6 text-slate-300">All Virginia county and independent-city labels are sourced from the U.S. Census 2026. Numbers below count documented basketball facilities matched by postal locality name only. They do not represent a complete jurisdiction audit or precise physical court locations.</p>
    {censusUnavailable?<p role="status" className="mt-3 text-xs text-amber-200">The official county coverage index is temporarily unavailable. Verified facility records remain available below.</p>:officialLocalities.length===0?<p className="mt-3 text-xs text-slate-300">Loading official jurisdictions…</p>:<>
     <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
      <div className="rounded-lg bg-[#173c55] p-3"><strong className="block text-2xl">{officialLocalities.length}</strong><small>Official jurisdictions</small></div>
      <div className="rounded-lg bg-[#173c55] p-3"><strong className="block text-2xl">{countiesWithListedSources}</strong><small>With a listed source record</small></div>
      <div className="rounded-lg bg-[#173c55] p-3"><strong className="block text-2xl">{officialLocalities.length-countiesWithListedSources}</strong><small>Without a matched source listing</small></div>
     </div>
     <details className="mt-4">
      <summary className="cursor-pointer py-2 text-sm font-bold text-sky-200">Inspect all county and city coverage leads</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
       {officialLocalities.map(c=>{
        const count=sourceCountFor(c.name);
        return <div key={c.geoid} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#092036] p-3 text-xs">
         <span>{c.name}<span className="ml-2 text-slate-400">{c.geoid}</span></span>
         <span className={count?'font-black text-emerald-300':'text-amber-300'}>{count?count+' listed':'Source needed'}</span>
        </div>;
       })}
      </div>
     </details>
    </>}
   </section>
   <div className="mt-5 flex flex-wrap gap-3">
    <label className="text-xs font-bold text-slate-200">Review region
     <select value={region} onChange={e=>setRegion(e.target.value)} className="mt-1 block min-h-11 rounded-lg border border-sky-800 bg-[#0c2c44] p-2 text-sm">
      <option>Virginia</option><option>Chesterfield</option>{regions.filter(c=>!matchesChesterfield(c)&&c!=='Virginia').map(c=><option key={c}>{c}</option>)}
     </select></label>
    <label className="flex-1 text-xs font-bold text-slate-200">Search court, locality or address
     <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, street, court slug…" className="mt-1 block min-h-11 w-full rounded-lg border border-sky-800 bg-[#0c2c44] px-3 text-sm text-white"/>
    </label>
   </div>
   <div className="mt-5 flex flex-wrap gap-2">
    {([['needs-pin','Missing pins'],['mapped','Coordinates on file'],['community','Community leads'],['reviews','Review queue ('+pending.length+')'],['all','Audit overview']] as const).map(([m,label])=><button key={m} type="button" aria-pressed={mode===m} onClick={()=>{setMode(m);setSelected(null);setDecisionId(null);}} className={'min-h-11 rounded-xl border px-3 py-2 text-xs font-bold '+(mode===m?'border-sky-200 bg-sky-700':'border-white/20 bg-[#11283e]')}>{label}</button>)}
   </div>
   {loading?<p className="mt-7 text-sm text-slate-300" role="status">Auditing the statewide venue registry…</p>:
   mode==='all'?<section className="mt-6 space-y-3">
    <h2 className="text-xl font-black">Coverage and audit overview</h2>
    <p className="text-sm text-slate-300">Potential duplicate names in this selection: {Array.from(duplicateKeys.values()).filter(n=>n>1).length} groups. These are review leads only; no records were merged automatically.</p>
    {history.map(a=><article key={a.id} className="rounded-xl border border-white/15 bg-[#0b2942] p-3 text-xs"><strong>{a.action.toUpperCase()} · {a.court_slug}</strong><p className="mt-1 text-slate-300">{new Date(a.occurred_at).toLocaleString()} · {a.review_notes}</p></article>)}
   </section>:mode==='reviews'?<section className="mt-6 space-y-3">
    <h2 className="text-xl font-black">Submitted coordinate evidence</h2>
    {pending.length===0&&<p className="text-sm text-slate-300">There are no pending coordinate changes.</p>}
    {pending.map(review=><article key={review.id} className="rounded-xl border border-sky-800 bg-[#0b2942] p-4">
     <strong>{review.court_slug}</strong><p className="mt-2 text-xs text-slate-300">{review.proposed_latitude.toFixed(6)}, {review.proposed_longitude.toFixed(6)} · {new Date(review.submitted_at).toLocaleString()}</p>
     <p className="mt-2 text-sm text-slate-200">{review.evidence_notes}</p>
     <div className="mt-3 flex flex-wrap gap-3 text-xs text-sky-200">
      <a target="_blank" rel="noopener noreferrer" href={review.evidence_url}>Review submitted evidence <FaArrowUpRightFromSquare className="inline"/></a>
      <a target="_blank" rel="noopener noreferrer" href={'https://www.google.com/maps/search/?api=1&query='+review.proposed_latitude+','+review.proposed_longitude}>Inspect candidate point <FaArrowUpRightFromSquare className="inline"/></a>
     </div>
     {decisionId===review.id?<div className="mt-4 space-y-2">
       <textarea aria-label="Approval or rejection reasoning" value={form.decision} onChange={e=>setForm(f=>({...f,decision:e.target.value}))} rows={3} className="w-full rounded-lg border border-sky-700 bg-[#071827] p-3 text-sm" placeholder="Record exactly which source/evidence confirmed or rejected this specific court point"/>
       <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>void resolve(review,true)} className="rounded-lg bg-emerald-700 px-4 py-3 text-xs font-bold">Approve exact pin</button><button type="button" disabled={busy} onClick={()=>void resolve(review,false)} className="rounded-lg bg-red-800 px-4 py-3 text-xs font-bold">Reject proposal</button><button type="button" onClick={()=>setDecisionId(null)} className="rounded-lg border border-white/30 px-4 py-3 text-xs">Cancel</button></div>
      </div>:<button type="button" className="mt-3 rounded-lg border border-sky-500/50 px-4 py-2 text-xs font-bold" onClick={()=>{setDecisionId(review.id);setForm(blank);}}>Review coordinates</button>}
    </article>)}
   </section>:<section className="mt-5 space-y-3" aria-label="Court verification records">
    <p className="text-xs text-slate-400">Displaying {Math.min(matches.length,300)} court records. Refine the name or locality to reduce results. Numeric coordinates on file are not proof of court-level accuracy.</p>
    {!matches.length&&<p className="rounded-xl border border-white/15 p-4 text-sm">No matching courts in this category.</p>}
    {matches.map(c=><article key={c.slug} className="rounded-2xl border border-white/15 bg-[#0d2940] p-4">
     <div className="flex flex-wrap justify-between gap-3"><div><strong>{c.name}</strong><p className="mt-1 text-xs text-slate-300">{c.address} · {c.locality}</p><p className="mt-1 text-xs text-sky-200">{c.verification_status} · {c.access_type} · {c.venue_type}</p></div>
      <span className={'rounded-lg border px-3 py-2 text-xs '+(qualified(c)&&coords(c)?'border-emerald-500/40 text-emerald-200':'border-amber-400/40 text-amber-200')}>
       {qualified(c)&&coords(c)?<FaCheck className="mr-1 inline"/>:<FaTriangleExclamation className="mr-1 inline"/>}{qualified(c)?coords(c)?'Coordinates on file':'Location needs review':'Community / restricted'}
      </span></div>
     <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300"><span>Lat: {c.latitude??'missing'}</span><span>Lon: {c.longitude??'missing'}</span><span>Updated: {c.last_verified_on||'unknown'}</span></div>
     <div className="mt-3 flex flex-wrap gap-4 text-xs">
      {c.source_url?.startsWith('https://')&&<a href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-sky-200">Inspect current source ↗</a>}
      <button onClick={()=>{setSelected(c.slug);setForm({lat:c.latitude?.toString()||'',lon:c.longitude?.toString()||'',url:c.source_url||'',notes:'',decision:''});}}
       type="button" className="font-bold text-sky-200">Propose location correction →</button>
     </div>
     {selected===c.slug&&<div className="mt-4 grid gap-3 border-t border-white/20 pt-4">
      <p className="text-xs text-amber-200">Propose the center of the actual basketball court—not a park entrance, street address centroid, or guessed coordinate. Review is required before any change.</p>
      <div className="grid grid-cols-2 gap-2">
       <label className="text-xs">Latitude<input type="number" step="any" value={form.lat} onChange={e=>setForm(f=>({...f,lat:e.target.value}))} className="mt-1 w-full rounded-lg border border-sky-800 bg-[#061827] p-3"/></label>
       <label className="text-xs">Longitude<input type="number" step="any" value={form.lon} onChange={e=>setForm(f=>({...f,lon:e.target.value}))} className="mt-1 w-full rounded-lg border border-sky-800 bg-[#061827] p-3"/></label>
      </div>
      <label className="text-xs">Official imagery or court evidence URL<input value={form.url} type="url" onChange={e=>setForm(f=>({...f,url:e.target.value}))} className="mt-1 w-full rounded-lg border border-sky-800 bg-[#061827] p-3"/></label>
      <label className="text-xs">Verification notes<textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Describe exactly how this basketball court was identified and why its coordinates are accurate" className="mt-1 w-full rounded-lg border border-sky-800 bg-[#061827] p-3"/></label>
      <div className="flex flex-wrap gap-3">
       <button disabled={busy} type="button" onClick={()=>void propose()} className="rounded-xl bg-sky-600 px-4 py-3 text-xs font-bold">Submit for geographic review</button>
       <button type="button" onClick={()=>setSelected(null)} className="rounded-xl border border-white/20 px-4 py-3 text-xs">Cancel</button>
      </div>
     </div>}
    </article>)}
   </section>}
  </div>
 </main>;
}
