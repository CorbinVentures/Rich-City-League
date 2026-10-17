'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';
import {FaArrowLeft,FaArrowRotateRight,FaShieldHalved,FaArrowUpRightFromSquare} from 'react-icons/fa6';

type Review={id:string;facility_name:string;locality:string;street_address:string|null;
 venue_type:string;access_type:string;agency_name:string;official_source_url:string;
 basketball_evidence:string;status:string;submitted_at:string;review_notes:string|null};
const empty={name:'',locality:'',address:'',venue:'outdoor',access:'varies',agency:'',source:'',evidence:'',decision:''};

export default function ParksRecOfficialSourceIntake(){
 const {user,loading:authLoading}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [verified,setVerified]=useState(false),[checked,setChecked]=useState(false);
 const [reviews,setReviews]=useState<Review[]>([]),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState(''),[error,setError]=useState('');
 const [fields,setFields]=useState(empty),[reviewing,setReviewing]=useState<string|null>(null);
 useEffect(()=>{
  if(authLoading)return;
  if(!db||!user){setChecked(true);return;}
  let active=true;
  void db.rpc('is_staff_or_admin').then(({data,error}:{data:boolean|null;error:any})=>{
   if(active){setVerified(!error&&data===true);setChecked(true);}
  });
  return()=>{active=false;};
 },[db,user?.id,authLoading]);
 const load=useCallback(async()=>{
  if(!db||!verified)return;
  setLoading(true);
  const {data,error}=await db.from('rch_official_facility_reviews')
   .select('id,facility_name,locality,street_address,venue_type,access_type,agency_name,official_source_url,basketball_evidence,status,submitted_at,review_notes')
   .order('submitted_at',{ascending:false}).limit(200);
  if(error)setError(error.message);else setReviews(data||[]);
  setLoading(false);
 },[db,verified]);
 useEffect(()=>{if(verified)void load();},[verified,load]);
 if(!checked)return <main className="min-h-screen bg-[#071727] p-8 text-white">Confirming staff permissions…</main>;
 if(!verified)return <main className="min-h-screen bg-[#071727] p-8 text-white"><h1 className="text-2xl font-black">Staff access required</h1><Link className="mt-4 inline-block text-sky-200" href="/runs">Return to Runs</Link></main>;
 const set=(key:keyof typeof empty,value:string)=>setFields(old=>({...old,[key]:value}));
 const submit=async()=>{
  if(busy||!db)return;
  setBusy(true);setError('');setMessage('');
  const {error}=await db.rpc('rch_submit_official_basketball_facility',{
   p_name:fields.name,p_locality:fields.locality,p_address:fields.address,
   p_venue:fields.venue,p_access:fields.access,p_agency:fields.agency,
   p_source_url:fields.source,p_evidence:fields.evidence
  });
  if(error)setError(error.message);
  else{setMessage('Official facility source submitted. It is not yet verified or mapped; staff must review the evidence.');setFields(empty);await load();}
  setBusy(false);
 };
 const decide=async(id:string,approved:boolean)=>{
  if(!db||busy)return;
  setBusy(true);setError('');setMessage('');
  const {error}=await db.rpc('rch_review_official_basketball_facility',{
   p_review:id,p_approve:approved,p_reason:fields.decision
  });
  if(error)setError(error.message);
  else{setMessage(approved?'Evidence accepted. Facility added to the official directory without fabricated coordinates.':'Source proposal rejected with a recorded decision.');setReviewing(null);setFields(f=>({...f,decision:''}));await load();}
  setBusy(false);
 };
 return <main className="min-h-screen bg-[#061422] px-4 py-9 pb-32 text-white">
  <div className="mx-auto max-w-5xl">
   <div className="flex flex-wrap justify-between gap-3"><Link className="inline-flex items-center gap-2 text-sm text-sky-200" href="/admin/runs/map-quality"><FaArrowLeft/> Map Operations</Link>
    <button className="rounded-lg border border-sky-400/50 px-4 py-2 text-xs" type="button" onClick={()=>void load()}><FaArrowRotateRight className="mr-2 inline"/>Refresh</button>
   </div>
   <p className="mt-6 text-xs font-black uppercase tracking-widest text-sky-200">RCH Operations · Virginia</p>
   <h1 className="mt-2 text-3xl font-black">Parks & Rec Official Source Intake</h1>
   <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Submit a city/county government facility page explicitly documenting basketball courts or a usable basketball gym. Approvals require human review and add only the sourced venue record. Coordinates, opening hours, access and game availability are never guessed.</p>
   <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100"><FaShieldHalved className="mt-1 shrink-0"/> A Parks & Recreation department listing is not permission to book or hold an organized event. Verify facility access separately.</div>
   {error&&<div role="alert" className="mt-4 rounded-xl border border-red-500/50 bg-red-800/20 p-3 text-sm">{error}</div>}
   {message&&<div role="status" className="mt-4 rounded-xl border border-emerald-500/50 bg-emerald-800/20 p-3 text-sm">{message}</div>}
   <section aria-label="Propose officially listed basketball facility" className="mt-7 rounded-2xl border border-sky-800 bg-[#0b2a43] p-5">
    <h2 className="text-xl font-black">Document a basketball facility</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
     {([['name','Official facility name'],['locality','Virginia city / locality'],['address','Street address (optional; leave blank if unverified)'],['agency','Official Parks & Recreation agency'],['source','Official source page URL']] as const).map(([key,label])=><label key={key} className={'text-xs font-bold '+(key==='source'?'sm:col-span-2':'')}>{label}
      <input type={key==='source'?'url':'text'} value={fields[key]} onChange={e=>set(key,e.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-600 bg-[#061827] px-3 text-white"/>
     </label>)}
     <label className="text-xs font-bold">Basketball facility type
      <select value={fields.venue} onChange={e=>set('venue',e.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-600 bg-[#061827] p-2">
       <option value="outdoor">Outdoor basketball court</option><option value="indoor">Indoor basketball gym</option><option value="mixed">Mixed courts / recreation center</option>
      </select></label>
     <label className="text-xs font-bold">Current access information
      <select value={fields.access} onChange={e=>set('access',e.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-600 bg-[#061827] p-2">
       <option value="varies">Not confirmed / varies</option><option value="public">Public (check posted rules)</option><option value="free_pass">Free pass required</option><option value="reservation">Reservation required</option><option value="membership">Membership required</option>
      </select></label>
     <label className="text-xs font-bold sm:col-span-2">Evidence on the official page
      <textarea value={fields.evidence} onChange={e=>set('evidence',e.target.value)} rows={3} placeholder="Explain exactly where the county/municipal agency confirms a basketball court or gym. Do not infer basketball from a generic 'recreation center' label." className="mt-1 block w-full rounded-lg border border-slate-600 bg-[#061827] p-3"/>
     </label>
    </div>
    <button type="button" disabled={busy} onClick={()=>void submit()} className="mt-4 min-h-11 rounded-xl bg-sky-600 px-5 py-3 text-sm font-black disabled:opacity-50">Submit for verification</button>
   </section>
   <section className="mt-8" aria-label="Official source approval queue">
    <h2 className="text-xl font-black">Official source verification queue</h2>
    {loading?<p className="mt-3 text-sm text-slate-300">Loading facility proposals…</p>:
     reviews.filter(r=>r.status==='pending').length===0?<p className="mt-4 text-sm text-slate-300">There are no pending source proposals.</p>:
     <div className="mt-4 grid gap-3">
      {reviews.filter(r=>r.status==='pending').map(r=><article key={r.id} className="rounded-2xl border border-sky-800 bg-[#0e2d46] p-4">
       <h3 className="font-black">{r.facility_name}</h3>
       <p className="mt-1 text-xs text-slate-300">{r.locality} · {r.venue_type} · {r.access_type} · {r.agency_name}</p>
       <p className="mt-2 text-sm text-slate-200">{r.basketball_evidence}</p>
       <a href={r.official_source_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-sky-200">Inspect official source <FaArrowUpRightFromSquare/></a>
       {reviewing===r.id?<div className="mt-4 grid gap-3">
        <textarea rows={3} value={fields.decision} onChange={e=>set('decision',e.target.value)} aria-label="Document independent official source review" placeholder="Document the exact government basketball amenity and any access caveats, or explain why the proposed source does not qualify" className="rounded-lg border border-slate-600 bg-[#061827] p-3 text-sm"/>
        <div className="flex flex-wrap gap-2"><button disabled={busy} type="button" onClick={()=>void decide(r.id,true)} className="rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold">Approve source</button>
         <button disabled={busy} type="button" onClick={()=>void decide(r.id,false)} className="rounded-xl bg-red-800 px-4 py-3 text-xs font-bold">Reject</button>
         <button type="button" onClick={()=>setReviewing(null)} className="rounded-xl border border-white/20 px-4 py-3 text-xs">Cancel</button></div>
       </div>:<button type="button" onClick={()=>setReviewing(r.id)} className="mt-3 block rounded-xl border border-sky-400 px-4 py-2 text-xs font-bold">Review this source</button>}
      </article>)}
     </div>}
   </section>
  </div>
 </main>;
}
