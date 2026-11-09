'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

type Division = { id:string; season_id:string; name:string; min_registration_age:number|null; max_registration_age:number|null; registration_fee_cents:number|null; registration_currency:string; registration_fields:any; waiver_title:string|null; waiver_body:string|null; waiver_version:string|null };
type Season = { id:string; name:string; registration_open:boolean };
type Field = { key:string; label:string; type:'text'|'textarea'|'number'|'date'|'select'|'checkbox'; required?:boolean; options?:string[] };

export function LeagueRegistrationSettings() {
 const db=useMemo(()=>getSupabaseClient() as any,[]);
 const [seasons,setSeasons]=useState<Season[]>([]);
 const [divisions,setDivisions]=useState<Division[]>([]);
 const [seasonId,setSeasonId]=useState('');
 const [divisionId,setDivisionId]=useState('');
 const [fee,setFee]=useState('');
 const [minAge,setMinAge]=useState('');
 const [maxAge,setMaxAge]=useState('');
 const [waiverTitle,setWaiverTitle]=useState('');
 const [waiverBody,setWaiverBody]=useState('');
 const [waiverVersion,setWaiverVersion]=useState('');
 const [fieldsText,setFieldsText]=useState('[]');
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const selected=divisions.find(item=>item.id===divisionId);
 const season=seasons.find(item=>item.id===seasonId);
 const available=divisions.filter(item=>item.season_id===seasonId);

 async function load() {
  if(!db){setError('RCH database connection is unavailable.');setLoading(false);return;}
  setLoading(true);setError('');
  const [seasonQ,divisionQ]=await Promise.all([
   db.from('seasons').select('id,name,registration_open').order('start_date',{ascending:false}).limit(100),
   db.from('divisions').select('id,season_id,name,min_registration_age,max_registration_age,registration_fee_cents,registration_currency,registration_fields,waiver_title,waiver_body,waiver_version').order('name').limit(250),
  ]);
  if(seasonQ.error||divisionQ.error){setError('Could not load registration settings.');setLoading(false);return;}
  const nextSeasons=seasonQ.data||[], nextDivisions=divisionQ.data||[];
  setSeasons(nextSeasons);setDivisions(nextDivisions);
  const nextSeason=nextSeasons.find((item:Season)=>item.id===seasonId)||nextSeasons[0];
  setSeasonId(nextSeason?.id||'');
  const nextDivision=nextDivisions.find((item:Division)=>item.id===divisionId&&item.season_id===nextSeason?.id)||nextDivisions.find((item:Division)=>item.season_id===nextSeason?.id);
  setDivisionId(nextDivision?.id||'');
  setLoading(false);
 }
 useEffect(()=>{void load();},[db]);

 useEffect(()=>{
  if(!selected)return;
  setFee(selected.registration_fee_cents==null?'':(selected.registration_fee_cents/100).toFixed(2));
  setMinAge(selected.min_registration_age==null?'':String(selected.min_registration_age));
  setMaxAge(selected.max_registration_age==null?'':String(selected.max_registration_age));
  setWaiverTitle(selected.waiver_title||'');
  setWaiverBody(selected.waiver_body||'');
  setWaiverVersion(selected.waiver_version||'');
  setFieldsText(JSON.stringify(Array.isArray(selected.registration_fields)?selected.registration_fields:[],null,2));
  setMessage('');setError('');
 },[divisionId]);

 async function toggleRegistration() {
  if(!db||!season)return;
  setSaving(true);setError('');setMessage('');
  const next=!season.registration_open;
  const {error:saveError}=await db.from('seasons').update({registration_open:next}).eq('id',season.id);
  if(saveError)setError('Unable to update registration window. Check Command Center staff access.');
  else {setSeasons(items=>items.map(item=>item.id===season.id?{...item,registration_open:next}:item));setMessage(next?'Applications are open for this season.':'Applications are closed for this season.');}
  setSaving(false);
 }
 async function save() {
  if(!db||!selected)return;
  setSaving(true);setError('');setMessage('');
  const dollars=fee.trim()===''?null:Number(fee);
  const low=minAge.trim()===''?null:Number(minAge), high=maxAge.trim()===''?null:Number(maxAge);
  let fields:Field[];
  try{
   const parsed=JSON.parse(fieldsText);
   if(!Array.isArray(parsed)||parsed.length>25)throw new Error('Use a JSON array with no more than 25 fields.');
   const allowed=new Set(['text','textarea','number','date','select','checkbox']);
   fields=parsed.map((item:any)=>({
    key:String(item.key||'').trim(),label:String(item.label||'').trim(),type:item.type,
    ...(item.required===true?{required:true}:{}),
    ...(item.type==='select'?{options:Array.isArray(item.options)?item.options.map(String).slice(0,30):[]}:{}),
   }));
   if(fields.some(field=>! /^[a-z][a-z0-9_]{0,39}$/.test(field.key)||!field.label||!allowed.has(field.type)||(field.type==='select'&&!(field.options?.length))))throw new Error('Each question needs a safe key, label, supported type, and options for select fields.');
  }catch(reason){setError(reason instanceof Error?reason.message:'Application questions must be valid JSON.');setSaving(false);return;}
  if(dollars!==null&&(!Number.isFinite(dollars)||dollars<0||Math.round(dollars*100)!==dollars*100||(dollars>0&&dollars<0.5))){setError('Enter a fee of $0.00 or at least $0.50. Leave blank until the price is finalized.');setSaving(false);return;}
  if([low,high].some(value=>value!==null&&(!Number.isInteger(value)||value<0||value>120))||(low!==null&&high!==null&&low>high)){setError('Enter valid ages from 0 to 120; minimum cannot exceed maximum.');setSaving(false);return;}
  const body=waiverBody.trim();
  if(body&&(!waiverTitle.trim()||!waiverVersion.trim())){setError('A waiver requires a title and version.');setSaving(false);return;}
  const patch={
   registration_fee_cents:dollars===null?null:Math.round(dollars*100),registration_currency:'usd',
   min_registration_age:low,max_registration_age:high,registration_fields:fields,
   waiver_title:body?waiverTitle.trim():null,waiver_body:body||null,waiver_version:body?waiverVersion.trim():null,
  };
  const {error:saveError}=await db.from('divisions').update(patch).eq('id',selected.id);
  if(saveError)setError('Unable to save division settings. Confirm staff permissions and try again.');
  else {setDivisions(items=>items.map(item=>item.id===selected.id?{...item,...patch}:item));setMessage('Division registration settings saved.');}
  setSaving(false);
 }
 const input='mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white';
 if(loading)return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-white/55">Loading native registration settings…</section>;
 return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
  <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">RCH REGISTRATION CONTROL</p>
  <h2 className="mt-2 font-display text-2xl font-black uppercase">Applications, eligibility & fees</h2>
  <p className="mt-2 text-sm leading-6 text-white/55">Set the application window, division fee, age rules, custom questions, and versioned waiver. Blank fee means pricing is not finalized; $0 means free.</p>
  {message&&<p role="status" className="mt-4 rounded-lg bg-emerald-300/10 p-3 text-sm text-emerald-100">{message}</p>}
  {error&&<p role="alert" className="mt-4 rounded-lg bg-red-300/10 p-3 text-sm text-red-100">{error}</p>}
  {!seasons.length?<p className="mt-5 text-sm text-white/60">Create a season and division in League setup first.</p>:<>
   <div className="mt-5 grid gap-4 sm:grid-cols-2">
    <label className="text-sm text-white/70">Season<select value={seasonId} onChange={event=>{setSeasonId(event.target.value);setDivisionId('');}} className={input}>{seasons.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="text-sm text-white/70">Division<select value={divisionId} onChange={event=>setDivisionId(event.target.value)} className={input}><option value="">Select division</option>{available.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
   </div>
   {season&&<div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4"><div><strong className="text-sm text-white">{season.name}</strong><p className="mt-1 text-xs text-white/50">Application window is {season.registration_open?'open':'closed'}.</p></div><button type="button" disabled={saving} onClick={()=>void toggleRegistration()} className="rounded-lg border border-blue-200/20 bg-blue-300/10 px-4 py-2 text-xs font-bold text-blue-100 disabled:opacity-50">{season.registration_open?'Close applications':'Open applications'}</button></div>}
   {!selected?<p className="mt-5 text-sm text-white/50">Add a division to this season before configuring applications.</p>:<div className="mt-5 space-y-5">
    <div className="grid gap-4 sm:grid-cols-3">
     <label className="text-sm text-white/70">Player fee (USD)<input inputMode="decimal" type="number" min="0" step="0.01" value={fee} onChange={event=>setFee(event.target.value)} placeholder="Blank = not finalized" className={input}/></label>
     <label className="text-sm text-white/70">Minimum age<input type="number" min="0" max="120" value={minAge} onChange={event=>setMinAge(event.target.value)} placeholder="No minimum" className={input}/></label>
     <label className="text-sm text-white/70">Maximum age<input type="number" min="0" max="120" value={maxAge} onChange={event=>setMaxAge(event.target.value)} placeholder="No maximum" className={input}/></label>
    </div>
    <label className="block text-sm text-white/70">Application questions <span className="text-white/40">(JSON array, up to 25)</span><textarea rows={9} value={fieldsText} onChange={event=>setFieldsText(event.target.value)} className={input+' font-mono text-xs'} /></label>
    <div className="rounded-xl border border-amber-200/15 bg-amber-200/[.04] p-4">
     <h3 className="font-bold text-amber-100">Participation waiver</h3>
     <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm text-white/70">Waiver title<input maxLength={160} value={waiverTitle} onChange={event=>setWaiverTitle(event.target.value)} className={input}/></label><label className="text-sm text-white/70">Waiver version<input maxLength={80} value={waiverVersion} onChange={event=>setWaiverVersion(event.target.value)} placeholder="Example: 2027.1" className={input}/></label></div>
     <label className="mt-3 block text-sm text-white/70">Waiver language<textarea rows={7} maxLength={20000} value={waiverBody} onChange={event=>setWaiverBody(event.target.value)} className={input}/></label>
     <p className="mt-2 text-xs leading-5 text-white/45">Changing waiver language should also change its version. Each submitted application keeps the exact signed copy and timestamp.</p>
    </div>
    <button type="button" disabled={saving} onClick={()=>void save()} className="rounded-lg bg-rcl-gold px-5 py-3 font-bold text-rcl-black disabled:opacity-50">{saving?'Saving…':'Save division registration settings'}</button>
   </div>}
  </>}
 </section>;
}
