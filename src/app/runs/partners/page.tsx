'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaBasketball,FaBuilding,FaCircleCheck,FaLocationDot,FaShieldHalved,FaUsers} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';

type Partner={id:string;slug:string;name:string;city:string;description:string;instagram_url:string|null;logo_url:string|null;brand_color:string;owner_id:string;status:string};
const empty={name:'',city:'',description:'',instagram:'',logo:''};

export default function RunsPartnersPage(){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [partners,setPartners]=useState<Partner[]>([]);
 const [mine,setMine]=useState<Partner[]>([]);
 const [managed,setManaged]=useState<Partner[]>([]);
 const [form,setForm]=useState(empty);
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [reviewAccess,setReviewAccess]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  if(!db){setLoading(false);return;}
  setLoading(true);
  if(user?.id){const {data:admin}=await db.rpc('is_staff_or_admin');setReviewAccess(Boolean(admin));}
  else setReviewAccess(false);
  const [directory,own,staff]=await Promise.all([
   db.from('rch_runs_partners').select('id,slug,name,city,description,instagram_url,logo_url,brand_color,owner_id,status').eq('status','approved').order('city').order('name').limit(150),
   user?.id?db.from('rch_runs_partners').select('id,slug,name,city,description,instagram_url,logo_url,brand_color,owner_id,status').eq('owner_id',user.id).order('created_at',{ascending:false}):Promise.resolve({data:[]}),
   user?.id?db.from('rch_runs_partner_members').select('partner_id').eq('profile_id',user.id):Promise.resolve({data:[]})
  ]);
  if(directory.error&&directory.error.code!=='42P01')setError(directory.error.message);
  setPartners((directory.data??[]) as Partner[]);
  setMine((own.data??[]) as Partner[]);
  const ids=(staff.data??[]).map((x:{partner_id:string})=>x.partner_id);
  if(ids.length){
   const {data}=await db.from('rch_runs_partners').select('id,slug,name,city,description,instagram_url,logo_url,brand_color,owner_id,status').in('id',ids);
   setManaged((data??[]) as Partner[]);
  }else setManaged([]);
  setLoading(false);
 },[db,user?.id]);
 useEffect(()=>{void load();},[load]);
 async function apply(e:React.FormEvent){
  e.preventDefault();if(!db||!user?.id){setError('Sign in as an RCH member to apply.');return;}
  setBusy(true);setError('');setMessage('');
  const {error:failure}=await db.rpc('rch_apply_runs_partner',{
    p_name:form.name,p_city:form.city,p_description:form.description,
    p_instagram:form.instagram||null,p_logo:form.logo||null
  });
  if(failure)setError(failure.message);
  else{setMessage('Partner HQ application received. RCH operations will review your organization. No partnership badge appears until approval.');setForm(empty);setOpen(false);await load();}
  setBusy(false);
 }
 const myHqs=[...mine,...managed.filter(p=>!mine.some(m=>m.id===p.id))];
 return <main className="min-h-screen bg-[#061320] px-4 pb-28 pt-8 text-white sm:px-8">
  <div className="mx-auto max-w-6xl">
   <Link href="/runs" className="text-xs font-bold text-[#91cfff]">← Back to Runs</Link>
   <div className="mt-5 overflow-hidden rounded-3xl border border-[#315778] bg-[radial-gradient(circle_at_85%_0%,#164d80,#0a2138_55%,#071727)] p-6 sm:p-10">
    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-[#7cc5ff]"><FaBuilding/> RCH RUNS NETWORK</p>
    <h1 className="mt-4 max-w-3xl text-4xl font-black uppercase leading-[.98] tracking-tight sm:text-6xl">THE PARK.<br/><span className="text-[#60baff]">THE REC.</span><br/>YOUR ORGANIZATION.</h1>
    <p className="mt-5 max-w-2xl text-sm leading-7 text-[#c3d7e8]">Independent Virginia basketball organizers get their own branded Runs HQ. Players carry one basketball identity, verified results, badges and REP across every participating run.</p>
    <div className="mt-6 flex flex-wrap gap-3">
     <button onClick={()=>setOpen(v=>!v)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#348ff5] px-5 text-sm font-black text-white">Apply for Partner HQ <FaArrowRight/></button>
     <Link href="/runs/hosts" className="inline-flex min-h-11 items-center rounded-xl border border-[#6490b2] px-5 text-sm font-bold text-[#c2e6ff]">Host verification</Link>
     {reviewAccess&&<Link href="/runs/partners/review" className="inline-flex min-h-11 items-center rounded-xl border border-[#6490b2] px-5 text-sm font-bold text-[#c2e6ff]">Operations approvals →</Link>}
    </div>
   </div>
   {error&&<p role="alert" className="mt-4 rounded-xl border border-red-400/40 p-3 text-sm text-red-200">{error}</p>}
   {message&&<p role="status" className="mt-4 rounded-xl border border-emerald-500/40 p-3 text-sm text-emerald-200">{message}</p>}
   {open&&<form onSubmit={e=>void apply(e)} className="mt-5 grid gap-4 rounded-2xl border border-[#3a6c92] bg-[#0c2741] p-5 sm:grid-cols-2">
    <h2 className="text-xl font-black sm:col-span-2">Request an organization headquarters</h2>
    <label className="text-xs font-bold">Organization name<input required minLength={3} maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-2 w-full rounded-lg border border-[#497596] bg-[#071a2c] p-3 text-sm" placeholder="Your existing basketball organization"/></label>
    <label className="text-xs font-bold">Virginia city<input required minLength={2} maxLength={100} value={form.city} onChange={e=>setForm({...form,city:e.target.value})} className="mt-2 w-full rounded-lg border border-[#497596] bg-[#071a2c] p-3 text-sm" placeholder="Richmond"/></label>
    <label className="text-xs font-bold sm:col-span-2">What does your organization host?<textarea maxLength={1200} rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-2 w-full rounded-lg border border-[#497596] bg-[#071a2c] p-3 text-sm" placeholder="Indoor REC games, outdoor runs, leagues, training..."/></label>
    <label className="text-xs font-bold">Instagram profile URL<input type="url" value={form.instagram} onChange={e=>setForm({...form,instagram:e.target.value})} className="mt-2 w-full rounded-lg border border-[#497596] bg-[#071a2c] p-3 text-sm" placeholder="https://www.instagram.com/yourpage"/></label>
    <label className="text-xs font-bold">Logo image URL (optional)<input type="url" value={form.logo} onChange={e=>setForm({...form,logo:e.target.value})} className="mt-2 w-full rounded-lg border border-[#497596] bg-[#071a2c] p-3 text-sm" placeholder="https://..."/></label>
    <p className="text-xs leading-5 text-[#a7c9e4] sm:col-span-2">RCH reviews each partner and requires a current verified Runs host credential. Applying does not announce or guarantee a partnership. Organizations remain responsible for their own venues, prices, payments and operations.</p>
    <button disabled={busy||!user} className="min-h-12 rounded-xl bg-[#348ff5] px-6 text-sm font-black disabled:opacity-60">{user?busy?'Submitting…':'Submit for review':'Sign in before applying'}</button>
    {!user&&<Link href="/auth/sign-in?next=%2Fruns%2Fpartners" className="self-center text-xs text-[#9dd5ff]">Sign in →</Link>}
   </form>}
   {!!myHqs.length&&<section className="mt-9">
    <h2 className="text-xl font-black uppercase">Your organization workspaces</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{myHqs.map(p=><Link key={p.id} href={p.status==='approved'?'/runs/partners/'+p.slug+'/hq':'/runs/partners'} className="flex items-center justify-between rounded-2xl border border-[#3b6889] bg-[#0b2840] p-5">
     <span><strong className="block">{p.name}</strong><small className="mt-1 block text-[#b4d0e5]">{p.city} · {p.status==='approved'?'Open HQ':p.status==='pending'?'Awaiting RCH review':p.status}</small></span>
     {p.status==='approved'&&<FaArrowRight className="text-[#8dccff]"/>}
    </Link>)}</div>
   </section>}
   <section className="mt-10">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-[#78bff5]">Discover organizers</p><h2 className="mt-1 text-2xl font-black uppercase">Approved Runs partners</h2></div><span className="rounded-full border border-[#356285] px-4 py-2 text-xs text-[#bfdbef]">{partners.length} live HQs</span></div>
    {loading?<p className="mt-6 text-sm text-[#b8d1e7]">Loading partner network…</p>:!partners.length?<div className="mt-5 rounded-2xl border border-dashed border-[#3a6081] bg-[#0b2236] p-8 text-center"><FaUsers className="mx-auto text-3xl text-[#69b9f5]"/><h3 className="mt-3 text-xl font-black">The partner network is opening</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#aac6dc]">Verified community organizers will appear here after RCH approves their partnership. No organizations are being represented as confirmed partners before that review.</p></div>:
     <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{partners.map(p=><Link href={'/runs/partners/'+p.slug} key={p.id} className="group overflow-hidden rounded-2xl border border-[#2e5776] bg-[#0c263f] hover:border-[#6eb7e9]">
      <div style={{background:'linear-gradient(130deg,'+p.brand_color+'35,#081e32)'}} className="flex h-28 items-center justify-center border-b border-[#2e5776]">{p.logo_url?<img src={p.logo_url} alt={p.name+' logo'} loading="lazy" referrerPolicy="no-referrer" className="h-20 w-20 rounded-xl object-contain"/>:<FaBasketball className="text-5xl text-white/70"/>}</div>
      <div className="p-5"><p className="flex items-center gap-1 text-[11px] font-black uppercase text-[#7ce7c1]"><FaShieldHalved/> RCH approved organizer</p><h3 className="mt-2 text-xl font-black">{p.name}</h3><p className="mt-2 flex items-center gap-1 text-xs text-[#abd2e9]"><FaLocationDot/>{p.city}, Virginia</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-[#b4cada]">{p.description||'Basketball runs and organized competitive sessions.'}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-[#8fcfff]">Explore Runs <FaArrowRight/></span></div>
     </Link>)}</div>}
   </section>
   <div className="mt-9 rounded-2xl border border-[#345c7c] bg-[#092039] p-5 text-xs leading-6 text-[#b9cfe1]"><FaCircleCheck className="mr-2 inline text-[#68d6a7]"/>One player account connects to RCH verified match history, courts, crew standings, REP and mastery badges. Partner-session fees are organizer-set and paid outside RCH; no payments are processed through this dashboard.</div>
  </div>
 </main>;
}
