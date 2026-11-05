'use client';

import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaBasketball,FaCalendarDays,FaCrown,FaInstagram,FaLocationDot,FaPlay,FaShieldHalved,FaUsers} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type Partner={id:string;slug:string;owner_id:string;name:string;city:string;description:string;instagram_url:string|null;logo_url:string|null;brand_color:string;status:string;reward_multiplier:number};
type Session={run_id:string;experience:'park'|'rec';price_cents:number;reward_multiplier:number};
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
    .select('id,slug,owner_id,name,city,description,instagram_url,logo_url,brand_color,status,reward_multiplier')
    .eq('slug',slug).maybeSingle();
   if(!active)return;
   if(failure||!data){setError('This Runs organization is not available.');setLoading(false);return;}
   const p=data as Partner;
   setPartner(p);
   if(user?.id){
    if(p.owner_id===user.id)setManaged(true);
    else{const {data:member}=await db.from('rch_runs_partner_members').select('role').eq('partner_id',p.id).eq('profile_id',user.id).maybeSingle();if(active)setManaged(Boolean(member));}
   }
   const {data:links}=await db.from('rch_runs_partner_sessions').select('run_id,experience,price_cents,reward_multiplier').eq('partner_id',p.id).limit(120);
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
 const isSyb=partner.slug==='syb-hoop-richmond';
 return <main className={'min-h-screen px-4 pb-28 pt-7 text-white sm:px-8 '+(isSyb?'bg-[#070708]':'bg-[#071829]')}>
  <div className="mx-auto max-w-6xl">
   <Link href="/runs/partners" className="text-xs font-bold text-[#9ed6ff]">← Runs Partner Network</Link>
   <header className={'mt-5 overflow-hidden rounded-3xl border '+(isSyb?'border-[#651923] bg-[#100d0e] shadow-[0_20px_80px_rgba(245,31,49,.12)]':'border-[#3c678b] bg-[#09243c]')}>
    <div className="h-28 sm:h-40" style={{background:isSyb?'radial-gradient(circle at 75% 30%,#f51f31 0%,#5b111a 26%,#090809 76%)':'radial-gradient(circle at 70% 30%,'+partner.brand_color+',#08192e 78%)'}}/>
    <div className="px-5 pb-7 sm:px-8">
     <div className="-mt-12 flex flex-wrap items-end gap-4"><div className={'grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border-4 sm:h-32 sm:w-32 '+(isSyb?'border-[#651923] bg-[#090809]':'border-[#09243c] bg-[#143452]')}>{partner.logo_url?<img src={partner.logo_url} alt={partner.name+' logo'} referrerPolicy="no-referrer" className="h-full w-full object-contain"/>:isSyb?<div className="flex h-full w-full flex-col items-center justify-center bg-[#080708] text-[#f51f31]"><FaCrown className="text-xl"/><span className="text-3xl font-black italic tracking-[-.08em]">SYB</span><small className="text-[8px] font-black uppercase tracking-[.18em] text-white">Support Your Brothers</small></div>:<FaBasketball className="text-5xl text-[#b7dcfc]"/>}</div><div className="pb-1"><p className="flex items-center gap-1 text-xs font-black uppercase text-[#80eac2]"><FaShieldHalved/> {partner.status==='approved'?'RCH verified Runs partner':'Awaiting verification'}</p>{isSyb&&<p className="mt-3 text-[10px] font-black uppercase tracking-[.22em] text-[#ff6674]">RVA’S 1V1 STAGE · SYB PRESENTS</p>}<h1 className="mt-1 text-3xl font-black uppercase sm:text-5xl" style={isSyb?{color:'#fff',textShadow:'0 0 24px rgba(245,31,49,.45)'}:undefined}>{partner.name}</h1><p className="mt-2 flex items-center gap-1 text-xs text-[#a5cce8]"><FaLocationDot/>{partner.city}, Virginia</p></div></div>
     <p className="mt-5 max-w-3xl text-sm leading-7 text-[#c4d6e7]">{partner.description||'Community basketball runs, competitive play, and organized sessions.'}</p>
     {partner.reward_multiplier===2&&<p className="mt-4 inline-flex rounded-full border border-[#edca71]/50 bg-[#392d13] px-3 py-2 text-[10px] font-black uppercase text-[#ffe5a2]">2× event XP / REP · free RCH profile required</p>}
     <div className="mt-5 flex flex-wrap gap-3">{partner.instagram_url&&<a href={partner.instagram_url} target="_blank" rel="noopener noreferrer" className={'inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-xs font-black '+(isSyb?'border-[#f51f31]/70 text-white hover:bg-[#f51f31]/10':'border-[#4f85a5] text-[#cceeff]')}><FaInstagram/> Instagram ↗</a>}{managed&&<Link href={'/runs/partners/'+partner.slug+'/hq'} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#378cee] px-4 text-xs font-black">Open Partner HQ <FaArrowRight/></Link>}</div>
    </div>
   </header>
   {isSyb&&<section className="mt-7 overflow-hidden rounded-3xl border border-[#651923] bg-[#100d0e]">
    <div className="grid lg:grid-cols-[.85fr_1.15fr]">
     <div className="flex flex-col justify-center p-6 sm:p-8"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-[#ff6674]"><FaCrown/> SYBHOOPS · RVA 1V1</p><h2 className="mt-3 text-3xl font-black uppercase leading-none sm:text-4xl">Every matchup<br/><span className="text-[#f51f31]">has a story.</span></h2><p className="mt-4 max-w-md text-sm leading-6 text-[#d3c8ca]">The talk. The records. The moment the ball goes up. Watch SYB’s featured matchup, then follow the page for the next drop.</p><p className="mt-4 flex items-center gap-2 text-xs font-black uppercase text-white"><FaPlay className="text-[#f51f31]"/> CARI VS WICK</p><a href="https://www.youtube.com/@SUPPORTYOURBROTHERS" target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-[#f51f31] px-4 py-3 text-xs font-black uppercase text-white hover:bg-[#d91426]">Watch SYBHOOPS <FaArrowRight/></a></div>
     <div className="aspect-video bg-black"><iframe className="h-full w-full" src="https://www.youtube-nocookie.com/embed/ir8I6M2MXqk?rel=0" title="SYBHOOPS — CARI VS WICK" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/></div>
    </div>
   </section>}
   <section className="mt-8">
    <p className={'text-xs font-black uppercase tracking-widest '+(isSyb?'text-[#ff6674]':'text-[#79bdec]')}>{isSyb?'SYB PRESENTS · COMPETITIVE RUNS':'The REC · Organized games'}</p>
    <h2 className="mt-2 text-2xl font-black uppercase">{isSyb?'The next matchup':'Upcoming sessions'}</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#acc8da]">{isSyb?'RVA 1v1 matchups, player records and event drops from SYB. Join through your free RCH profile to check in, earn eligible 2× event rewards and share Run Tape highlights.':'Real-world basketball. Create a free RCH player profile to join, record your games, earn eligible rewards and share Run Tape highlights. Results and competitive rewards still follow RCH confirmation rules.'}</p>
    {!upcoming.length?<div className={'mt-5 rounded-2xl border border-dashed p-7 text-sm '+(isSyb?'border-[#651923] bg-[#100d0e] text-[#e1c9cc]':'border-[#3a6686] bg-[#0b263e] text-[#b2ccdf]')}>{isSyb?'No sessions have been published in this Runs HQ yet. Follow @sybhoop for current matchups while SYB adds its schedule here.':'No upcoming sessions published by this organizer yet. Follow their page and check back for the next drop.'}</div>:<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map(s=><Link key={s.run_id} href={'/runs/'+s.run_id} className={'rounded-2xl border p-5 '+(isSyb?'border-[#4e171d] bg-[#110f10] hover:border-[#f51f31]':'border-[#365d7c] bg-[#0c2740] hover:border-[#80c3f7]')}>
     <div className="flex items-center justify-between gap-2"><span className={'rounded-full px-3 py-1 text-[10px] font-black uppercase '+(isSyb?'bg-[#f51f31] text-white':'bg-[#195f99]')}>{s.experience==='rec'?'THE REC · Organized':'THE PARK · Pickup'}</span><span className="text-xs font-black text-[#97d2fa]">{s.run.game_format}</span></div>
     <h3 className="mt-4 text-xl font-black">{s.run.title}</h3>
     {s.reward_multiplier===2&&<p className="mt-2 inline-flex rounded-full border border-[#edca71]/50 bg-[#392d13] px-3 py-1 text-[10px] font-black uppercase text-[#ffe5a2]">2× event XP / REP</p>}
     <p className="mt-3 flex items-center gap-2 text-xs text-[#c0d9e9]"><FaCalendarDays/>{new Date(s.run.starts_at).toLocaleString('en-US',{month:'short',day:'numeric',weekday:'short',hour:'numeric',minute:'2-digit'})}</p>
     <p className="mt-2 flex items-start gap-2 text-xs text-[#bbd2e1]"><FaLocationDot className="shrink-0"/>{s.run.location}</p>
     <div className="mt-4 flex items-center justify-between border-t border-[#365777] pt-4 text-sm"><span className="font-black">{s.price_cents?'$'+(s.price_cents/100).toFixed(2):'Free'} <small className="block font-normal text-[#9fbacc]">{s.price_cents?'Paid to organizer':'No advertised fee'}</small></span><span className={'inline-flex items-center gap-1 font-black '+(isSyb?'text-[#ff6674]':'text-[#8ed2ff]')}>View Run <FaArrowRight/></span></div>
    </Link>)}</div>}
   </section>
   {!!recent.length&&<section className="mt-10"><h2 className="text-xl font-black uppercase">Results & Run Tape</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#acc8da]">Open a past event to view its recorded scores and player-posted highlights.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{recent.map(s=><Link key={s.run_id} href={'/runs/'+s.run_id} className="flex items-center justify-between rounded-xl border border-[#2f5878] bg-[#0b243c] p-4 text-sm"><span><strong className="block">{s.run.title}</strong><small className="text-[#a6c9e4]">{new Date(s.run.starts_at).toLocaleDateString()} · Results & highlights</small></span><FaArrowRight className="text-[#95d0fa]"/></Link>)}</div></section>}
   <div className="mt-9 flex items-start gap-3 rounded-2xl border border-[#365d7d] p-5 text-xs leading-6 text-[#aac8dd]"><FaUsers className="mt-1 shrink-0 text-[#8acafa]"/><span>Partner organizers control their own schedules, facilities and event fees. RCH does not certify game statistics simply because a session appears here; competitive badges and rankings still require independently verified results.</span></div>
  </div>
 </main>;
}
