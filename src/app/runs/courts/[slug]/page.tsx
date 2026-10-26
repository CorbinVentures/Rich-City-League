'use client';

import Link from 'next/link';
import {useParams,useSearchParams} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaBasketball,FaCalendarDays,FaCrown,FaLocationDot,FaPeopleGroup,FaShieldHalved,FaTrophy} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';
import {CourtMasterTitles} from '@/components/runs/CourtMasterTitles';
import {RCHEmptyState,RCHSectionHeader,RCHStatusChip} from '@/components/runs/arena-ui';
import '../../visual-experience.css';
import './court-game-arena.css';

type Venue={slug:string;name:string;locality:string|null;address:string|null;venue_type:string|null;access_type:string|null;hours_text:string|null;open_gym_text:string|null;verification_status:string|null};
type Crew={crew_id:string;crew_name:string;logo_path?:string|null;games:number;wins:number;win_pct:number;is_controller:boolean};
type Run={id:string;title:string;starts_at:string;game_format:string;status:'open'|'full'|'cancelled'|'completed';max_players:number};
type HistoryEntry={id:string;kind:'crown'|'takeover';title:string;occurred_at:string};
export default function RunCourtProfile(){
 const {slug}=useParams<{slug:string}>();
 const params=useSearchParams();
 const incomingCity=params.get('fromCity');
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [court,setCourt]=useState<Venue|null>(null);
 const postalCity=(court?.locality||'').toLowerCase();
 const fallbackCity=postalCity.includes('chesterfield')?'chesterfield':
  ['glen allen','sandston'].includes(postalCity)?'henrico':postalCity;
 const returnCity=incomingCity&&/^[a-z-]{2,40}$/.test(incomingCity)?incomingCity:fallbackCity;
 const [crews,setCrews]=useState<Crew[]>([]);
 const [runs,setRuns]=useState<Run[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [watched,setWatched]=useState(false);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [history,setHistory]=useState<HistoryEntry[]>([]);
 const [historyLoading,setHistoryLoading]=useState(true);
 useEffect(()=>{
  if(!db||!slug){setLoading(false);return;}
  let active=true;
  void(async()=>{
   setLoading(true);setHistoryLoading(true);
   const [venue,crewBoard,events,setting,crowns,takeovers]=await Promise.all([
    db.from('rch_runs_outdoor_courts').select('slug,name,locality,address,venue_type,access_type,hours_text,open_gym_text,verification_status').eq('slug',slug).eq('is_active',true).maybeSingle(),
    db.rpc('get_rch_court_crew_standings',{p_court:slug}),
    db.from('runs').select('id,title,starts_at,game_format,status,max_players').eq('location_slug',slug).in('status',['open','full'])
     .gte('starts_at',new Date().toISOString()).order('starts_at').limit(30),
    user?.id?db.from('rch_run_daily_preferences').select('watched_courts').eq('profile_id',user.id).maybeSingle():Promise.resolve({data:null}),
    db.from('rch_court_master_history').select('id,division,event_type,occurred_at').eq('court_slug',slug).order('occurred_at',{ascending:false}).limit(15),
    db.from('rch_court_takeovers').select('id,status,created_at').eq('court_slug',slug).eq('status','resolved').order('created_at',{ascending:false}).limit(15)
   ]);
   if(!active)return;
   setCourt((venue.data||null) as Venue|null);
   setCrews((crewBoard.data||[]) as Crew[]);
   setRuns((events.data||[]) as Run[]);
   setWatched(Boolean(setting.data?.watched_courts?.includes(slug)));
   const matchEvents:HistoryEntry[]=[
    ...((crowns.data||[]) as {id:string;division:string;event_type:string;occurred_at:string}[])
     .map(e=>({id:'crown-'+e.id,kind:'crown' as const,title:(e.event_type==='title_takeover'?'Master crowned':e.event_type==='title_defense'?'Crown defended':'Court Master event')+' · '+e.division,occurred_at:e.occurred_at})),
    ...((takeovers.data||[]) as {id:string;status:string;created_at:string}[])
     .map(e=>({id:'takeover-'+e.id,kind:'takeover' as const,title:'Resolved crew challenge (recorded at creation)',occurred_at:e.created_at}))
   ].filter(e=>Number.isFinite(Date.parse(e.occurred_at)));
   setHistory(matchEvents.sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at)).slice(0,15));
   setHistoryLoading(false);
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
   <Link href={'/runs/world?city='+encodeURIComponent(returnCity)+'&court='+encodeURIComponent(court.slug)} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#a2d7ff]">← Back to this court on Virginia World</Link>
   <section className="rch-ux-court-hero rch-court-game-hero" aria-label="Court Arena entrance">
    <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
     <div className="max-w-2xl"><div className="rch-ux-court-mark" aria-hidden="true"><FaBasketball/></div>
      <p className="rch-ux-eyebrow mt-5"><FaLocationDot aria-hidden="true"/> RUNS WORLD · VERIFIED VENUE RECORD</p>
      <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">{court.name}</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-[#c4dcec]"><FaLocationDot/>{court.locality||'Virginia'}{court.address?' · '+court.address:''}</p>
      <p className="mt-4 max-w-md text-xs leading-5 text-[#d2e7f8]">Every court has a story. Earn your name here through real, independently verified basketball.</p>
      <p className="mt-3 text-[10px] font-semibold text-[#b5cad9]">Cinematic court artwork is illustrative—not an actual venue photograph.</p>
      <div className="mt-4 flex flex-wrap gap-2"><span className="rch-ux-status">{court.venue_type||'Basketball venue'}</span>
       {court.verification_status&&<span className="rch-ux-status rch-ux-status--verified"><FaShieldHalved/> Venue sourced: {court.verification_status}</span>}</div>
     </div>
     <div className="flex flex-wrap gap-2">
      {user?<button type="button" disabled={busy} onClick={()=>void changeWatch()} className="rch-ux-btn-primary">{watched?'✓ Watching court':'+ Watch court'}</button>:<Link className="rch-ux-btn-primary" href={'/auth/sign-in?next='+encodeURIComponent('/runs/courts/'+slug)}>Sign in to watch</Link>}
      <Link href={'/runs?court='+encodeURIComponent(slug)} className="rch-ux-btn-secondary">Find court Runs <FaArrowRight/></Link>
     </div>
    </div>
   </section>
   <nav className="rch-court-section-nav" aria-label="Court Arena sections">
    <a href="#rch-court-territory"><FaCrown/> Territory</a><a href="#rch-court-masters"><FaTrophy/> Masters</a>
    <a href="#rch-court-schedule"><FaCalendarDays/> Runs</a><a href="#rch-court-history"><FaShieldHalved/> History</a>
    <a href="#rch-court-venue"><FaLocationDot/> Venue</a>
   </nav>
   <div className="rch-court-scorebar" aria-label="Verified court overview">
    <div><small>CONTROLLING CREW</small><strong>{owner?owner.crew_name:'Unclaimed'}</strong></div>
    <div><small>CREWS ON LADDER</small><strong>{crews.length}</strong></div>
    <div><small>UPCOMING RUNS</small><strong>{runs.length}</strong></div>
   </div>
   {error&&<p role="alert" className="mt-4 rounded-xl border border-red-400/40 p-4 text-sm text-red-200">{error}</p>}
   {notice&&<p role="status" className="mt-4 rounded-xl border border-emerald-400/40 p-4 text-sm text-emerald-200">{notice}</p>}
   <section id="rch-court-territory" className="mt-7 grid scroll-mt-32 gap-4 md:grid-cols-2" aria-label="Verified crew court control">
    <div className="rch-ux-court-card rch-ux-badge-luster">
     <p className="rch-ux-eyebrow"><FaCrown/> COURT DOMINION</p>
     <div className="mt-3 flex flex-wrap items-center gap-3">{owner?.logo_path&&db?<img src={db.storage.from('rch-crew-logos').getPublicUrl(owner.logo_path).data.publicUrl} alt={owner.crew_name+' current court crew emblem'} className="h-16 w-16 rounded-xl border border-[#dbb978] bg-[#091b2c] object-contain p-1"/>:<span className="grid h-16 w-16 place-items-center rounded-xl border border-[#ddbf83] bg-[#18334a] text-3xl text-[#f7d68e]"><FaCrown/></span>}<h2 className="text-2xl font-black">{owner?owner.crew_name:'The territory is unclaimed'}</h2></div>
     <p className="mt-2 text-sm leading-6 text-[#c8d8e9]">{owner?'Current controlling crew · '+owner.wins+' wins on record':'No registered crew currently holds this court. Territory ownership is awarded only through verified results.'}</p>
     <Link className="rch-ux-header-action mt-3" href={'/runs?view=list&competition=courts&court='+encodeURIComponent(slug)+'#rch-competition'}>View takeover competitions <FaArrowRight/></Link>
    </div>
    <div className="rch-ux-court-card">
     <p className="rch-ux-eyebrow"><FaPeopleGroup/> COURT COMMUNITY</p>
     <p className="rch-ux-rank-stage">{crews.length}</p><p className="rch-ux-rank-label">Crews on the court leaderboard</p>
     <p className="mt-3 text-sm text-[#c4d6e8]">Court control belongs to real results—not likes or REP boosts.</p>
     {crews.length>0&&<ol className="rch-court-crew-ladder" aria-label="Court crew standings">{[...crews].sort((a,b)=>b.win_pct-a.win_pct).slice(0,5).map((crew,i)=><li key={crew.crew_id}><span>{i+1}. {crew.crew_name}{crew.is_controller?' 👑':''}</span><strong>{crew.win_pct}% · {crew.wins} wins</strong></li>)}</ol>}
     <Link href="/crews" className="rch-ux-header-action mt-3">Discover crews <FaArrowRight/></Link>
    </div>
   </section>
   <div id="rch-court-masters" className="scroll-mt-32"><CourtMasterTitles court={court.slug}/></div>
   <section id="rch-court-schedule" className="mt-8 scroll-mt-32" aria-label="Upcoming real Runs at this venue">
    <RCHSectionHeader eyebrow="REAL BASKETBALL OPPORTUNITIES" title="Upcoming on this court" description="These are scheduled events, not simulated games." action={{href:'/runs?create=1&court='+encodeURIComponent(slug),label:'Host here'}}/>
    {runs.length?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{runs.map(run=><Link key={run.id} href={'/runs/'+run.id+'?fromCourt='+encodeURIComponent(court.slug)+'&fromCity='+encodeURIComponent(returnCity)} className="rch-ux-court-card block transition hover:border-[#81c2f5]">
     <div className="flex items-start justify-between gap-2"><p className="text-xs font-black text-[#93cfff]">{run.game_format} · {new Date(run.starts_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</p><RCHStatusChip status={run.status}/></div>
     <h3 className="mt-3 text-lg font-black">{run.title}</h3><p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#a8d9ff]">View Run <FaArrowRight/></p>
    </Link>)}</div>:<RCHEmptyState title="The next game is yours to organize" description="No scheduled games at this court right now. Bring your crew, invite a rival, or set up a real pickup session." actions={[{href:'/runs?create=1&court='+encodeURIComponent(slug),label:'Host at this court',primary:true},{href:'/runs/partners',label:'Explore organizers'}]}/>}
   </section>
   <section id="rch-court-history" className="mt-8 scroll-mt-32 rounded-2xl border border-[#355a7b] bg-[#0a2035] p-5 sm:p-6" aria-label="Court championship and takeover history">
    <p className="rch-ux-eyebrow"><FaTrophy/> THE COURT CHRONICLES</p>
    <h2 className="mt-2 text-2xl font-black">The Legacy Wall</h2>
    <p className="mt-2 text-xs leading-5 text-[#bbd2e3]">A timeline of recorded Court Master events and resolved crew challenges. Events do not imply a public court reservation.</p>
    {historyLoading?<p className="mt-5 text-sm text-[#a7c9e4]" role="status">Checking recorded championship history…</p>
     :history.length?<ol className="rch-court-game-history">{history.map(event=><li key={event.id}><span className="rch-court-game-history-icon">{event.kind==='crown'?<FaCrown/>:<FaPeopleGroup/>}</span><span><strong>{event.title}</strong><small>{new Date(event.occurred_at).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'})} · Recorded court event</small></span></li>)}</ol>
     :<p className="mt-5 rounded-xl border border-dashed border-[#53708d] p-5 text-xs text-[#c1d3e3]">No qualifying title or resolved takeover events are recorded for this court yet. The first verified competition can start its history.</p>}
   </section>
   <aside id="rch-court-venue" className="mt-7 scroll-mt-32 rounded-2xl border border-[#355c7d] bg-[#071a2c] p-5 text-sm leading-6 text-[#c3d9ec]" aria-label="Court access and venue safety"><h2 className="font-black text-white">Venue access & fair play</h2>
    <p className="mt-2 text-xs text-[#c1d8e9]">An official or provider-sourced venue is not a reservation, open-gym permission, or assurance of availability. Respect park hours, facility policies and each event’s rules.</p>
    <p className="mt-2 text-xs text-[#c1d8e9]">Crew ownership and Court Master crowns reflect verified competition—not control over public access to the park.</p></aside>
   {(court.hours_text||court.open_gym_text)&&<aside className="mt-6 rounded-2xl border border-[#355c7d] p-5 text-sm leading-6 text-[#c3d9ec]"><h2 className="font-black text-white">Venue information</h2>{court.hours_text&&<p className="mt-2">Published hours: {court.hours_text}</p>}{court.open_gym_text&&<p className="mt-2">Open gym details: {court.open_gym_text}</p>}<p className="mt-2 text-xs text-[#abc2d7]">Confirm the current schedule and access rules with the venue before traveling.</p></aside>}
  </div>
 </main>;
}
