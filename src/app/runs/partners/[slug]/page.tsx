'use client';

import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaBasketball,FaCalendarDays,FaInstagram,FaLocationDot,FaShieldHalved,FaUsers} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type Partner={id:string;slug:string;owner_id:string;name:string;city:string;description:string;instagram_url:string|null;logo_url:string|null;brand_color:string;status:string};
type Session={run_id:string;experience:'park'|'rec';price_cents:number};
type Run={id:string;title:string;description:string|null;location:string;starts_at:string;status:string;max_players:number;game_format:string};
export default function PartnerRunsPublicPage(){
 const {slug}=useParams<{slug:string}>();
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [partner,setPartner]=useState<Partner|null>(null);
 const [sessions,setSessions]=useState<Array<Session&{run:Run}>>([]);
 const [managed,setManaged]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!db||!slug){setLoading(false);return;}
  let active=true;
  void (async()=>{
   const {data,error:failure}=await db.from('rch_runs_partners')
    .select('id,slug,owner_id,name,city,description,instagram_url,logo_url,brand_color,status')
    .eq('slug',slug).maybeSingle();
   if(!active)return;
   if(failure||!data){setError('This Runs organization is not available.');setLoading(false);return;}
   const p=data as Partner;
   setPartner(p);
   if(user?.id){
    if(p.owner_id===user.id)setManaged(true);
    else{const {data:member}=await db.from('rch_runs_partner_members').select('role').eq('partner_id',p.id).eq('profile_id',user.id).maybeSingle();if(active)setManaged(Boolean(member));}
   }
   const {data:links}=await db.from('rch_runs_partner_sessions').select('run_id,experience,price_cents').eq('partner_id',p.id).limit(120);
   const records=(links??[]) as Session[];
   if(records.length){
    const {data:runs}=await db.from('runs').select('id,title,description,location,starts_at,status,max_players,game_format').in('id',records.map(s=>s.run_id)).neq('status','cancelled');
    const found=new Map(((runs??[]) as Run[]).map(r=>[r.id,r]));
    if(active)setSessions(records.flatMap(s=>found.get(s.run_id)?[{...s,run:found.get(s.run_id)!}]:[]).sort((a,b)=>a.run.starts_at.localeCompare(b.run.starts_at)));
   }
   if(active)setLoading(false);
  })();
  return()=>{active=false;};
 },[db,slug,user?.id]);
 if(loading)return <main className="min-h-screen bg-[#071829] p-8 text-[#b9d3e8]">Loading organization court…</main>;
 if(!partner)return <main className="min-h-screen bg-[#071829] p-8 text-white"><p role="alert">{error||'Organization not found.'}</p><Link href="/runs/partners" className="mt-4 inline-block text-[#9bd4ff]">Back to partners</Link></main>;
 const upcoming=sessions.filter(s=>new Date(s.run.starts_at).getTime()>=Date.now()-2*3600000&&s.run.status!=='completed');
 const recent=sessions.filter(s=>!upcoming.includes(s)).slice(-6).reverse();
 return <main className="min-h-screen bg-[#071829] px-4 pb-28 pt-7 text-white sm:px-8">
  <div className="mx-auto max-w-6xl">
   <Link href="/runs/partners" className="text-xs font-bold text-[#9ed6ff]">← Runs Partner Network</Link>
   <header className="mt-5 overflow-hidden rounded-3xl border border-[#3c678b] bg-[#09243c]">
    <div className="h-28 sm:h-40" style={{background:'radial-gradient(circle at 70% 30%,'+partner.brand_color+',#08192e 78%)'}}/>
    <div className="px-5 pb-7 sm:px-8">
     <div className="-mt-12 flex flex-wrap items-end gap-4"><div className="grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border-4 border-[#09243c] bg-[#143452] sm:h-32 sm:w-32">{partner.logo_url?<img src={partner.logo_url} alt={partner.name+' logo'} referrerPolicy="no-referrer" className="h-full w-full object-contain"/>:<FaBasketball className="text-5xl text-[#b7dcfc]"/>}</div><div className="pb-1"><p className="flex items-center gap-1 text-xs font-black uppercase text-[#80eac2]"><FaShieldHalved/> {partner.status==='approved'?'RCH approved Runs partner':'Awaiting verification'}</p><h1 className="mt-1 text-3xl font-black uppercase sm:text-5xl">{partner.name}</h1><p className="mt-2 flex items-center gap-1 text-xs text-[#a5cce8]"><FaLocationDot/>{partner.city}, Virginia</p></div></div>
     <p className="mt-5 max-w-3xl text-sm leading-7 text-[#c4d6e7]">{partner.description||'Community basketball runs, competitive play, and organized sessions.'}</p>
     <div className="mt-5 flex flex-wrap gap-3">{partner.instagram_url&&<a href={partner.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#4f85a5] px-4 text-xs font-black text-[#cceeff]"><FaInstagram/> Instagram ↗</a>}{managed&&<Link href={'/runs/partners/'+partner.slug+'/hq'} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#378cee] px-4 text-xs font-black">Open Partner HQ <FaArrowRight/></Link>}</div>
    </div>
   </header>
   <section className="mt-8">
    <p className="text-xs font-black uppercase tracking-widest text-[#79bdec]">The REC · Organized games</p>
    <h2 className="mt-2 text-2xl font-black uppercase">Upcoming sessions</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#acc8da]">Real-world basketball. One RCH player profile. Join the Run to access registration, check-in, the live Next Up line, verified results and earning opportunities.</p>
    {!upcoming.length?<div className="mt-5 rounded-2xl border border-dashed border-[#3a6686] bg-[#0b263e] p-7 text-sm text-[#b2ccdf]">No upcoming sessions published by this organizer yet. Follow their page and check back for the next drop.</div>:<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map(s=><Link key={s.run_id} href={'/runs/'+s.run_id} className="rounded-2xl border border-[#365d7c] bg-[#0c2740] p-5 hover:border-[#80c3f7]">
     <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-[#195f99] px-3 py-1 text-[10px] font-black uppercase">{s.experience==='rec'?'THE REC · Organized':'THE PARK · Pickup'}</span><span className="text-xs font-black text-[#97d2fa]">{s.run.game_format}</span></div>
     <h3 className="mt-4 text-xl font-black">{s.run.title}</h3>
     <p className="mt-3 flex items-center gap-2 text-xs text-[#c0d9e9]"><FaCalendarDays/>{new Date(s.run.starts_at).toLocaleString('en-US',{month:'short',day:'numeric',weekday:'short',hour:'numeric',minute:'2-digit'})}</p>
     <p className="mt-2 flex items-start gap-2 text-xs text-[#bbd2e1]"><FaLocationDot className="shrink-0"/>{s.run.location}</p>
     <div className="mt-4 flex items-center justify-between border-t border-[#365777] pt-4 text-sm"><span className="font-black">{s.price_cents?'$'+(s.price_cents/100).toFixed(2):'Free'} <small className="block font-normal text-[#9fbacc]">{s.price_cents?'Paid to organizer':'No advertised fee'}</small></span><span className="inline-flex items-center gap-1 font-black text-[#8ed2ff]">View Run <FaArrowRight/></span></div>
    </Link>)}</div>}
   </section>
   {!!recent.length&&<section className="mt-10"><h2 className="text-xl font-black uppercase">Previous sessions</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{recent.map(s=><Link key={s.run_id} href={'/runs/'+s.run_id} className="flex items-center justify-between rounded-xl border border-[#2f5878] bg-[#0b243c] p-4 text-sm"><span><strong className="block">{s.run.title}</strong><small className="text-[#a6c9e4]">{new Date(s.run.starts_at).toLocaleDateString()}</small></span><FaArrowRight className="text-[#95d0fa]"/></Link>)}</div></section>}
   <div className="mt-9 flex items-start gap-3 rounded-2xl border border-[#365d7d] p-5 text-xs leading-6 text-[#aac8dd]"><FaUsers className="mt-1 shrink-0 text-[#8acafa]"/><span>Partner organizers control their own schedules, facilities and event fees. RCH does not certify game statistics simply because a session appears here; competitive badges and rankings still require independently verified results.</span></div>
  </div>
 </main>;
}
