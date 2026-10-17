'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';
import {FaArrowLeft,FaMapLocationDot,FaTriangleExclamation,FaCheck,FaArrowUpRightFromSquare} from 'react-icons/fa6';

type Place={slug:string;name:string;address:string;locality:string;latitude:number|null;longitude:number|null;source_url:string|null;source_label:string|null;verification_status:string;access_type:string;venue_type:string;is_active:boolean};
const labels=['Chesterfield','North Chesterfield','South Chesterfield'];
export default function ChesterfieldMapQualityPage(){
 const {user,loading:authLoading}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [allowed,setAllowed]=useState(false),[checked,setChecked]=useState(false),[loading,setLoading]=useState(false);
 const [items,setItems]=useState<Place[]>([]),[error,setError]=useState(''),[filter,setFilter]=useState<'all'|'needs-pin'|'mapped'|'other'>('needs-pin');
 useEffect(()=>{
  if(authLoading)return;
  if(!user||!db){setChecked(true);setAllowed(false);return;}
  let alive=true;
  void db.rpc('is_staff_or_admin').then(({data,error}:{data:boolean|null;error:any})=>{
   if(alive){setAllowed(!error&&data===true);setChecked(true);}
  });
  return()=>{alive=false;};
 },[user?.id,db,authLoading]);
 useEffect(()=>{
  if(!allowed||!db)return;
  let alive=true;setLoading(true);
  void db.from('basketball_locations')
   .select('slug,name,address,locality,latitude,longitude,source_url,source_label,verification_status,access_type,venue_type,is_active')
   .in('locality',labels).order('name').range(0,499)
   .then(({data,error}:{data:Place[]|null;error:any})=>{
    if(!alive)return;
    setItems(data||[]);setError(error?.message||'');setLoading(false);
   });
  return()=>{alive=false;};
 },[allowed,db]);
 if(!checked)return <main className='min-h-screen bg-[#071727] p-8 text-white'>Verifying staff access…</main>;
 if(!allowed)return <main className='min-h-screen bg-[#071727] p-8 text-white'><h1 className='text-2xl font-black'>Staff access required</h1><Link href='/runs' className='mt-4 inline-block text-sky-200'>Return to Runs</Link></main>;
 const eligible=(r:Place)=>r.is_active&&['official','provider'].includes(r.verification_status)&&r.venue_type==='outdoor'&&r.access_type==='public';
 const pinned=(r:Place)=>r.latitude!==null&&r.longitude!==null&&Number.isFinite(r.latitude)&&Number.isFinite(r.longitude);
 const verified=items.filter(eligible),mapped=verified.filter(pinned),pending=verified.filter(r=>!pinned(r));
 const shown=items.filter(r=>filter==='all'||filter==='needs-pin'&&eligible(r)&&!pinned(r)||filter==='mapped'&&eligible(r)&&pinned(r)||filter==='other'&&!eligible(r));
 return <main className='min-h-screen bg-[#061422] px-4 py-9 pb-32 text-white'>
  <div className='mx-auto max-w-6xl'>
   <Link href='/admin/runs/weekend-circuit' className='inline-flex items-center gap-2 text-sm text-sky-300'><FaArrowLeft/> Weekend Circuit HQ</Link>
   <div className='mt-4 flex flex-wrap items-center justify-between gap-3'><div>
    <p className='text-xs font-bold uppercase tracking-[.2em] text-sky-300'>RCH Runs / Geographic QA</p>
    <h1 className='mt-2 text-3xl font-black'>Chesterfield Map Operations</h1>
    <p className='mt-3 max-w-3xl text-sm leading-6 text-slate-300'>Staff-only reconciliation of Chesterfield, North Chesterfield and South Chesterfield court records. Review source evidence before approving exact court coordinates. An address or administrative centroid is never a precise court pin.</p>
   </div><FaMapLocationDot className='text-4xl text-sky-300'/></div>
   {error&&<p role='alert' className='mt-5 rounded-lg border border-red-300/50 bg-red-900/30 p-4 text-sm'>{error}</p>}
   <section aria-label='Court quality totals' className='mt-7 grid grid-cols-2 gap-3 md:grid-cols-4'>
    {[[items.length,'Records'],[verified.length,'Eligible public courts'],[mapped.length,'With coordinates'],[pending.length,'Need verified pins']].map(([n,title])=><div key={title} className='rounded-2xl border border-sky-800 bg-[#102f46] p-4'><strong className='text-3xl font-black'>{n}</strong><p className='mt-1 text-xs text-slate-300'>{title}</p></div>)}
   </section>
   <div className='mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100'><FaTriangleExclamation className='mr-2 inline'/> Officially sourced does not guarantee geographic accuracy. This audit is read-only: no location or competitive data is changed without documented evidence and a reviewed update.</div>
   <div className='mt-5 flex flex-wrap gap-2'>
    {([['needs-pin','Coordinate queue'],['mapped','Mapped'],['other','Other statuses'],['all','All records']] as const).map(([value,name])=><button type='button' key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)} className={'rounded-xl border px-4 py-3 text-xs font-bold '+(filter===value?'border-sky-300 bg-sky-700':'border-white/20 bg-[#11283e]')}>{name}</button>)}
   </div>
   {loading?<p role='status' className='mt-5 text-slate-300'>Auditing court records…</p>:<div className='mt-4 space-y-3'>
    {!shown.length&&<p className='rounded-xl border border-white/20 p-5 text-sm'>No court records in this view.</p>}
    {shown.map(c=><article key={c.slug} className='rounded-2xl border border-slate-600/50 bg-[#0d253a] p-4'>
     <div className='flex flex-wrap items-start justify-between gap-3'><div>
       <strong className='text-base'>{c.name}</strong><p className='mt-1 text-xs text-slate-300'>{c.address||'Address missing'} · {c.locality}</p>
       <p className='mt-2 text-xs text-sky-200'>{c.verification_status} · {c.access_type} · {c.venue_type} · {c.slug}</p>
      </div><span className={'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold '+(eligible(c)&&pinned(c)?'border-emerald-500/50 text-emerald-200':eligible(c)?'border-amber-400/50 text-amber-200':'border-slate-500 text-slate-300')}>
      {eligible(c)&&pinned(c)?<FaCheck/>:<FaTriangleExclamation/>}{eligible(c)?pinned(c)?'Coordinates on file':'Pin needs review':'Not currently eligible'}
     </span></div>
     <div className='mt-3 flex flex-wrap gap-4 text-xs text-slate-300'><span>Latitude: {c.latitude??'missing'}</span><span>Longitude: {c.longitude??'missing'}</span><span>Source: {c.source_label||'unspecified'}</span></div>
     {c.source_url&&/^https:\/\//.test(c.source_url)&&<a href={c.source_url} target='_blank' rel='noopener noreferrer' className='mt-3 inline-flex items-center gap-2 text-xs font-bold text-sky-300'>Inspect official source <FaArrowUpRightFromSquare/></a>}
    </article>)}
   </div>}
  </div>
 </main>;
}
