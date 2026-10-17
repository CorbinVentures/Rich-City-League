'use client';

import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaBasketball,FaCalendarDays,FaCrown,FaLocationDot,FaPeopleGroup,FaShieldHalved,FaTrophy} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';
import {CourtMasterTitles} from '@/components/runs/CourtMasterTitles';
import {RCHEmptyState,RCHSectionHeader,RCHStatusChip} from '@/components/runs/arena-ui';
import '../../visual-experience.css';

type Venue={slug:string;name:string;locality:string|null;address:string|null;venue_type:string|null;access_type:string|null;hours_text:string|null;open_gym_text:string|null;verification_status:string|null};
type Crew={crew_id:string;crew_name:string;games:number;wins:number;win_pct:number;is_controller:boolean};
type Run={id:string;title:string;starts_at:string;game_format:string;status:'open'|'full'|'cancelled'|'completed';max_players:number};
export default function RunCourtProfile(){
 const {slug}=useParams<{slug:string}>();
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [court,setCourt]=useState<Venue|null>(null);
 const [crews,setCrews]=useState<Crew[]>([]);
 const [runs,setRuns]=useState<Run[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [watched,setWatched]=useState(false);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  if(!db||!slug){setLoading(false);return;}
  let active=true;
  void(async()=>{
   setLoading(true);
   const [venue,crewBoard,events,setting]=await Promise.all([
    db.from('basketball_locations').select('slug,name,locality,address,venue_type,access_type,hours_text,open_gym_text,verification_status').eq('slug',slug).eq('is_active',true).maybeSingle(),
    db.rpc('get_rch_court_crew_standings',{p_court:slug}),
    db.from('runs').select('id,title,starts_at,game_format,status,max_players').eq('location_slug',slug).in('status',['open','full'])
     .gte('starts_at',new Date().toISOString()).order('starts_at').limit(30),
    user?.id?db.from('rch_run_daily_preferences').select('watched_courts').eq('profile_id',user.id).maybeSingle():Promise.resolve({data:null})
   ]);
   if(!active)return;
   setCourt((venue.data||null) as Venue|null);
   setCrews((crewBoard.data||[]) as Crew[]);
   setRuns((events.data||[]) as Run[]);
   setWatched(Boolean(setting.data?.watched_courts?.includes(slug)));
   if(venue.error)setError('Court details are unavailable.');
   setLoading(false);
  })();
  return()=>{active=false;};
 },[db,slug,user?.id]);
 async function changeWatch(){
  if(!db||!user?.id||busy||!court)return;
  setBusy(true);setError('');setNotice('');
  const {data:current,error:prefError}=await db.from('rch_run_daily_preferences').select('preferred_format,preferred_type').eq('profile_id',user.id).maybeSingle();
  if(prefError){setError('Unable to load your preference settings.');setBusy(false);return;}
  const {error:failed}=await db.rpc('rch_set_run_daily_preferences',{
   p_format:current?.preferred_format||'all',p_type:current?.preferred_type||'all',p_court:court.slug,p_watch:!watched
  });
  if(failed)setError(failed.message);
  else{setWatched(!watched);setNotice(watched?'Court removed from your watchlist.':'Court added to your personal Runs watchlist.');}
  setBusy(false);
 }
 if(loading)return <main className="rch-arena-shell min-h-screen px-4 py-8"><div className="mx-auto max-w-6xl"><div className="rch-ux-skeleton mb-5 h-56"/><div className="rch-ux-skeleton h-44"/></div></main>;
 if(!court)return <main className="rch-arena-shell min-h-screen px-4 py-8"><div className="mx-auto max-w-6xl"><RCHEmptyState title="Court not available" description={error||'This location has not been verified as a current RCH court.'} actions={[{href:'/runs',label:'Find other courts',primary:true}]}/></div></main>;
 const owner=crews.find(c=>c.is_controller);
 return <main className="rch-arena-shell min-h-screen px-4 pb-28 pt-6 sm:px-8">
  <div className="mx-auto max-w-6xl">
   <Link href={'/runs?court='+encodeURIComponent(slug)} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#a2d7ff]">← Back to this court's Runs</Link>
   <section className="rch-ux-court-hero">
    <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
     <div className="max-w-2xl"><div className="rch-ux-court-mark" aria-hidden="true"><FaBasketball/></div>
      <p className="rch-ux-eyebrow mt-5"><FaLocationDot aria-hidden="true"/> VIRGINIA COURT IDENTITY</p>
      <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">{court.name}</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-[#c4dcec]"><FaLocationDot/>{court.locality||'Virginia'}{court.address?' · '+court.address:''}</p>
      <div className="mt-4 flex flex-wrap gap-2"><span className="rch-ux-status">{court.venue_type||'Basketball venue'}</span>
       {court.verification_status&&<span className="rch-ux-status rch-ux-status--verified"><FaShieldHalved/> Venue sourced: {court.verification_status}</span>}</div>
     </div>
     <div className="flex flex-wrap gap-2">
      {user?<button type="button" disabled={busy} onClick={()=>void changeWatch()} className="rch-ux-btn-primary">{watched?'✓ Watching court':'+ Watch court'}</button>:<Link className="rch-ux-btn-primary" href={'/auth/sign-in?next='+encodeURIComponent('/runs/courts/'+slug)}>Sign in to watch</Link>}
      <Link href={'/runs?court='+encodeURIComponent(slug)} className="rch-ux-btn-secondary">Find court Runs <FaArrowRight/></Link>
     </div>
    </div>
   </section>
   {error&&<p role="alert" className="mt-4 rounded-xl border border-red-400/40 p-4 text-sm text-red-200">{error}</p>}
   {notice&&<p role="status" className="mt-4 rounded-xl border border-emerald-400/40 p-4 text-sm text-emerald-200">{notice}</p>}
   <section className="mt-7 grid gap-4 md:grid-cols-2">
    <div className="rch-ux-court-card rch-ux-badge-luster">
     <p className="rch-ux-eyebrow"><FaCrown/> COURT DOMINION</p>
     <h2 className="mt-3 text-2xl font-black">{owner?owner.crew_name:'The territory is unclaimed'}</h2>
     <p className="mt-2 text-sm leading-6 text-[#c8d8e9]">{owner?'Current controlling crew · '+owner.wins+' wins on record':'No registered crew currently holds this court. Territory ownership is awarded only through verified results.'}</p>
     <Link className="rch-ux-header-action mt-3" href={'/runs?court='+encodeURIComponent(slug)}>View takeover competitions <FaArrowRight/></Link>
    </div>
    <div className="rch-ux-court-card">
     <p className="rch-ux-eyebrow"><FaPeopleGroup/> COURT COMMUNITY</p>
     <p className="rch-ux-rank-stage">{crews.length}</p><p className="rch-ux-rank-label">Crews on the court leaderboard</p>
     <p className="mt-3 text-sm text-[#c4d6e8]">Court control belongs to real results—not likes or REP boosts.</p>
     <Link href="/crews" className="rch-ux-header-action mt-3">Discover crews <FaArrowRight/></Link>
    </div>
   </section>
   <CourtMasterTitles court={court.slug}/>
   <section className="mt-8">
    <RCHSectionHeader eyebrow="REAL BASKETBALL OPPORTUNITIES" title="Upcoming on this court" description="These are scheduled events, not simulated games." action={{href:'/runs?create=1&court='+encodeURIComponent(slug),label:'Host here'}}/>
    {runs.length?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{runs.map(run=><Link key={run.id} href={'/runs/'+run.id} className="rch-ux-court-card block transition hover:border-[#81c2f5]">
     <div className="flex items-start justify-between gap-2"><p className="text-xs font-black text-[#93cfff]">{run.game_format} · {new Date(run.starts_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</p><RCHStatusChip status={run.status}/></div>
     <h3 className="mt-3 text-lg font-black">{run.title}</h3><p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#a8d9ff]">View Run <FaArrowRight/></p>
    </Link>)}</div>:<RCHEmptyState title="The next game is yours to organize" description="No scheduled games at this court right now. Bring your crew, invite a rival, or set up a real pickup session." actions={[{href:'/runs?create=1&court='+encodeURIComponent(slug),label:'Host at this court',primary:true},{href:'/runs/partners',label:'Explore organizers'}]}/>}
   </section>
   {(court.hours_text||court.open_gym_text)&&<aside className="mt-6 rounded-2xl border border-[#355c7d] p-5 text-sm leading-6 text-[#c3d9ec]"><h2 className="font-black text-white">Venue information</h2>{court.hours_text&&<p className="mt-2">Published hours: {court.hours_text}</p>}{court.open_gym_text&&<p className="mt-2">Open gym details: {court.open_gym_text}</p>}<p className="mt-2 text-xs text-[#abc2d7]">Confirm the current schedule and access rules with the venue before traveling.</p></aside>}
  </div>
 </main>;
}
