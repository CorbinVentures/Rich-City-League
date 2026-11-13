'use client';

import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import type {CSSProperties,ReactNode} from 'react';
import {FaArrowRight,FaBasketball,FaCalendarDays,FaCrown,FaInstagram,FaLocationDot,FaPlay,FaShieldHalved,FaUsers,FaTrophy,FaBolt,FaChartLine} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';
import {SybBrandMark} from '@/components/runs/SybBrandMark';

type PageSettings={eyebrow:string;headline:string;subheadline:string;hero_image_url:string;featured_video_url:string;featured_video_label:string;cta_label:string;show_schedule:boolean;show_leaderboard:boolean;show_video:boolean;show_results:boolean;callout_title:string;callout_body:string};
type Partner={id:string;slug:string;owner_id:string;name:string;city:string;description:string;instagram_url:string|null;logo_url:string|null;brand_color:string;status:string;reward_multiplier:number;page_settings:PageSettings};
type Session={run_id:string;experience:'park'|'rec';price_cents:number;reward_multiplier:number};
type Run={id:string;title:string;description:string|null;location:string;starts_at:string;status:string;max_players:number;game_format:string};
type LeaderboardEntry={rank:number;profile_id:string;player_name:string;username:string|null;avatar_url:string|null;games:number;wins:number;losses:number;points_for:number;points_against:number;win_pct:number;latest_match_at:string|null};
type PublicStats={events:number;upcoming_events:number;verified_matchups:number;ranked_players:number;leaderboard:LeaderboardEntry[]};
const defaultSettings:PageSettings={eyebrow:'OFFICIAL RUNS PARTNER · RVA 1V1 CIRCUIT',headline:'Every matchup has a story.',subheadline:'The talk. The records. The moment the ball goes up.',hero_image_url:'',featured_video_url:'https://www.youtube.com/watch?v=ir8I6M2MXqk',featured_video_label:'CARI VS WICK',cta_label:'Explore the circuit',show_schedule:true,show_leaderboard:true,show_video:true,show_results:true,callout_title:'ONE COURT. EVERY RECORD.',callout_body:'Follow the official SYB 1v1 circuit, see verified records, and bring your next matchup to the floor.'};
const emptyStats:PublicStats={events:0,upcoming_events:0,verified_matchups:0,ranked_players:0,leaderboard:[]};
function youtubeEmbedUrl(value:string){
 try{
  const url=new URL(value);
  if(url.protocol!=='https:')return null;
  const host=url.hostname.toLowerCase().replace(/^www\./,'');
  let id='';
  if(host==='youtu.be')id=url.pathname.split('/').filter(Boolean)[0]||'';
  else if(host==='youtube.com'||host==='m.youtube.com'||host==='youtube-nocookie.com'){
   id=url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1]||'';
  }else return null;
  return /^[A-Za-z0-9_-]{6,20}$/.test(id)?'https://www.youtube-nocookie.com/embed/'+id+'?rel=0':null;
 }catch{return null;}
}
function formatPct(value:number){return Number.isFinite(value)?Math.round(value*10)/10:0;}

export default function PartnerRunsPublicPage(){
 const {slug}=useParams<{slug:string}>();
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [partner,setPartner]=useState<Partner|null>(null);
 const [sessions,setSessions]=useState<Array<Session&{run:Run}>>([]);
 const [managed,setManaged]=useState(false);
 const [stats,setStats]=useState<PublicStats|null>(null);
 const [statsError,setStatsError]=useState('');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!db||!slug){setLoading(false);return;}
  let active=true;
  void (async()=>{
   const {data,error:failure}=await db.from('rch_runs_partners')
    .select('id,slug,owner_id,name,city,description,instagram_url,logo_url,brand_color,status,reward_multiplier,page_settings')
    .eq('slug',slug).maybeSingle();
   if(!active)return;
   if(failure||!data){setError('This Runs organization is not available.');setLoading(false);return;}
   const p=data as Partner;
   setPartner(p);
   if(user?.id){
    if(p.owner_id===user.id)setManaged(true);
    else{const {data:member}=await db.from('rch_runs_partner_members').select('role').eq('partner_id',p.id).eq('profile_id',user.id).maybeSingle();if(active)setManaged(Boolean(member));}
   }
   const [linksResult,statsResult]=await Promise.all([
    db.from('rch_runs_partner_sessions').select('run_id,experience,price_cents,reward_multiplier').eq('partner_id',p.id).limit(120),
    db.rpc('rch_runs_partner_public_stats',{p_partner:p.id})
   ]);
   if(!active)return;
   if(statsResult.error){setStatsError('Official stats are temporarily unavailable. Refresh to try again.');setStats(null);}
   else{setStats((statsResult.data||emptyStats) as PublicStats);setStatsError('');}
   const records=(linksResult.data??[]) as Session[];
   if(records.length){
    const {data:runs}=await db.from('runs').select('id,title,description,location,starts_at,status,max_players,game_format').in('id',records.map(s=>s.run_id)).neq('status','cancelled');
    const found=new Map(((runs??[]) as Run[]).map(r=>[r.id,r]));
    if(active)setSessions(records.flatMap(s=>found.get(s.run_id)?[{...s,run:found.get(s.run_id)!}]:[]).sort((a,b)=>a.run.starts_at.localeCompare(b.run.starts_at)));
   }else if(active)setSessions([]);
   if(active)setLoading(false);
  })();
  return()=>{active=false;};
 },[db,slug,user?.id]);
 if(loading)return <main className="min-h-screen bg-[#071829] p-8 text-[#b9d3e8]">Loading organization court…</main>;
 if(!partner)return <main className="min-h-screen bg-[#071829] p-8 text-white"><p role="alert">{error||'Organization not found.'}</p><Link href="/runs/partners" className="mt-4 inline-block text-[#9bd4ff]">Back to partners</Link></main>;
 const upcoming=sessions.filter(s=>new Date(s.run.starts_at).getTime()>=Date.now()-2*3600000&&s.run.status!=='completed');
 const recent=sessions.filter(s=>!upcoming.includes(s)).slice(-6).reverse();
 const isSyb=partner.slug==='syb-hoop-richmond';
 const settings={...defaultSettings,...(isSyb?partner.page_settings||{}:{...partner.page_settings,show_leaderboard:false,show_video:false})} as PageSettings;
 const accent=partner.brand_color||'#f51f31';
 const brandStyle={'--partner-accent':accent} as CSSProperties;
 const videoEmbed=settings.show_video?youtubeEmbedUrl(settings.featured_video_url):null;
 const publicStats=stats||emptyStats;
 return <main style={brandStyle} className={'min-h-screen px-4 pb-28 pt-7 text-white sm:px-8 '+(isSyb?'bg-[#070708]':'bg-[#071829]')}>
  <div className="mx-auto max-w-6xl">
   <Link href="/runs/partners" className="text-xs font-bold text-[#9ed6ff]">← Runs Partner Network</Link>
   <header className={'mt-5 overflow-hidden rounded-3xl border '+(isSyb?'border-[#651923] bg-[#100d0e] shadow-[0_20px_80px_rgba(245,31,49,.12)]':'border-[#3c678b] bg-[#09243c]')}>
    <div className="relative h-36 overflow-hidden sm:h-52" style={{backgroundImage:'radial-gradient(circle at 75% 30%,'+accent+' 0%,#5b111a 26%,#090809 76%)',backgroundColor:'#090809'}}>
     {settings.hero_image_url&&<><img src={settings.hero_image_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-50"/><div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/35 to-black/60"/></>}
     <div className="absolute bottom-4 left-5 flex items-center gap-2 sm:left-8"><span className="rounded-full border border-white/30 bg-black/50 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-white">{isSyb?settings.eyebrow:'RCH RUNS PARTNER'}</span>{isSyb&&<span className="rounded-full bg-[var(--partner-accent)] px-3 py-1 text-[10px] font-black uppercase text-white">{partner.reward_multiplier}× event XP</span>}</div>
    </div>
    <div className="px-5 pb-7 sm:px-8">
     <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap items-end gap-4">
       <div className={'grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border-4 sm:h-32 sm:w-32 '+(isSyb?'border-[#651923] bg-[#090809]':'border-[#09243c] bg-[#143452]')}>{partner.logo_url?<img src={partner.logo_url} alt={partner.name+' logo'} referrerPolicy="no-referrer" className="h-full w-full object-contain"/>:isSyb?<SybBrandMark className="h-full w-full"/>:<FaBasketball className="text-5xl text-[#b7dcfc]"/>}</div>
       <div className="pb-1"><p className={'flex items-center gap-1 text-xs font-black uppercase '+(isSyb?'text-[var(--partner-accent)]':'text-[#80eac2]')}><FaShieldHalved/> {partner.status==='approved'?(isSyb?'Official RCH Runs 1v1 partner':'RCH verified Runs partner'):'Awaiting verification'}</p><h1 className="mt-1 text-3xl font-black uppercase sm:text-5xl" style={isSyb?{color:'#fff',textShadow:'0 0 24px '+accent+'88'}:undefined}>{partner.name}</h1>{isSyb&&<p className="mt-2 max-w-2xl text-lg font-black leading-tight text-white sm:text-xl">{settings.headline}</p>}<p className="mt-2 flex items-center gap-1 text-xs text-[#a5cce8]"><FaLocationDot/>{partner.city}, Virginia</p></div>
      </div>
      <Link href="#partner-schedule" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--partner-accent)] px-4 py-3 text-xs font-black uppercase text-white">{settings.cta_label||'Explore the circuit'} <FaArrowRight/></Link>
     </div>
     <p className="mt-5 max-w-3xl text-sm leading-7 text-[#c4d6e7]">{partner.description||'Community basketball runs, competitive play, and organized sessions.'}</p>
     {isSyb&&<p className="mt-3 max-w-3xl text-sm leading-6 text-[#e0d1d3]">{settings.subheadline}</p>}
     {partner.reward_multiplier>1&&<p className="mt-4 inline-flex rounded-full border border-[#edca71]/50 bg-[#392d13] px-3 py-2 text-[10px] font-black uppercase text-[#ffe5a2]">{partner.reward_multiplier}× XP / REP on partner event rewards · free RCH profile required</p>}
     <div className="mt-5 flex flex-wrap gap-3">{partner.instagram_url&&<a href={partner.instagram_url} target="_blank" rel="noopener noreferrer" className={'inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-xs font-black '+(isSyb?'border-[#f51f31]/70 text-white hover:bg-[#f51f31]/10':'border-[#4f85a5] text-[#cceeff]')}><FaInstagram/> Instagram ↗</a>}{managed&&<Link href={'/runs/partners/'+partner.slug+'/hq'} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-black">Open Partner HQ <FaArrowRight/></Link>}</div>
    </div>
   </header>

   {isSyb&&settings.show_video&&videoEmbed&&<section className="mt-7 overflow-hidden rounded-3xl border border-[#651923] bg-[#100d0e]">
    <div className="grid lg:grid-cols-[.85fr_1.15fr]">
     <div className="flex flex-col justify-center p-6 sm:p-8"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-[var(--partner-accent)]"><FaCrown/> {settings.eyebrow||'SYBHOOPS · RVA 1V1'}</p><h2 className="mt-3 text-3xl font-black uppercase leading-none sm:text-4xl">Featured matchup</h2><p className="mt-4 max-w-md text-sm leading-6 text-[#d3c8ca]">{settings.subheadline}</p><p className="mt-4 flex items-center gap-2 text-xs font-black uppercase text-white"><FaPlay className="text-[var(--partner-accent)]"/> {settings.featured_video_label||'SYB FEATURE'}</p><a href="https://www.youtube.com/@SUPPORTYOURBROTHERS" target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--partner-accent)] px-4 py-3 text-xs font-black uppercase text-white hover:brightness-110">Watch SYBHOOPS <FaArrowRight/></a></div>
     <div className="aspect-video bg-black"><iframe className="h-full w-full" src={videoEmbed} title={'SYBHOOPS — '+settings.featured_video_label} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/></div>
    </div>
   </section>}

   {isSyb&&settings.show_leaderboard&&<section className="mt-8 overflow-hidden rounded-3xl border border-[#4d1a20] bg-[linear-gradient(145deg,#160d0f,#090a0c_68%)]">
    <div className="border-b border-white/10 p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-[var(--partner-accent)]"><FaTrophy/> SYB OFFICIAL 1V1 RECORDS</p><h2 className="mt-2 text-2xl font-black uppercase sm:text-3xl">The leaderboard</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#c1b3b6]">Only independently confirmed 1v1 results from official SYB events count here. The scorekeeper saves the game; RCH’s result review makes it count.</p></div><span className="rounded-full border border-white/15 px-3 py-2 text-[10px] font-black uppercase text-[#e6dadd]">ALL-TIME · VERIFIED</span></div>
     {!statsError&&<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{([['Events',publicStats.events,<FaCalendarDays key="events"/>],['Upcoming',publicStats.upcoming_events,<FaBolt key="upcoming"/>],['Verified 1v1 games',publicStats.verified_matchups,<FaShieldHalved key="verified-games"/>],['Players ranked',publicStats.ranked_players,<FaUsers key="ranked-players"/>]] as [string,number,ReactNode][]).map(([label,value,icon])=><div key={label} className="rounded-2xl border border-[#4b2429] bg-black/30 p-4"><span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#b99da2]">{icon}{label}</span><strong className="mt-2 block text-3xl font-black tabular-nums text-white">{value}</strong></div>)}</div>}
    </div>
    {statsError?<p role="status" className="m-5 rounded-xl border border-amber-300/25 bg-amber-300/5 p-4 text-sm text-amber-100">{statsError}</p>:publicStats.leaderboard.length?<div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-white/[.03] text-[10px] uppercase tracking-wider text-[#bca9ae]"><tr><th className="px-5 py-3">Rank / player</th><th className="px-3 py-3">Record</th><th className="px-3 py-3">Win %</th><th className="px-3 py-3">Points</th><th className="px-5 py-3 text-right">Last result</th></tr></thead><tbody>{publicStats.leaderboard.map((player,index)=><tr key={player.profile_id} className="border-t border-white/[.07]"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className={'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black '+(index===0?'bg-[var(--partner-accent)] text-white':'bg-white/10 text-[#eadfe1]')}>{player.rank}</span>{player.avatar_url?<img src={player.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/>:<span className="grid h-10 w-10 place-items-center rounded-full bg-[#211316] text-xs font-black text-[#ff8c98]">{player.player_name.slice(0,1).toUpperCase()}</span>}<span><strong className="block text-sm font-black">{player.player_name}</strong>{player.username&&<small className="text-xs text-[#b99ea4]">@{player.username}</small>}</span></div></td><td className="px-3 py-4 font-mono text-sm font-bold">{player.wins}–{player.losses}</td><td className="px-3 py-4 text-sm">{formatPct(player.win_pct)}%</td><td className="px-3 py-4 text-sm tabular-nums">{player.points_for}–{player.points_against}</td><td className="px-5 py-4 text-right text-xs text-[#bca9ae]">{player.latest_match_at?new Date(player.latest_match_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—'}</td></tr>)}</tbody></table></div>:<div className="p-7 sm:p-9"><div className="mx-auto max-w-xl text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#6d2931] bg-[#210e12] text-2xl text-[var(--partner-accent)]"><FaBasketball/></span><h3 className="mt-4 text-xl font-black uppercase">The first record is still open</h3><p className="mt-2 text-sm leading-6 text-[#c5b3b7]">SYB hasn’t posted a verified 1v1 result on Runs yet. Publish the next event, run the live board, and the leaderboard fills itself after RCH’s official score review.</p><Link href="#partner-schedule" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--partner-accent)] px-4 py-3 text-xs font-black uppercase">{settings.cta_label||'Find the next matchup'} <FaArrowRight/></Link></div></div>}
   </section>}

   {isSyb&&settings.callout_title&&settings.callout_body&&<section className="mt-7 rounded-3xl border border-[#512028] bg-[radial-gradient(circle_at_85%_25%,#351217,#110c0d_62%)] p-6 sm:p-8"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-[var(--partner-accent)]"><FaChartLine/> SYBHOOPS · OFFICIAL RUNS PARTNER</p><h2 className="mt-3 text-2xl font-black uppercase sm:text-3xl">{settings.callout_title}</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-[#d2c2c5]">{settings.callout_body}</p></section>}

   {settings.show_schedule&&<section id="partner-schedule" className="mt-8 scroll-mt-20">
    <p className={'text-xs font-black uppercase tracking-widest '+(isSyb?'text-[var(--partner-accent)]':'text-[#79bdec]')}>{isSyb?'SYB PRESENTS · OFFICIAL 1V1 RUNS':'The REC · Organized games'}</p>
    <h2 className="mt-2 text-2xl font-black uppercase">{isSyb?'The next matchup':'Upcoming sessions'}</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#acc8da]">{isSyb?'Find the next SYB 1v1 event, join through your free RCH profile, and track every confirmed result on this page. Every SYB event awards triple eligible XP/REP.':'Real-world basketball. Create a free RCH player profile to join, record your games, earn eligible rewards and share Run Tape highlights. Results and competitive rewards still follow RCH confirmation rules.'}</p>
    {!upcoming.length?<div className={'mt-5 rounded-2xl border border-dashed p-7 text-sm '+(isSyb?'border-[#651923] bg-[#100d0e] text-[#e1c9cc]':'border-[#3a6686] bg-[#0b263e] text-[#b2ccdf]')}>{isSyb?'No sessions have been published in this Runs HQ yet. Follow @sybhoop for current matchups while SYB adds its next event here.':'No upcoming sessions published by this organizer yet. Follow their page and check back for the next drop.'}</div>:<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map(s=><Link key={s.run_id} href={'/runs/'+s.run_id} className={'rounded-2xl border p-5 transition '+(isSyb?'border-[#4e171d] bg-[#110f10] hover:border-[var(--partner-accent)]':'border-[#365d7c] bg-[#0c2740] hover:border-[#80c3f7]')}>
     <div className="flex items-center justify-between gap-2"><span className={'rounded-full px-3 py-1 text-[10px] font-black uppercase '+(isSyb?'bg-[var(--partner-accent)] text-white':'bg-[#195f99]')}>{s.experience==='rec'?'THE REC · Organized':'THE PARK · Pickup'}</span><span className="text-xs font-black text-[#97d2fa]">{s.run.game_format}</span></div>
     <h3 className="mt-4 text-xl font-black">{s.run.title}</h3>{isSyb&&s.run.description&&<p className="mt-2 line-clamp-2 text-xs leading-5 text-[#c5b4b7]">{s.run.description}</p>}
     {s.reward_multiplier>1&&<p className="mt-2 inline-flex rounded-full border border-[#edca71]/50 bg-[#392d13] px-3 py-1 text-[10px] font-black uppercase text-[#ffe5a2]">{s.reward_multiplier}× event XP / REP</p>}
     <p className="mt-3 flex items-center gap-2 text-xs text-[#c0d9e9]"><FaCalendarDays/>{new Date(s.run.starts_at).toLocaleString('en-US',{month:'short',day:'numeric',weekday:'short',hour:'numeric',minute:'2-digit'})}</p>
     <p className="mt-2 flex items-start gap-2 text-xs text-[#bbd2e1]"><FaLocationDot className="shrink-0"/>{s.run.location}</p>
     <div className="mt-4 flex items-center justify-between border-t border-[#365777] pt-4 text-sm"><span className="font-black">{s.price_cents?'$'+(s.price_cents/100).toFixed(2):'Free'} <small className="block font-normal text-[#9fbacc]">{s.price_cents?'Paid to organizer':'No advertised fee'}</small></span><span className={'inline-flex items-center gap-1 font-black '+(isSyb?'text-[var(--partner-accent)]':'text-[#8ed2ff]')}>View Run <FaArrowRight/></span></div>
    </Link>)}</div>}
   </section>}

   {settings.show_results&&!!recent.length&&<section className="mt-10"><h2 className="text-xl font-black uppercase">Results & Run Tape</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#acc8da]">Open a past event to view its recorded scores and player-posted highlights.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{recent.map(s=><Link key={s.run_id} href={'/runs/'+s.run_id} className="flex items-center justify-between rounded-xl border border-[#2f5878] bg-[#0b243c] p-4 text-sm"><span><strong className="block">{s.run.title}</strong><small className="text-[#a6c9e4]">{new Date(s.run.starts_at).toLocaleDateString()} · Results & highlights</small></span><FaArrowRight className="text-[#95d0fa]"/></Link>)}</div></section>}
   <div className="mt-9 flex items-start gap-3 rounded-2xl border border-[#365d7d] p-5 text-xs leading-6 text-[#aac8dd]"><FaUsers className="mt-1 shrink-0 text-[#8acafa]"/><span>Partner organizers control their own schedules, facilities and event fees. RCH does not certify game statistics simply because a session appears here; competitive badges and rankings still require independently verified results.</span></div>
  </div>
 </main>;
}
