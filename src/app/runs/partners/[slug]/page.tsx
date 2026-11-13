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
function isSybDesignPreview(){return typeof window!=='undefined'&&window.location.hostname.endsWith('.vercel.app');}
function sybPreviewPartner():Partner{return{id:'preview-syb',slug:'syb-hoop-richmond',owner_id:'',name:'SYB HOOPS',city:'Richmond',description:'RVA’s 1v1 basketball stage. SYB brings the matchups, the records, and the energy.',instagram_url:'https://www.instagram.com/sybhoop/',logo_url:null,brand_color:'#f51f31',status:'approved',reward_multiplier:3,page_settings:defaultSettings};}
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
 const [previewMode,setPreviewMode]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  setPreviewMode(false);
  if(!slug){setLoading(false);return;}
  if(!db){
   if(slug==='syb-hoop-richmond'&&isSybDesignPreview()){
    setPartner(sybPreviewPartner());
    setPreviewMode(true);
    setStatsError('Live SYB data is unavailable in this design preview.');
   }
   setLoading(false);return;
  }
  let active=true;
  void (async()=>{
   const {data,error:failure}=await db.from('rch_runs_partners')
    .select('id,slug,owner_id,name,city,description,instagram_url,logo_url,brand_color,status,reward_multiplier,page_settings')
    .eq('slug',slug).maybeSingle();
   if(!active)return;
   if(failure||!data){
    if(slug==='syb-hoop-richmond'&&isSybDesignPreview()){
     setPartner(sybPreviewPartner());setPreviewMode(true);setStatsError('Live SYB data is unavailable in this design preview.');setLoading(false);return;
    }
    setError('This Runs organization is not available.');setLoading(false);return;
   }
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
 const partnerSettings=partner.page_settings||{};
 const settings={...defaultSettings,...partnerSettings,...(!isSyb?{eyebrow:'RCH RUNS PARTNER',headline:partnerSettings.headline||partner.name,subheadline:partnerSettings.subheadline||partner.description||'Community basketball runs, competitive play, and organized sessions.',show_leaderboard:false,show_video:false}:{})} as PageSettings;
 const accent=partner.brand_color||'#f51f31';
 const brandStyle={'--partner-accent':accent} as CSSProperties;
 const videoEmbed=settings.show_video?youtubeEmbedUrl(settings.featured_video_url):null;
 const publicStats=stats||emptyStats;
 return <main style={brandStyle} className={'min-h-screen px-4 pb-20 pt-5 text-white sm:px-8 '+(isSyb?'bg-[#070708]':'bg-[#071829]')}>
  <div className="mx-auto max-w-7xl">
   {previewMode&&<div role="status" className="mb-4 rounded-xl border border-amber-200/25 bg-amber-100/5 px-4 py-3 text-xs font-bold leading-5 text-amber-100">Design preview · live SYB events, stats and rankings are unavailable in this deployment. No sample records are shown.</div>}
   <nav aria-label="Runs partner navigation" className="flex items-center justify-between gap-4">
    <Link href="/runs/partners" className="flex min-h-11 items-center gap-3 text-xs font-black uppercase tracking-[.15em] text-white/75 transition hover:text-white">
     <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-white/15 bg-black">{isSyb?<SybBrandMark className="h-full w-full"/>:partner.logo_url?<img src={partner.logo_url} alt="" className="h-full w-full object-contain"/>:<FaBasketball className="text-[#9bd4ff]"/>}</span>
     <span><span className="block">RCH RUNS</span><small className="mt-0.5 block text-[9px] tracking-[.2em] text-white/45">PARTNER NETWORK</small></span>
    </Link>
    <div className="flex items-center gap-2 sm:gap-4">
     <Link href="#partner-schedule" className="hidden text-xs font-bold text-white/65 hover:text-white sm:block">EVENTS</Link>
     {isSyb&&settings.show_leaderboard&&<Link href="#partner-leaderboard" className="hidden text-xs font-bold text-white/65 hover:text-white sm:block">RANKINGS</Link>}
     {isSyb&&settings.show_video&&videoEmbed&&<Link href="#syb-film" className="hidden text-xs font-bold text-white/65 hover:text-white sm:block">THE TAPE</Link>}
     {managed&&<Link href={'/runs/partners/'+partner.slug+'/hq'} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-[10px] font-black uppercase tracking-wider transition hover:border-[var(--partner-accent)] hover:bg-white/5">Customize page <FaArrowRight/></Link>}
    </div>
   </nav>

   <header className="relative mt-5 overflow-hidden rounded-[2rem] border border-[#5b2028] bg-[#100b0d] shadow-[0_28px_100px_rgba(245,31,49,.14)]">
    <div className="absolute inset-0" aria-hidden="true" style={{backgroundImage:'radial-gradient(circle at 18% 28%,'+accent+'44,transparent 34%),linear-gradient(115deg,#080708 0%,#190b0f 52%,#07090c 100%)'}}/>
    {(settings.hero_image_url||isSyb)&&<img src={settings.hero_image_url||'/images/syb-1v1-circuit-hero.webp'} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-45"/>}
    <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full border border-white/[.09] sm:right-8">
     <div className="absolute inset-10 rounded-full border border-white/[.08]"/>
     <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/[.08]"/>
     <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.1]"/>
    </div>
    <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-black/65"/>
    <div className="relative z-10 grid gap-9 px-5 py-8 sm:px-9 sm:py-10 lg:min-h-[440px] lg:grid-cols-[1.2fr_.8fr] lg:items-center lg:px-14">
     <div className="max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
       <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-white/90"><FaShieldHalved className="text-[var(--partner-accent)]"/> {settings.eyebrow||'OFFICIAL RCH RUNS 1V1 PARTNER'}</span>
       {partner.status==='approved'&&<span className="rounded-full bg-[var(--partner-accent)] px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-white">Verified partner</span>}
      </div>
      <p className="mt-7 text-[11px] font-black uppercase tracking-[.35em] text-[var(--partner-accent)]">{isSyb?'SYBHOOPS / RVA 1V1 CIRCUIT':partner.name+' / RCH RUNS PARTNER'}</p>
      <h1 className="mt-3 max-w-3xl text-5xl font-black uppercase leading-[.9] tracking-[-.055em] sm:text-6xl lg:text-7xl" style={{textShadow:'0 0 38px '+accent+'55'}}>{settings.headline}</h1>
      <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-[#e7dadd] sm:text-lg">{isSyb?settings.subheadline:partner.description||settings.subheadline}</p>
      <div className="mt-5 flex flex-wrap gap-2">
       <span className="rounded-full border border-[#f51f31]/50 bg-[#f51f31]/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white">{partner.reward_multiplier}× XP on {isSyb?'official SYB':'partner'} events</span>
       <span className="rounded-full border border-white/15 bg-black/25 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/75">Verified results only</span>
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
       <Link href="#partner-schedule" className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-[var(--partner-accent)] px-5 text-xs font-black uppercase tracking-wider text-white shadow-[0_8px_30px_rgba(245,31,49,.28)] transition hover:-translate-y-0.5 hover:brightness-110">{settings.cta_label||'Find the next matchup'} <FaArrowRight/></Link>
       {settings.show_leaderboard&&<Link href="#partner-leaderboard" className="inline-flex min-h-12 items-center gap-3 rounded-xl border border-white/20 bg-black/25 px-5 text-xs font-black uppercase tracking-wider text-white transition hover:border-white/40 hover:bg-white/5"><FaTrophy className="text-[#ff5967]"/> View the board</Link>}
      </div>
     </div>

     <div className="mx-auto w-full max-w-sm lg:ml-auto">
      <div className="rounded-[1.6rem] border border-white/15 bg-black/55 p-5 shadow-2xl backdrop-blur-md sm:p-6">
       <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-white/55"><FaCrown className="text-[var(--partner-accent)]"/> Official event card</span>
        <span className="rounded-full border border-[#ff3447]/40 bg-[#f51f31]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#ff8791]">RVA</span>
       </div>
       <div className="mt-5 flex items-end justify-between gap-3">
        <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/45">Reward multiplier</p><p className="mt-1 text-5xl font-black leading-none tracking-tight text-white">{partner.reward_multiplier}<span className="ml-1 text-2xl text-[var(--partner-accent)]">×</span></p></div>
        <div className="pb-1 text-right"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/45">Circuit</p><p className="mt-1 text-sm font-black uppercase text-white">{partner.city} · 1V1</p></div>
       </div>
       {isSyb&&settings.show_leaderboard&&<div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-white/[.04] p-3"><small className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-white/45"><FaShieldHalved/> Verified games</small><strong className="mt-2 block text-2xl font-black tabular-nums">{statsError?'—':publicStats.verified_matchups}</strong></div>
        <div className="rounded-xl border border-white/10 bg-white/[.04] p-3"><small className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-white/45"><FaUsers/> Players ranked</small><strong className="mt-2 block text-2xl font-black tabular-nums">{statsError?'—':publicStats.ranked_players}</strong></div>
       </div>}
       {isSyb&&settings.show_leaderboard&&<div className="mt-3 rounded-xl border border-[#f51f31]/25 bg-[#f51f31]/[.06] p-3.5">
        <small className="block text-[9px] font-black uppercase tracking-[.16em] text-[#ff7a86]">Top of the board</small>
        {statsError?<p className="mt-2 text-xs leading-5 text-white/70">Official stats are temporarily unavailable.</p>:publicStats.leaderboard[0]?<div className="mt-2 flex items-center justify-between gap-3"><strong className="truncate text-sm font-black">{publicStats.leaderboard[0].player_name}</strong><span className="shrink-0 font-mono text-xs font-bold text-white">{publicStats.leaderboard[0].wins}–{publicStats.leaderboard[0].losses}</span></div>:<p className="mt-2 text-xs leading-5 text-white/70">The first verified result will open the SYB record board.</p>}
       </div>}
      </div>
     </div>
    </div>
    <div className="relative z-10 grid grid-cols-3 border-t border-white/10 bg-black/30">
     <div className="px-3 py-4 text-center sm:py-5"><small className="block text-[8px] font-black uppercase tracking-[.2em] text-white/40">Official partner</small><strong className="mt-1 block text-[10px] font-black uppercase tracking-wider sm:text-xs">RCH RUNS</strong></div>
     <div className="border-x border-white/10 px-3 py-4 text-center sm:py-5"><small className="block text-[8px] font-black uppercase tracking-[.2em] text-white/40">Home court</small><strong className="mt-1 block text-[10px] font-black uppercase tracking-wider sm:text-xs">{partner.city}, VA</strong></div>
     <div className="px-3 py-4 text-center sm:py-5"><small className="block text-[8px] font-black uppercase tracking-[.2em] text-white/40">Player rewards</small><strong className="mt-1 block text-[10px] font-black uppercase tracking-wider text-[#ff7a86] sm:text-xs">{partner.reward_multiplier}× XP</strong></div>
    </div>
   </header>

   {isSyb&&<section aria-label="SYB circuit stats" className="mt-5">
    {statsError?<p role="status" className="rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4 text-sm text-amber-100">{statsError}</p>:<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
     {([{label:'Events hosted',value:publicStats.events,icon:<FaCalendarDays/>},{label:'Upcoming runs',value:publicStats.upcoming_events,icon:<FaBolt/>},{label:'Verified 1v1s',value:publicStats.verified_matchups,icon:<FaShieldHalved/>},{label:'Players ranked',value:publicStats.ranked_players,icon:<FaUsers/>}] as {label:string;value:number;icon:ReactNode}[]).map(item=><article key={item.label} className="rounded-2xl border border-[#3b2226] bg-[linear-gradient(145deg,#171012,#0d0c0e)] p-4 sm:p-5"><span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.16em] text-white/45">{item.icon}{item.label}</span><strong className="mt-3 block text-3xl font-black tabular-nums tracking-tight">{item.value}</strong><span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-white/30">RCH verified data</span></article>)}
    </div>}
   </section>}

   {settings.show_schedule&&<section id="partner-schedule" className="mt-14 scroll-mt-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
     <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[var(--partner-accent)]"><FaBolt/> {isSyb?'THE SYB CIRCUIT':'PARTNER EVENTS'}</p><h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">{isSyb?'The next matchup':'Upcoming sessions'}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{isSyb?'Official 1v1 events, real opponents, and every result tracked in one place. Join through your free RCH profile and earn triple XP on eligible SYB events.':'Find the next organized run from this RCH partner.'}</p></div>
     {partner.instagram_url&&<a href={partner.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-[10px] font-black uppercase tracking-wider text-white/75 transition hover:border-[var(--partner-accent)] hover:text-white"><FaInstagram/> Follow SYB <FaArrowRight/></a>}
    </div>
    {!upcoming.length?<div className="relative mt-5 overflow-hidden rounded-[1.6rem] border border-dashed border-[#65303a] bg-[radial-gradient(circle_at_85%_10%,#321217,#100d0f_55%)] p-6 sm:p-9">
     <div aria-hidden="true" className="absolute -right-10 -top-12 h-56 w-56 rounded-full border border-white/[.07]"/>
     <div className="relative max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full bg-white/[.06] px-3 py-2 text-[9px] font-black uppercase tracking-[.18em] text-white/60"><FaCalendarDays/> Event board</span><h3 className="mt-4 text-2xl font-black uppercase sm:text-3xl">The next matchup is waiting to be posted.</h3><p className="mt-3 text-sm leading-6 text-white/55">{isSyb?'No official SYB session is published in Runs right now. Follow SYB for the next drop, then come back here to join and track it.':'This partner has not published its next session yet. Check back for updates.'}</p><div className="mt-5 flex flex-wrap gap-3">{partner.instagram_url&&<a href={partner.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--partner-accent)] px-4 text-xs font-black uppercase">Follow the drop <FaArrowRight/></a>}<Link href="/runs/partners" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-black uppercase text-white/80">Explore all runs <FaArrowRight/></Link></div></div>
    </div>:<div className="mt-5 grid gap-4 lg:grid-cols-2">{upcoming.map((s,index)=><Link key={s.run_id} href={'/runs/'+s.run_id+(s.run.game_format==='1v1'?'#rch-live-game':'')} className="group relative overflow-hidden rounded-[1.5rem] border border-[#4d252b] bg-[linear-gradient(130deg,#1b1012,#0e0e10_65%)] p-5 transition hover:-translate-y-1 hover:border-[var(--partner-accent)] hover:shadow-[0_20px_60px_rgba(245,31,49,.12)] sm:p-6">
     <div aria-hidden="true" className="absolute -right-8 -top-16 h-48 w-48 rounded-full border border-white/[.06] transition group-hover:border-[var(--partner-accent)]/30"/>
     <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[var(--partner-accent)] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider">{isSyb?'SYB official run':'Partner run'}</span><span className="text-[10px] font-black uppercase tracking-wider text-white/55">{s.run.game_format}</span></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
       <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white/45"><FaCalendarDays className="text-[var(--partner-accent)]"/>{new Date(s.run.starts_at).toLocaleString('en-US',{weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'})}</p><h3 className="mt-3 text-2xl font-black uppercase leading-tight">{s.run.title}</h3>{s.run.description&&<p className="mt-2 max-w-xl text-xs leading-5 text-white/55">{s.run.description}</p>}</div>
       <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 sm:min-w-32"><small className="block text-[8px] font-black uppercase tracking-widest text-white/40">Event XP</small><strong className="mt-1 block text-xl font-black text-[#ff7a86]">{s.reward_multiplier}×</strong></div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
       <span className="flex items-center gap-2 text-xs text-white/65"><FaLocationDot className="text-[var(--partner-accent)]"/>{s.run.location}</span>
       <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-white transition group-hover:text-[#ff7a86]">{s.price_cents?'$'+(s.price_cents/100).toFixed(2):'Free'} <span className="text-white/30">/</span> {s.run.game_format==='1v1'?'Open Run Room + Scorekeeper':'Open event'} <FaArrowRight/></span>
      </div>
     </div>
    </Link>)}</div>}
   </section>}

   {isSyb&&<section aria-label="SYB quick scorekeeper" className="mt-6 grid gap-5 rounded-[1.7rem] border border-[#57232a] bg-[linear-gradient(115deg,#1a0e11,#0c0c0e)] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
    <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-[var(--partner-accent)]"><FaBasketball/> FAST 1V1 SCOREKEEPING</p><h2 className="mt-2 text-2xl font-black uppercase">Keep the game moving.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Every official 1v1 Run Room has a live courtside board. Scorekeepers can select the scorer, tap 1s, 2s, or 3s, undo a correction, and send the final score for RCH review.</p></div>
    <Link href={upcoming.find(s=>s.run.game_format==='1v1')?'/runs/'+upcoming.find(s=>s.run.game_format==='1v1')!.run_id+'#rch-live-game':'#partner-schedule'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--partner-accent)] px-5 text-xs font-black uppercase tracking-wider text-white transition hover:brightness-110">{upcoming.some(s=>s.run.game_format==='1v1')?'Open the live scorekeeper':'See official events'} <FaArrowRight/></Link>
   </section>}

   {isSyb&&settings.show_leaderboard&&<section id="partner-leaderboard" className="mt-14 scroll-mt-8 overflow-hidden rounded-[1.8rem] border border-[#54242b] bg-[linear-gradient(145deg,#150d0f,#090a0c_75%)]">
    <div className="border-b border-white/10 p-5 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[var(--partner-accent)]"><FaTrophy/> SYB OFFICIAL 1V1 RECORDS</p><h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">The leaderboard</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Every spot is earned. Only confirmed SYB results count toward this board.</p></div><span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white/60"><FaShieldHalved className="text-[var(--partner-accent)]"/> Verified only</span></div></div>
    {statsError?<p role="status" className="m-5 rounded-xl border border-amber-300/25 bg-amber-300/5 p-4 text-sm text-amber-100">{statsError}</p>:publicStats.leaderboard.length?<div className="p-5 sm:p-8">
     <div className="grid gap-3 md:grid-cols-3">{publicStats.leaderboard.slice(0,3).map((player,index)=><article key={player.profile_id} className={'relative overflow-hidden rounded-2xl border p-4 sm:p-5 '+(index===0?'border-[#f51f31]/55 bg-[radial-gradient(circle_at_85%_10%,#45121b,#160d10_68%)] md:-translate-y-2':'border-white/10 bg-white/[.035]')}>
      <div className="flex items-start justify-between"><span className="text-[9px] font-black uppercase tracking-[.2em] text-white/45">Rank {String(player.rank).padStart(2,'0')}</span>{index===0&&<FaCrown className="text-[#ff5967]"/>}</div>
      <div className="mt-4 flex items-center gap-3">{player.avatar_url?<img src={player.avatar_url} alt="" className="h-12 w-12 rounded-full border border-white/15 object-cover"/>:<span className="grid h-12 w-12 place-items-center rounded-full border border-[#6d2931] bg-[#210e12] text-sm font-black text-[#ff8791]">{player.player_name.slice(0,1).toUpperCase()}</span>}<div className="min-w-0"><h3 className="truncate text-lg font-black uppercase">{player.player_name}</h3>{player.username&&<p className="truncate text-xs text-white/45">@{player.username}</p>}</div></div>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4"><div><small className="text-[8px] font-black uppercase tracking-wider text-white/40">Record</small><strong className="mt-1 block text-sm font-black">{player.wins}–{player.losses}</strong></div><div><small className="text-[8px] font-black uppercase tracking-wider text-white/40">Win rate</small><strong className="mt-1 block text-sm font-black">{formatPct(player.win_pct)}%</strong></div><div><small className="text-[8px] font-black uppercase tracking-wider text-white/40">Games</small><strong className="mt-1 block text-sm font-black">{player.games}</strong></div></div>
     </article>)}</div>
     {publicStats.leaderboard.length>3&&<div className="mt-5 overflow-hidden rounded-2xl border border-white/10"><div className="grid grid-cols-[55px_1fr_80px_70px] bg-white/[.04] px-4 py-3 text-[8px] font-black uppercase tracking-wider text-white/40 sm:grid-cols-[70px_1fr_110px_90px_100px]"><span>Rank</span><span>Player</span><span>Record</span><span className="sm:hidden">Win %</span><span className="hidden sm:block">Win rate</span><span className="hidden sm:block">Points</span></div>{publicStats.leaderboard.slice(3).map(player=><div key={player.profile_id} className="grid grid-cols-[55px_1fr_80px_70px] items-center border-t border-white/[.07] px-4 py-3 text-xs sm:grid-cols-[70px_1fr_110px_90px_100px]"><span className="font-mono font-bold text-[#ff8791]">#{player.rank}</span><span className="min-w-0 truncate font-bold">{player.player_name}{player.username&&<small className="ml-2 hidden text-white/40 sm:inline">@{player.username}</small>}</span><span className="font-mono font-bold">{player.wins}–{player.losses}</span><span>{formatPct(player.win_pct)}%</span><span className="hidden sm:block">{player.points_for}–{player.points_against}</span></div>)}</div>}
    </div>:<div className="p-7 sm:p-10"><div className="mx-auto max-w-xl text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[#6d2931] bg-[#210e12] text-2xl text-[var(--partner-accent)]"><FaBasketball/></span><p className="mt-5 text-[9px] font-black uppercase tracking-[.25em] text-[#ff7a86]">The record board is live</p><h3 className="mt-2 text-2xl font-black uppercase">The first spot is still open.</h3><p className="mt-3 text-sm leading-6 text-white/55">SYB’s leaderboard fills with confirmed results from official events. No made-up numbers. No unverified records. Just the work on the court.</p><Link href="#partner-schedule" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--partner-accent)] px-4 text-xs font-black uppercase">Find your matchup <FaArrowRight/></Link></div></div>}
   </section>}

   {isSyb&&settings.show_video&&videoEmbed&&<section id="syb-film" className="mt-14 scroll-mt-8 overflow-hidden rounded-[1.8rem] border border-[#54242b] bg-[#100c0e]">
    <div className="grid lg:grid-cols-[.72fr_1.28fr]">
     <div className="flex flex-col justify-center p-6 sm:p-9"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[var(--partner-accent)]"><FaPlay/> SYBHOOPS · THE TAPE</p><h2 className="mt-3 text-3xl font-black uppercase leading-[.95] sm:text-4xl">Featured matchup</h2><p className="mt-4 text-sm leading-6 text-white/55">{settings.subheadline}</p><p className="mt-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white"><FaCrown className="text-[var(--partner-accent)]"/>{settings.featured_video_label||'SYB FEATURE'}</p><a href="https://www.youtube.com/@SUPPORTYOURBROTHERS" target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-[var(--partner-accent)] px-4 text-xs font-black uppercase">More SYB film <FaArrowRight/></a></div>
     <div className="aspect-video bg-black"><iframe className="h-full w-full" src={videoEmbed} title={'SYBHOOPS — '+settings.featured_video_label} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/></div>
    </div>
   </section>}

   {isSyb&&settings.callout_title&&settings.callout_body&&<section className="mt-8 grid gap-5 rounded-[1.7rem] border border-white/10 bg-[linear-gradient(115deg,#171012,#0a0b0d)] p-5 sm:grid-cols-[.75fr_1.25fr] sm:items-center sm:p-8">
    <div><p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.22em] text-[var(--partner-accent)]"><FaChartLine/> HOW SYB RUNS WORK</p><h2 className="mt-3 text-2xl font-black uppercase leading-tight">{settings.callout_title}</h2></div>
    <div><p className="text-sm leading-7 text-white/60">{settings.callout_body}</p><p className="mt-4 rounded-xl border border-[#f51f31]/20 bg-[#f51f31]/[.06] p-3 text-xs font-bold leading-5 text-white/75">Check in through your free RCH profile, record the final score, and submit the result for confirmation. Official SYB events award {partner.reward_multiplier}× eligible XP.</p></div>
   </section>}

   {settings.show_results&&!!recent.length&&<section className="mt-14"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[var(--partner-accent)]">THE ARCHIVE</p><h2 className="mt-2 text-3xl font-black uppercase">Results & Run Tape</h2><p className="mt-2 text-sm leading-6 text-white/50">Past events, official scores, and player-posted highlights.</p></div><FaChartLine className="mb-1 text-2xl text-[var(--partner-accent)]"/></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{recent.map(s=><Link key={s.run_id} href={'/runs/'+s.run_id} className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-4 transition hover:border-[var(--partner-accent)]/50 hover:bg-white/[.06]"><span className="min-w-0"><strong className="block truncate text-sm font-black uppercase">{s.run.title}</strong><small className="mt-1 block text-xs text-white/45">{new Date(s.run.starts_at).toLocaleDateString()} · Official event archive</small></span><FaArrowRight className="shrink-0 text-white/40 transition group-hover:translate-x-1 group-hover:text-[var(--partner-accent)]"/></Link>)}</div></section>}

   <footer className="mt-14 flex flex-col gap-4 border-t border-white/10 py-7 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
    <p className="max-w-2xl leading-6">SYB organizers control their own schedule, venues, and event fees. RCH verifies competitive results before they count toward official rankings.</p>
    <Link href="/runs/partners" className="inline-flex min-h-10 items-center gap-2 font-black uppercase tracking-wider text-white/70 transition hover:text-white"><FaShieldHalved className="text-[var(--partner-accent)]"/> RCH Runs Partner Network <FaArrowRight/></Link>
   </footer>
  </div>
 </main>;
}
