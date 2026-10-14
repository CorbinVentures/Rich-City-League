'use client';

import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseClient} from '@/lib/supabase';
import './command-territories.css';

type Territory={
 id:string;team_id:string;home_market:string;division:string;status:'approved_market'|'protected';
 home_lat:number;home_lon:number;signed_agreement_reference:string;protection_effective_on:string|null;notes:string;
};
type Locality={id:string;fips:string;name:string;locality_type:'county'|'city';scope:'core'|'development';territory_id:string};
type Team={id:string;name:string};
type Props={selectedTeamId:string;onSelectTeam:(id:string)=>void};

const DIVISIONS=['Northern','Central','Western','Coastal & South'] as const;
const label=(l:Locality)=>l.name+(l.locality_type==='city'?' City':' County');
const pct=(n:number,min:number,range:number)=>Math.max(1,Math.min(99,(n-min)/range*100))+'%';

export function CommandTerritories({selectedTeamId,onSelectTeam}:Props){
 const db=useMemo(()=>getSupabaseClient() as SupabaseClient<any>|null,[]);
 const [teams,setTeams]=useState<Team[]>([]);
 const [territories,setTerritories]=useState<Territory[]>([]);
 const [localities,setLocalities]=useState<Locality[]>([]);
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState('');
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [search,setSearch]=useState('');
 const [scopeFilter,setScopeFilter]=useState<'all'|'core'|'development'>('all');
 const [editTarget,setEditTarget]=useState<string|null>(null);
 const [agreement,setAgreement]=useState('');
 const [effective,setEffective]=useState('');
 const [requestedStatus,setRequestedStatus]=useState<'approved_market'|'protected'>('approved_market');
 const [confirmed,setConfirmed]=useState(false);
 const load=useCallback(async()=>{
  if(!db){setError('Secure territory database unavailable.');setLoading(false);return;}
  const [t,r,l]=await Promise.all([
   db.from('teams').select('id,name').eq('is_active',true).limit(100),
   db.from('rcl_command_territories').select('id,team_id,home_market,division,status,home_lat,home_lon,signed_agreement_reference,protection_effective_on,notes').limit(100),
   db.from('rcl_command_territory_localities').select('id,fips,name,locality_type,scope,territory_id').order('name').limit(200)
  ]);
  const failure=[t.error,r.error,l.error].find(Boolean);
  if(failure){setError(failure.message);setLoading(false);return;}
  setTeams(t.data||[]);setTerritories(r.data||[]);setLocalities(l.data||[]);
  setError('');setLoading(false);
 },[db]);
 useEffect(()=>{void load();},[load]);
 const sorted=useMemo(()=>[...territories].sort((a,b)=>
  DIVISIONS.indexOf(a.division as typeof DIVISIONS[number])-DIVISIONS.indexOf(b.division as typeof DIVISIONS[number])
  ||a.home_market.localeCompare(b.home_market)),[territories]);
 const selected=territories.find(t=>t.team_id===selectedTeamId)||sorted[0];
 const selectedId=selected?.id||'';
 const selectedName=teams.find(t=>t.id===selected?.team_id)?.name||'Franchise';
 const covered=localities.filter(l=>l.territory_id===selectedId);
 const visible=covered.filter(l=>scopeFilter==='all'||l.scope===scopeFilter)
  .filter(l=>!search||label(l).toLowerCase().includes(search.toLowerCase())||l.fips.includes(search));
 const coverage=localities.length;
 const uncovered=Math.max(0,133-coverage);
 const ambiguous=133!==new Set(localities.map(l=>l.fips)).size;
 const edit=territories.find(t=>t.id===editTarget);

 function startProtection(t:Territory){
  setEditTarget(t.id);
  setAgreement(t.signed_agreement_reference||'');
  setEffective(t.protection_effective_on||'');
  setRequestedStatus(t.status);
  setConfirmed(false);setMessage('');setError('');
 }
 async function saveProtection(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!db||!edit||working)return;
  if(requestedStatus==='protected'&&(!confirmed||agreement.trim().length<6||!effective)){
   setError('Confirm the executed agreement and supply its reference and effective date before activating protection.');return;
  }
  setWorking('protection');setError('');setMessage('');
  const {error:failure}=await db.from('rcl_command_territories').update({
   status:requestedStatus,
   signed_agreement_reference:agreement.trim(),
   protection_effective_on:effective||null
  }).eq('id',edit.id);
  if(failure)setError(failure.message);
  else {setMessage('Franchise territory status saved to the audited record.');setEditTarget(null);await load();}
  setWorking('');
 }
 async function updateLocality(l:Locality,changes:Partial<Pick<Locality,'territory_id'|'scope'>>){
  if(!db||working)return;
  setWorking(l.fips);setError('');setMessage('');
  const {error:failure}=await db.from('rcl_command_territory_localities').update(changes).eq('fips',l.fips);
  if(failure)setError(failure.message);
  else {setMessage(label(l)+' updated. The FIPS jurisdiction remains uniquely assigned.');await load();}
  setWorking('');
 }
 if(loading)return <section className="cmd-panel cmd-territories"><p className="cmd-empty">Loading Commonwealth territory registry…</p></section>;
 return <section className="cmd-panel cmd-territories">
  <div className="cmd-panel-heading">
   <div><p className="cmd-eyebrow">COMMONWEALTH TERRITORY SYSTEM</p><h3>Territory Management</h3>
    <p className="cmd-territory-sub">12 approved home markets · county-level coverage · league-controlled commercial rights</p></div>
   <span className="cmd-count">{covered.length} jurisdictions in selected market</span>
  </div>
  <div className="cmd-territory-kpis">
   <div><b>{sorted.length}</b><span>FRANCHISE MARKETS</span></div>
   <div><b>{coverage} / 133</b><span>JURISDICTIONS ASSIGNED</span></div>
   <div><b>{sorted.filter(t=>t.status==='protected').length}</b><span>AGREEMENT-PROTECTED</span></div>
   <div><b>{uncovered}</b><span>UNASSIGNED LOCALITIES</span></div>
  </div>
  <p className="cmd-territory-guidance"><strong>Important:</strong> Approved home markets are internal development assignments, not exclusive player residency zones, ownership of a city or venue, or franchise legal protection. Only an executed agreement and league approval can advance a market to Protected.</p>
  <div className="cmd-territory-layout">
   <div className="cmd-territory-atlas" aria-label="Virginia home-market map with twelve selectable franchises">
    <div className="cmd-territory-map-stage">
     <img src="/virginia-world-fallback.svg" alt="Stylized geographic outline of Virginia; home-market markers are approximate" />
     {sorted.map((t,i)=>{
      const active=t.id===selectedId;
      return <button key={t.id} type="button" aria-label={'Select '+(teams.find(a=>a.id===t.team_id)?.name||t.home_market)+' territory'} aria-pressed={active} title={teams.find(a=>a.id===t.team_id)?.name||t.home_market}
       className={'cmd-territory-pin'+(active?' is-selected':'')} style={{left:pct(t.home_lon,-84.15,9.7),top:pct(39.75-t.home_lat,0,3.6)}}
       onClick={()=>onSelectTeam(t.team_id)}>{i+1}</button>;
     })}
    </div>
    <p>Home-city markers are illustrative; the exact, non-overlapping jurisdiction assignments are listed below using Virginia FIPS identifiers.</p>
   </div>
   <div className="cmd-territory-sidebar">
    <p className="cmd-eyebrow">REGIONAL DIVISIONS</p>
    {DIVISIONS.map(division=><div key={division} className="cmd-territory-division">
     <strong>{division}</strong>
     {sorted.filter(t=>t.division===division).map(t=><button type="button" className={t.id===selectedId?'is-selected':''} key={t.id} onClick={()=>onSelectTeam(t.team_id)}>
      <span>{teams.find(team=>team.id===t.team_id)?.name||'Team'}</span><small>{t.home_market}</small>
     </button>)}
    </div>)}
   </div>
  </div>
  {selected&&<div className="cmd-territory-detail">
   <div className="cmd-territory-detail-head">
    <div><p className="cmd-eyebrow">SELECTED HOME MARKET · {selected.division.toUpperCase()}</p>
     <h4>{selectedName}</h4><p>{selected.home_market}</p></div>
    <div className="cmd-territory-status"><span>{selected.status==='protected'?'Contract-protected':'Approved market · not contract-protected'}</span>
     <button type="button" onClick={()=>startProtection(selected)}>Manage protection</button></div>
   </div>
   <div className="cmd-territory-detail-stats">
    <div><strong>{covered.length}</strong><span>Jurisdictions</span></div>
    <div><strong>{covered.filter(l=>l.scope==='core').length}</strong><span>Core</span></div>
    <div><strong>{covered.filter(l=>l.scope==='development').length}</strong><span>Development</span></div>
    <div><strong>{covered.filter(l=>l.locality_type==='city').length}</strong><span>Independent cities</span></div>
   </div>
   {editTarget===selected.id&&<form onSubmit={e=>void saveProtection(e)} className="cmd-territory-protection">
    <h4>Agreement and territory protection</h4>
    <p>Protection is not granted by planning approval. Record signed franchise documentation before changing this status.</p>
    <label>Status<select value={requestedStatus} onChange={e=>setRequestedStatus(e.target.value as 'approved_market'|'protected')}><option value="approved_market">Approved home market (planning)</option><option value="protected">Protected by executed agreement</option></select></label>
    <label>Signed agreement reference<input value={agreement} onChange={e=>setAgreement(e.target.value)} maxLength={180} placeholder="Document reference or signed agreement identifier" /></label>
    <label>Effective date<input value={effective} onChange={e=>setEffective(e.target.value)} type="date"/></label>
    {requestedStatus==='protected'&&<label className="cmd-territory-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I verified the signed agreement and league approval.</label>}
    <div className="cmd-form-actions"><button className="cmd-button" type="submit" disabled={!!working}>{working==='protection'?'Saving…':'Save territory status'}</button><button className="cmd-text-button" type="button" onClick={()=>setEditTarget(null)}>Cancel</button></div>
   </form>}
   <div className="cmd-territory-filter">
    <label>Search assigned jurisdiction<input type="search" placeholder="County, independent city or FIPS" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <label>Responsibility<select value={scopeFilter} onChange={e=>setScopeFilter(e.target.value as 'all'|'core'|'development')}><option value="all">All areas</option><option value="core">Core market</option><option value="development">Development region</option></select></label>
   </div>
   {ambiguous&&<p className="cmd-territory-error">Territory registry has repeated FIPS identifiers. Investigate before changing assignments.</p>}
   <div className="cmd-territory-localities">
    {visible.length===0?<p className="cmd-empty">No jurisdictions match your filter.</p>:visible.map(l=><div className="cmd-territory-locality" key={l.fips}>
     <div><strong>{label(l)}</strong><small>FIPS {l.fips} · {l.scope==='core'?'Core market':'Development region'}</small></div>
     <div className="cmd-territory-controls">
      <label>Coverage<select aria-label={'Coverage level for '+label(l)} disabled={!!working} value={l.scope} onChange={e=>void updateLocality(l,{scope:e.target.value as Locality['scope']})}>
       <option value="core">Core</option><option value="development">Development</option>
      </select></label>
      <label>Assigned team<select aria-label={'Reassign '+label(l)} disabled={!!working} value={l.territory_id} onChange={e=>void updateLocality(l,{territory_id:e.target.value})}>
       {sorted.map(t=><option key={t.id} value={t.id}>{teams.find(team=>team.id===t.team_id)?.name||t.home_market}</option>)}
      </select></label>
     </div>
    </div>)}
   </div>
  </div>}
  {error&&<div role="alert" className="cmd-notice error">{error}</div>}
  {message&&<div role="status" className="cmd-notice">{message}</div>}
 </section>;
}
