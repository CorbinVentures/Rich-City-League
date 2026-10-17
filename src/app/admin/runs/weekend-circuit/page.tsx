'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Container} from '@/components/Container';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';

type Coverage={
 city_id:string;city_name:string;is_major:boolean;
 verified_eligible_park_sites:number;mapped_unverified_sites:number;
 assigned_slots:number;qualified_slots:number;upcoming_featured_runs:number;
 circuit_status:'scheduled'|'ready_to_generate'|'needs_court_assignment'|'needs_venue_verification';
};
type Pool={city:string;slot:number;court_slug:string;active:boolean};
type Venue={slug:string;name:string;address:string;locality:string;source_label:string|null;hours_text:string|null;verification_status:string};

const descriptions:Record<Coverage['circuit_status'],string>={
 scheduled:'Weekend listings generated',
 ready_to_generate:'Four courts configured; awaiting scheduler',
 needs_court_assignment:'Enough mapped eligible park sites; assign four distinct courts',
 needs_venue_verification:'Additional public park courts require independent verification'
};
const tags:Record<Coverage['circuit_status'],string>={
 scheduled:'border-emerald-400/35 text-emerald-200 bg-emerald-400/10',
 ready_to_generate:'border-sky-400/35 text-sky-200 bg-sky-400/10',
 needs_court_assignment:'border-amber-400/35 text-amber-200 bg-amber-400/10',
 needs_venue_verification:'border-white/15 text-slate-300 bg-slate-400/10'
};

export default function WeekendCircuitCommandPage(){
 const {user,loading:authLoading}=useAuth();
 const db=useMemo(()=>getSupabaseClient() as any,[]);
 const [authorized,setAuthorized]=useState(false);
 const [authorizationChecked,setAuthorizationChecked]=useState(false);
 const [cities,setCities]=useState<Coverage[]>([]);
 const [pool,setPool]=useState<Pool[]>([]);
 const [venues,setVenues]=useState<Venue[]>([]);
 const [selected,setSelected]=useState('richmond');
 const [query,setQuery]=useState('');
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');

 useEffect(()=>{
  let active=true;
  if(authLoading)return;
  if(!db||!user){setAuthorized(false);setAuthorizationChecked(true);return;}
  void db.rpc('is_staff_or_admin').then(({data,error}:{data:boolean|null,error:any})=>{
   if(active){setAuthorized(!error&&data===true);setAuthorizationChecked(true);}
  });
  return ()=>{active=false;};
 },[db,user?.id,authLoading]);

 const refresh=useCallback(async()=>{
  if(!db)return;
  setLoading(true);
  const [c,p]=await Promise.all([
   db.from('rch_weekend_circuit_coverage').select('*').order('is_major',{ascending:false}).order('city_name'),
   db.from('rch_weekend_circuit_courts').select('city,slot,court_slug,active')
  ]);
  if(c.error||p.error)setError(c.error?.message||p.error?.message||'Unable to load statewide coverage.');
  else{setCities(c.data||[]);setPool(p.data||[]);setError('');}
  setLoading(false);
 },[db]);
 useEffect(()=>{if(authorized)void refresh();},[authorized,refresh]);
 const target=cities.find(c=>c.city_id===selected)||cities[0];
 useEffect(()=>{
  if(!db||!authorized||!target)return;
  let active=true;
  setVenues([]);
  void db.from('basketball_locations')
   .select('slug,name,address,locality,source_label,hours_text,verification_status')
   .eq('is_active',true).eq('locality',target.city_name)
   .eq('venue_type','outdoor').eq('access_type','public')
   .in('verification_status',['official','provider'])
   .order('name').limit(200).then(({data,error}:{data:Venue[]|null,error:any})=>{
    if(active){if(error)setError(error.message);else setVenues((data||[]).filter(v=>/(park|playground)/i.test(v.name)));}
   });
  return ()=>{active=false;};
 },[authorized,db,target?.city_id,target?.city_name]);

 const filtered=cities.filter(c=>c.city_name.toLowerCase().includes(query.toLowerCase().trim())||c.circuit_status.replaceAll('_',' ').includes(query.toLowerCase().trim()));
 const live=cities.filter(c=>c.circuit_status==='scheduled').length;
 const ready=cities.filter(c=>c.qualified_slots===4).length;
 const major=cities.filter(c=>c.is_major).length;
 const poolForCity=pool.filter(c=>c.city===target?.city_name);

 async function assign(slot:number,slug:string){
  if(!db||!target||!authorized||busy)return;
  setBusy(target.city_id+'-'+slot);setNotice('');setError('');
  const current=poolForCity.find(p=>p.slot===slot);
  const {error:failure}=!slug
   ? await db.from('rch_weekend_circuit_courts').delete().eq('city',target.city_name).eq('slot',slot)
   : await db.from('rch_weekend_circuit_courts').upsert({city:target.city_name,slot,court_slug:slug,active:true},{onConflict:'city,slot'});
  if(failure)setError(failure.message);
  else{
   setNotice('Court slot saved. The circuit generator will activate the city when all four eligible courts are configured. Previously published Runs do not move.');
   await refresh();
  }
  setBusy('');
 }
 if(!authLoading&&authorizationChecked&&!authorized)return <main className="min-h-screen bg-[#060d18] p-8 text-white"><Container maxWidth="lg"><h1 className="text-2xl font-black">Staff access required</h1><Link className="mt-4 inline-block text-sky-300" href="/runs">Return to Runs</Link></Container></main>;
 return <main className="min-h-screen bg-[#050d19] pb-28 pt-8 text-slate-100">
 <Container maxWidth="xl">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><p className="text-xs font-black uppercase tracking-[.16em] text-sky-300">RCH Runs · Statewide Operations</p>
    <h1 className="mt-2 text-3xl font-black uppercase">Weekend Circuit Command</h1>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Every key Virginia market is tracked. A city needs four distinct officially or provider-mapped public outdoor basketball parks before the weekly 2× verified REP rotation can begin.</p>
   </div>
   <Link href="/runs" className="rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white">← Runs Arena</Link>
  </div>
  {notice&&<p role="status" className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</p>}
  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
  {!authorizationChecked||loading?<p className="mt-8 text-sm text-slate-400">Loading verified market coverage…</p>:<>
    <section aria-label="Circuit expansion status" className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
     {[
      [String(cities.length),'Tracked VA markets'],
      [String(major),'Priority major cities'],
      [String(ready),'Four-court-ready'],
      [String(live),'Scheduled cities']
     ].map(([value,label])=><div key={label} className="rounded-2xl border border-white/10 bg-[#0a1b2d] p-4"><p className="text-3xl font-black text-white">{value}</p><p className="mt-1 text-xs text-slate-300">{label}</p></div>)}
    </section>
    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(280px,1fr)_minmax(320px,1.25fr)]">
     <section className="rounded-2xl border border-white/10 bg-[#091829] p-4">
      <h2 className="text-lg font-black">Virginia City Coverage</h2>
      <input aria-label="Filter cities" value={query} onChange={e=>setQuery(e.target.value)}
       placeholder="Search cities or readiness" className="mt-3 min-h-11 w-full rounded-lg border border-white/20 bg-[#06101d] px-3 text-sm text-white placeholder:text-slate-400"/>
      <div className="mt-4 max-h-[650px] space-y-2 overflow-y-auto pr-1">
       {filtered.map(c=><button key={c.city_id} type="button" onClick={()=>{setSelected(c.city_id);setNotice('');}}
        aria-pressed={target?.city_id===c.city_id}
        className={'w-full rounded-xl border p-3 text-left '+(target?.city_id===c.city_id?'border-sky-400/70 bg-[#123655]':'border-white/10 bg-[#0d2133] hover:border-sky-400/30')}>
        <div className="flex flex-wrap items-center justify-between gap-2"><strong>{c.city_name}</strong>{c.is_major&&<span className="text-[10px] font-bold uppercase tracking-wider text-sky-300">Major city</span>}</div>
        <p className="mt-1 text-xs text-slate-300">{c.qualified_slots}/4 active slots · {c.verified_eligible_park_sites} eligible sites · {c.upcoming_featured_runs} future Runs</p>
        <span className={'mt-2 inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold '+tags[c.circuit_status]}>{descriptions[c.circuit_status]}</span>
       </button>)}
      </div>
     </section>
     <section className="rounded-2xl border border-white/10 bg-[#091829] p-4 sm:p-5">
      {target&&<>
       <p className="text-xs font-black uppercase tracking-wider text-sky-300">City Court Rotation</p>
       <h2 className="mt-1 text-2xl font-black">{target.city_name}</h2>
       <p className="mt-2 text-sm leading-6 text-slate-300">{descriptions[target.circuit_status]}. There are {target.mapped_unverified_sites} additional mapped records that are not automatically qualified.</p>
       <p className="mt-3 text-xs leading-5 text-amber-100">Selecting a mapped court does not reserve a public facility or prove current physical availability. Verify park conditions, hours and access with the local authority before advertising a pickup session.</p>
       <div className="mt-5 space-y-3">{[1,2,3,4].map(slot=>{
        const current=poolForCity.find(p=>p.slot===slot);
        return <div key={slot} className="rounded-xl border border-white/10 bg-[#061421] p-4">
         <label className="block text-sm font-black" htmlFor={'circuit-court-'+slot}>{slot===1?'Week A · Saturday':slot===2?'Week A · Sunday':slot===3?'Week B · Saturday':'Week B · Sunday'}</label>
         <select id={'circuit-court-'+slot} value={current?.court_slug||''} disabled={!!busy||!authorized}
           onChange={e=>void assign(slot,e.target.value)}
           className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-[#10263b] px-3 text-sm text-white">
          <option value="">No court selected</option>
          {venues.map(v=><option key={v.slug} value={v.slug}>{v.name} · {v.address}</option>)}
         </select>
         {current&&!venues.some(v=>v.slug===current.court_slug)&&<p className="mt-2 text-xs text-amber-200">This slot's court is no longer in the eligible list and will block activation.</p>}
        </div>;
       })}</div>
       <div className="mt-5 rounded-xl border border-sky-400/20 bg-[#0d2a41] p-4">
        <p className="font-bold">Automatic weekend rule</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">Saturday at 11 a.m., Sunday at 3 p.m. New weekends alternate between slots 1/2 and 3/4. Player-created Runs remain 1×. Changing a slot does not change existing RSVP locations; cancel affected published Runs separately.</p>
       </div>
      </>}
     </section>
    </div>
   </>}
 </Container>
 </main>;
}
