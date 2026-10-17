'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaArrowRotateRight,FaBasketball,FaBolt,FaCompass,FaCrown,FaGift,FaLocationDot,FaMedal,FaPeopleGroup,FaShieldHalved,FaTrophy} from 'react-icons/fa6';
import {AccurateVirginiaMap,type CommunityCourtLead} from '@/components/runs/AccurateVirginiaMap';
import {courtCoverage,localityNames,matchesRunToCourts} from '@/lib/runs-geography';
import {GravityLocationPicker} from '@/components/GravityLocationPicker';
import {CourtDominion} from '@/components/runs/CourtDominion';
import {RunPassport} from '@/components/runs/RunPassport';
import {WorldBattleScene,WorldPlayerIdentity} from '@/components/runs/RunsWorldBattleScene';
import {WorldJourneyPanel,WorldScoutButton,WorldPulse,type WorldPulseEvent} from '@/components/runs/RunsWorldJourney';
import type {WorldJourney} from '@/lib/runs-world-progression';
import {useAuth} from '@/hooks/useAuth';
import {useGravityLocation} from '@/hooks/useGravityLocation';
import {getSupabaseClient} from '@/lib/supabase';
import {VIRGINIA_CITIES,type VirginiaCity} from '@/lib/virginia-world';
import {buildCourtMapPins,readPagedUpcomingRuns,verifiedParksRecFacility,type WorldCourt,type WorldRun} from '@/lib/runs-world-game';
import './runs-world.css';

type Screen='world'|'battle'|'missions'|'vault'|'player';
type Territory={court_slug:string;crew_id:string;successful_defenses:number};
type Master={division:string;player_name:string;is_master:boolean;games:number;wins:number};
type CourtStats={masters:Master[];crewName:string|null;defenses:number;loading:boolean};
type Passport={run_rep:number;verified_games:number;badges:string[];last_results:{verified_at:string;court_name?:string;game_format?:string;won?:boolean;rating_before?:number;rating_after?:number}[]};
type PlayerStats={socialLevel:number|null;socialXp:number|null;repBalance:number|null;passport:Passport|null};
const blankStats:PlayerStats={socialLevel:null,socialXp:null,repBalance:null,passport:null};
// County-only Parks & Rec discovery area, not a new statewide Circuit city.
const parksRecAreas:VirginiaCity[]=[
 {id:'henrico',name:'Henrico',lat:37.61,lon:-77.40,landmark:'Henrico County',symbol:'🏟️'},
 {id:'arlington',name:'Arlington',lat:38.88,lon:-77.10,landmark:'Arlington County',symbol:'🏀'},
 {id:'prince-william',name:'Prince William',lat:38.67,lon:-77.45,landmark:'Prince William County',symbol:'🏀'},
 {id:'shenandoah',name:'Shenandoah',lat:38.83,lon:-78.59,landmark:'Shenandoah County',symbol:'🏀'}
];
const runsAreaOptions=[...VIRGINIA_CITIES,...parksRecAreas];
const cityTabs=[...VIRGINIA_CITIES.filter(city=>city.major),...parksRecAreas];
const nav:{id:Screen;title:string;icon:typeof FaCompass}[]=[
 {id:'world',title:'World',icon:FaCompass},
 {id:'battle',title:'Battle',icon:FaBolt},
 {id:'missions',title:'Missions',icon:FaTrophy},
 {id:'vault',title:'Vault',icon:FaMedal},
 {id:'player',title:'My Player',icon:FaPeopleGroup},
];
function shortWhen(value:string){
 const d=new Date(value);
 return Number.isFinite(d.getTime())?d.toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET':'Time unavailable';
}
export default function RunsWorldGame(){
 const {user}=useAuth();
 const {location,chooseCity,statewide}=useGravityLocation();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [screen,setScreen]=useState<Screen>('world');
 const [cityId,setCityId]=useState<string|null>(null);
 const [courts,setCourts]=useState<WorldCourt[]>([]);
 const [communityLeads,setCommunityLeads]=useState<CommunityCourtLead[]>([]);
 const [runs,setRuns]=useState<WorldRun[]>([]);
 const [featured,setFeatured]=useState<string[]>([]);
 const [territories,setTerritories]=useState<Territory[]>([]);
 const [crewNames,setCrewNames]=useState<Record<string,string>>({});
 const [selectedSlug,setSelectedSlug]=useState<string|null>(null);
 const [courtStats,setCourtStats]=useState<CourtStats>({masters:[],crewName:null,defenses:0,loading:false});
 const [player,setPlayer]=useState<PlayerStats>(blankStats);
 const [identity,setIdentity]=useState<{display_name:string|null;username:string|null;avatar_url:string|null}|null>(null);
 const [journey,setJourney]=useState<WorldJourney|null>(null);
 const [journeyLoading,setJourneyLoading]=useState(false);
 const [scoutVersion,setScoutVersion]=useState(0);
 const [worldPulse,setWorldPulse]=useState<WorldPulseEvent[]>([]);
 const [loading,setLoading]=useState(false);
 const [warning,setWarning]=useState('');
 const [pulse,setPulse]=useState(0);
 const [query,setQuery]=useState('');
 const [coverageWarning,setCoverageWarning]=useState('');
 useEffect(()=>{
  if(!db)return;
  let active=true;
  void (async()=>{
   const collected:CommunityCourtLead[]=[];
   for(let from=0;from<5500;from+=500){
    const {data,error}=await db.from('basketball_locations')
      .select('slug,name,locality,latitude,longitude')
      .eq('is_active',true).eq('verification_status','community')
      .not('latitude','is',null).not('longitude','is',null)
      .order('slug').range(from,from+499);
    if(error||!active)return;
    collected.push(...((data||[]) as CommunityCourtLead[]));
    if((data||[]).length<500)break;
   }
   if(active)setCommunityLeads(collected);
  })();
  return()=>{active=false;};
 },[db]);
 const city=runsAreaOptions.find(c=>c.id===cityId)||null;
 const refresh=()=>setPulse(n=>n+1);

 useEffect(()=>{setCityId(location.cityId||null);},[location.cityId]);
 const enterCity=useCallback((next:VirginiaCity)=>{
   setCityId(next.id);if(!parksRecAreas.some(area=>area.id===next.id))chooseCity(next.id);setSelectedSlug(null);
   setScreen('world');
 },[chooseCity]);
 const exitCity=useCallback(()=>{
   setCityId(null);statewide();setSelectedSlug(null);
 },[statewide]);

 useEffect(()=>{
  if(!db){setWarning('The basketball world cannot connect to RCH right now.');return;}
  let alive=true;
  const work=async()=>{
   setLoading(true);setWarning('');setCoverageWarning('');
   setCourts([]);setRuns([]);setFeatured([]);setTerritories([]);setWorldPulse([]);setSelectedSlug(null);
   if(!city){setLoading(false);return;}
   try{
    const [courtResult,runResult,featuredResult]=await Promise.all([
     db.from('basketball_locations')
      .select('slug,name,address,locality,latitude,longitude,verification_status,access_type,venue_type,source_label,source_url,hours_text')
      .eq('is_active',true).in('locality',localityNames(city))
      .in('verification_status',['official','provider'])
      .in('venue_type',['outdoor','indoor','mixed'])
      .order('name').range(0,299),
     readPagedUpcomingRuns<WorldRun>((from,to)=>db.from('runs')
      .select('id,title,location,location_slug,starts_at,status,game_format,run_type')
      .in('status',['open','full']).gte('starts_at',new Date().toISOString())
      .order('starts_at',{ascending:true}).range(from,to),200,2000),
     db.from('rch_weekend_circuit_events')
      .select('run_id').eq('city',city.name)
      .eq('bonus_enabled',true).gte('starts_at',new Date().toISOString()).limit(150)
    ]);
    if(!alive)return;
    if(courtResult.error)throw courtResult.error;
    if(runResult.error)throw runResult.error;
    const nextCourts=((courtResult.data||[]) as WorldCourt[]).filter(verifiedParksRecFacility);
    setCourts(nextCourts);
    const citySlugs=new Set(nextCourts.map(c=>c.slug));
    // Filter Runs by their canonical court relationship, not a fragile city
    // substring, which can include a neighboring county or exclude postal aliases.
    const cityRuns=((runResult.data||[]) as WorldRun[]).filter(r=>matchesRunToCourts(r,citySlugs));
    setRuns(cityRuns);
    if(nextCourts.some(c=>c.latitude===null||c.longitude===null))
     setCoverageWarning('Official Parks & Recreation basketball facilities are listed, but some lack facility-verified coordinates. Their source records remain searchable; no guessed precision pins are shown.');
    setFeatured(((featuredResult.data||[]) as {run_id:string}[]).map(r=>r.run_id));
    if(runResult.error||featuredResult.error)setWarning('Some scheduled games could not be loaded. Browse the Runs list to see more.');
    if((courtResult.data||[]).length===300||runResult.truncated)
      setWarning('Parks & Recreation display is capped at 300 sourced facilities and the Run lookup at 2,000 statewide. Additional results may exist.');
    const slugs=nextCourts.map(c=>c.slug);
    // Only actual confirmed title history and genuine requested/accepted
    // crew challenges contribute to the cinematic local world pulse.
    if(slugs.length){
     const [crowns,battles]=await Promise.all([
      db.from('rch_court_master_history')
       .select('id,court_slug,division,event_type,occurred_at')
       .in('court_slug',slugs.slice(0,300))
       .order('occurred_at',{ascending:false}).limit(15),
      db.from('rch_court_takeovers')
       .select('id,court_slug,status,created_at')
       .in('court_slug',slugs.slice(0,300))
       .in('status',['requested','accepted','resolved'])
       .order('created_at',{ascending:false}).limit(20)
     ]);
     if(!alive)return;
     const nameFor=(slug:string)=>nextCourts.find(c=>c.slug===slug)?.name||'Virginia court';
     const history=((crowns.data||[]) as {id:string;court_slug:string;division:string;event_type:string;occurred_at:string}[]).map(c=>({
      id:'crown:'+c.id,court_slug:c.court_slug,
      title:(c.event_type==='title_takeover'?'New Court Master':'Crown Defended')+' · '+nameFor(c.court_slug),
      detail:c.division.toUpperCase()+' Master title · independently confirmed',
      status:'verified' as const,at:c.occurred_at
     }));
     const challenges=((battles.data||[]) as {id:string;court_slug:string;status:string;created_at:string}[]).map(c=>({
      id:'takeover:'+c.id,court_slug:c.court_slug,
      title:(c.status==='resolved'?'Crew Takeover Resolved':'Crew Challenge '+(c.status==='accepted'?'Accepted':'Requested'))+' · '+nameFor(c.court_slug),
      detail:c.status==='resolved'?'Verified challenge resolved; review court for the winner.':'An actual crew challenge exists; no result has been declared.',
      status:c.status==='resolved'?'verified' as const:'pending' as const,at:c.created_at
     }));
     if(alive)setWorldPulse([...history,...challenges].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,12));
    }
    if(slugs.length){
     const {data:territoryRows,error:territoryError}=await db.from('rch_court_territories')
       .select('court_slug,crew_id,successful_defenses').in('court_slug',slugs.slice(0,300)).limit(300);
     if(!alive)return;
     if(!territoryError){
      const entries=(territoryRows||[]) as Territory[];
      setTerritories(entries);
      const crewIds=[...new Set(entries.map(t=>t.crew_id))];
      if(crewIds.length){
       const {data:crews}=await db.from('commonwealth_crews').select('id,name').in('id',crewIds.slice(0,120));
       if(alive)setCrewNames(Object.fromEntries(((crews||[]) as {id:string;name:string}[]).map(c=>[c.id,c.name])));
      }
     }
    }
   }catch{
    if(alive)setWarning('Local court records are temporarily unavailable. Try another city or open the Runs list.');
   }finally{if(alive)setLoading(false);}
  };
  void work();
  return()=>{alive=false;};
 },[db,city?.id,pulse]);

 useEffect(()=>{
  if(!db||!user?.id){setPlayer(blankStats);return;}
  let active=true;
  void (async()=>{
   const [passport,wallet,level]=await Promise.all([
    db.rpc('get_rch_run_passport'),
    db.from('rch_rep_wallets').select('balance').eq('profile_id',user.id).maybeSingle(),
    db.from('user_levels').select('xp,level').eq('profile_id',user.id).maybeSingle()
   ]);
   if(!active)return;
   setPlayer({
    passport:passport.error?null:(passport.data as Passport|null),
    repBalance:wallet.error?null:Number(wallet.data?.balance??0),
    socialLevel:level.error?null:Number(level.data?.level??1),
    socialXp:level.error?null:Number(level.data?.xp??0),
   });
  })();
  return()=>{active=false;};
 },[db,user?.id,pulse]);

 useEffect(()=>{
  if(!db||!user?.id){setJourney(null);setJourneyLoading(false);return;}
  let active=true;setJourneyLoading(true);
  void db.rpc('get_rch_world_journey').then(({data,error}:{data:WorldJourney|null;error:{message:string}|null})=>{
   if(!active)return;
   if(error)setWarning('World Journal could not sync. Verified games are still accessible through your Run Passport.');
   setJourney(!error&&data?.signed_in?data:null);setJourneyLoading(false);
  });
  return()=>{active=false;};
 },[db,user?.id,pulse,scoutVersion]);

 useEffect(()=>{
  if(!db||!user?.id){setIdentity(null);return;}
  let active=true;
  void db.from('profiles').select('display_name,username,avatar_url').eq('id',user.id).maybeSingle()
    .then(({data}:{data:{display_name:string|null;username:string|null;avatar_url:string|null}|null})=>{if(active)setIdentity(data||null);});
  return()=>{active=false;};
 },[db,user?.id]);

 const selectedCourt=courts.find(c=>c.slug===selectedSlug)||null;
 useEffect(()=>{
  if(!db||!selectedSlug){setCourtStats({masters:[],crewName:null,defenses:0,loading:false});return;}
  let alive=true;
  setCourtStats({masters:[],crewName:null,defenses:0,loading:true});
  void (async()=>{
   const [masterResult,crewResult]=await Promise.all([
    db.rpc('get_rch_court_masters',{p_court:selectedSlug}),
    db.rpc('get_rch_court_crew_standings',{p_court:selectedSlug})
   ]);
   if(!alive)return;
   const controller=((crewResult.data||[]) as {crew_name:string;is_controller:boolean}[]).find(c=>c.is_controller);
   const territory=territories.find(t=>t.court_slug===selectedSlug);
   setCourtStats({
    masters:masterResult.error?[]:(masterResult.data||[]) as Master[],
    crewName:controller?.crew_name||(territory?crewNames[territory.crew_id]:null)||null,
    defenses:territory?.successful_defenses||0,
    loading:false
   });
  })();
  return()=>{alive=false;};
 },[db,selectedSlug,territories,crewNames]);

 const battleCourtSlugs=useMemo(()=>courts.map(c=>c.slug),[courts]);
 const pins=useMemo(()=>buildCourtMapPins(courts,runs,{
  ownedCourts:territories.map(t=>t.court_slug),
  challengedCourts:worldPulse.filter(e=>e.status==='pending').map(e=>e.court_slug),
  doubleRepRuns:featured
 }),[courts,runs,territories,worldPulse,featured]);
 const coverage=useMemo(()=>courtCoverage(courts,runs,pins),[courts,runs,pins]);
 const featuredSet=useMemo(()=>new Set(featured),[featured]);
 const areaRuns=useMemo(()=>[...runs].sort((a,b)=>a.starts_at.localeCompare(b.starts_at)),[runs]);
 const courtRuns=areaRuns.filter(r=>r.location_slug===selectedSlug);
 const visibleCourts=courts.filter(c=>{
  const search=query.trim().toLowerCase();
  return !search||(c.name+' '+c.address).toLowerCase().includes(search);
 });
 const chooseCourt=(slug:string)=>{
   setSelectedSlug(slug);
   window.requestAnimationFrame(()=>document.getElementById('rch-run-world-court')?.scrollIntoView({behavior:'smooth',block:'nearest'}));
 };

 return <main className="rwg-shell min-h-screen pb-28 text-white" aria-label="RCH Runs World game">
  <div className="rwg-frame">
   <header className="rwg-header">
    <div><span className="rwg-kicker"><FaBolt/> RCH RUNS WORLD / SEASON ZERO</span>
     <h1>THE CITY <span>IS THE GAME.</span></h1>
     <p>Explore real courts. Challenge verified contenders. Build your basketball legacy.</p>
    </div>
    <div className="rwg-top-actions">
     <WorldPlayerIdentity avatar={identity?.avatar_url||null}
       name={identity?.display_name||identity?.username||(user?'RCH Hooper':'Join RCH')}
       level={journey?.world_level??null} onOpen={()=>setScreen('player')}/>
     <Link href="/runs?view=list#rch-upcoming-runs" className="rwg-soft">List view <FaArrowRight/></Link>
     <button type="button" onClick={refresh} className="rwg-soft" aria-label="Refresh Runs World"><FaArrowRotateRight/></button>
    </div>
   </header>

   <nav className="rwg-nav" aria-label="Runs World gameplay modes">
    {nav.map(item=><button type="button" key={item.id} aria-pressed={screen===item.id} onClick={()=>setScreen(item.id)} className={screen===item.id?'active':''}>
     <item.icon aria-hidden="true"/><span>{item.title}</span>
    </button>)}
   </nav>

   {screen==='world'&&<>
    <div className="rwg-hud" aria-label="Your game-world overview">
     <div><small>WORLD</small><strong>{city?.name||'VIRGINIA'}</strong></div>
     <div><small>PARKS & REC COURTS</small><strong>{loading?'…':coverage.total}</strong></div>
     <div><small>PRECISE PINS</small><strong>{loading?'…':coverage.mapped}</strong></div>
     <div><small>{city?'UPCOMING RUNS':'COMMUNITY LEADS'}</small><strong>{city?(loading?'…':coverage.scheduled):communityLeads.length.toLocaleString()}</strong></div>
    </div>
    <section className="rwg-world" aria-label="Explore Virginia basketball courts">
     <div className="rwg-area-controls">
      <div><h2><FaLocationDot/> {city?'Exploring '+city.name:'Choose a city portal'}</h2><p>Enter a basketball area, then tap a real court to inspect its Arena.</p></div>
      <div className="rwg-city-actions">
       <label className="sr-only" htmlFor="rwg-city">Virginia city</label>
       <select id="rwg-city" value={city?.id||''} onChange={e=>{const match=runsAreaOptions.find(c=>c.id===e.target.value);if(match)enterCity(match);else exitCity();}}>
        <option value="">All Virginia</option>{runsAreaOptions.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
       </select>
       {city&&<button type="button" className="rwg-soft" onClick={exitCity}>Statewide</button>}
      </div>
     </div>
     <div className="rwg-map-stage">
      <AccurateVirginiaMap city={city} points={pins} leads={communityLeads} areaGateways={runsAreaOptions} selectedId={selectedSlug&&pins.some(p=>p.id==='court:'+selectedSlug)?'court:'+selectedSlug:null}
       onCitySelect={enterCity} onPlaceSelect={id=>chooseCourt(id.replace(/^court:/,''))} onOverview={exitCity}/>
     </div>
     <p className="rwg-disclosure"><FaShieldHalved/> Real roads and waterways use OpenStreetMap vector data and official 2026 Census boundaries. Bright arena pins represent officially sourced Parks & Recreation basketball courts and gyms with coordinates on file. Indoor gym hours and permitted basketball use must be checked. Gray dots are unverified community tips, not approved courts. No location permission required. GPS is optional.</p>
    </section>

    {!city?<section className="rwg-portals" aria-labelledby="rwg-portals-head">
      <h2 id="rwg-portals-head">Choose your territory</h2>
      <div className="rwg-portal-grid">{cityTabs.map(c=><button key={c.id} type="button" onClick={()=>enterCity(c)} className="rwg-portal">
        <span className="rwg-symbol" aria-hidden="true">{c.symbol}</span><span><strong>{c.name}</strong><small>ENTER CITY ARENA</small></span><FaArrowRight aria-hidden="true"/>
      </button>)}</div>
     </section>:<>
      <section className="rwg-courts" aria-label={city.name+' Court Arenas'}>
       <div className="rwg-section-head"><div><span className="rwg-kicker">THE COURT NETWORK</span><h2>{city.name} Arenas</h2></div>
        <input aria-label="Search courts in selected city" type="search" placeholder="Find a court…" value={query} onChange={e=>setQuery(e.target.value)}/>
       </div>
       {loading&&<p className="rwg-empty" role="status">Loading official court records and upcoming Runs…</p>}
       {warning&&<p className="rwg-warning" role="status">{warning}</p>}
       {coverageWarning&&<div className="rwg-geography-notice" role="status"><FaLocationDot/>{coverageWarning}</div>}
       <div className="rwg-coverage" aria-label="Geographic coverage from this court dataset">
        <div><strong>{loading?'…':coverage.total}</strong><small>Parks & Rec facilities</small></div>
        <div><strong>{loading?'…':coverage.mapped}</strong><small>Mapped facilities</small></div>
        <div><strong>{loading?'…':coverage.needsCoordinates}</strong><small>Need pin verification</small></div>
        <div><strong>{loading?'…':coverage.scheduled}</strong><small>Linked upcoming Runs</small></div>
       </div>
       {!loading&&visibleCourts.length===0&&<p className="rwg-empty">No officially sourced Parks & Recreation basketball facilities are listed here yet. Try another city or explore the full Runs list.</p>}
       <div className="rwg-court-grid">
        {visibleCourts.slice(0,80).map(c=>{
         const ownership=territories.find(t=>t.court_slug===c.slug);
         const count=areaRuns.filter(r=>r.location_slug===c.slug).length;
         const mapped=pins.some(p=>p.id==='court:'+c.slug);
         return <button key={c.slug} type="button" onClick={()=>chooseCourt(c.slug)} aria-pressed={selectedSlug===c.slug} className={'rwg-court '+(selectedSlug===c.slug?'selected':'')}>
          <span className="rwg-court-icon">{ownership?<FaCrown/>:count?<FaBolt/>:<FaBasketball/>}</span>
          <span className="rwg-court-copy"><strong>{c.name}</strong><small>{c.venue_type==='indoor'?'Indoor gym':c.venue_type==='mixed'?'Recreation center':'Outdoor court'} · {count?count+' scheduled Run'+(count===1?'':'s'):c.access_type==='public'&&c.venue_type==='outdoor'?'Check park hours':'Check gym access / schedule'} · {mapped?'Coordinates on file':'Pin needs review'}</small></span>
          <FaArrowRight className="rwg-court-arrow"/>
         </button>;
        })}
       </div>
       {visibleCourts.length>80&&<p className="rwg-disclosure">Displaying the first 80 court cards. Refine your search to locate a court.</p>}
      </section>
      {selectedCourt&&<section className="rwg-arena" id="rch-run-world-court" aria-label={selectedCourt.name+' Court Arena'}>
        <div className="rwg-arena-top"><div><span className="rwg-kicker"><FaCrown/> COURT ARENA / {city.name.toUpperCase()}</span>
          <h2>{selectedCourt.name}</h2><p>{selectedCourt.address} · Parks & Rec verified · {selectedCourt.venue_type==='outdoor'?'Outdoor courts':selectedCourt.venue_type==='indoor'?'Indoor gym':'Recreation center / mixed'} · {selectedCourt.access_type==='public'&&selectedCourt.venue_type==='outdoor'?'Check park hours':'Indoor access or reservations may be required'} · {pins.some(p=>p.id==='court:'+selectedCourt.slug)?'Coordinate on file':'Precise court coordinates not yet verified'}</p></div>
         <span className="rwg-arena-shield"><FaShieldHalved/></span>
        </div>
        <div className="rwg-master-grid">{(['1v1','2v2','3v3'] as const).map(format=>{
         const master=courtStats.masters.find(m=>m.division===format&&m.is_master);
         return <div key={format}><span><FaCrown/> {format} MASTER</span>
          <strong>{courtStats.loading?'Checking…':master?.player_name||'Title unclaimed'}</strong>
          <small>{master?'Verified contender · '+master.wins+' wins':'Verified results required'}</small>
         </div>;
        })}</div>
        <div className="rwg-territory"><div><span className="rwg-kicker">CONTROLLING CREW</span>
           <h3>{courtStats.crewName||'Unclaimed territory'}</h3>
           <p>{courtStats.crewName?courtStats.defenses+' recorded title defenses':'Only verified play can establish control.'}</p></div><FaPeopleGroup/></div>
        <div className="rwg-arena-events"><h3>Next Runs at this court</h3>
         {courtRuns.length?courtRuns.slice(0,4).map(r=><Link href={'/runs/'+encodeURIComponent(r.id)} key={r.id}>
          <span><strong>{r.title}</strong><small>{shortWhen(r.starts_at)} · {r.game_format} {featuredSet.has(r.id)?'· 2× verified REP':''}</small></span><FaArrowRight/>
         </Link>):<p>No upcoming Run is listed at this court. A public park listing does not guarantee a game.</p>}
        </div>
        <div className="rwg-arena-actions">
         <Link href={'/runs/courts/'+encodeURIComponent(selectedCourt.slug)} className="rwg-primary">Open full Court Arena <FaArrowRight/></Link>
         <button type="button" onClick={()=>setScreen('battle')} className="rwg-secondary">Court Battles <FaBolt/></button>
         <Link href={'/runs?create=1&court='+encodeURIComponent(selectedCourt.slug)} className="rwg-secondary">Organize a Run</Link>
         {selectedCourt.source_url&&<a href={selectedCourt.source_url} rel="noopener noreferrer" target="_blank" className="rwg-secondary">Court source ↗</a>}
        </div>
        <WorldScoutButton key={selectedCourt.slug} courtSlug={selectedCourt.slug} loggedIn={Boolean(user)}
          scouted={Boolean(journey?.stamps.some(stamp=>stamp.court_slug===selectedCourt.slug))}
          onScout={()=>setScoutVersion(n=>n+1)}/>
        <p className="rwg-disclosure">Crews, court titles, and REP require verified results. A verified Parks & Rec location does not mean basketball is currently available, that a gym is open for pickup, or that a court has been reserved. This site is not reserved by RCH. Confirm facility rules and hours first.</p>
       </section>}
      <WorldPulse events={worldPulse} onCourt={chooseCourt}/>
      <section className="rwg-activity" aria-label="Upcoming games in the selected city">
       <div className="rwg-section-head"><div><span className="rwg-kicker">THE NEXT CHALLENGE</span><h2>Scheduled Runs</h2></div><Link href="/runs?view=list#rch-upcoming-runs">All Runs <FaArrowRight/></Link></div>
       {areaRuns.length?areaRuns.slice(0,12).map(run=><Link href={'/runs/'+run.id} key={run.id} className="rwg-run-row">
         <span className="rwg-run-basket"><FaBasketball/></span><span><strong>{run.title}</strong><small>{shortWhen(run.starts_at)} · {run.game_format} · {run.status==='full'?'Full':'Scheduled'}</small></span>
         {featuredSet.has(run.id)&&<b>2× VERIFIED REP</b>}<FaArrowRight/></Link>):<p className="rwg-empty">No upcoming games listed here. Create one or explore another city.</p>}
      </section>
     </>}
   </>}

   {screen==='battle'&&<section className="rwg-mode" aria-label="Battle arena">
     <span className="rwg-kicker">COMPETITIVE MODE / REAL-WORLD MATCHES</span><h2>Take the court. Defend the crown.</h2>
     <p>Battle for local Master titles and crew control through verified competitive games. Challenges and titles are recorded by the existing Court Dominion system.</p>
     <div className="rwg-mode-links"><Link href="/crews?intent=mine" className="rwg-primary">My Crew <FaArrowRight/></Link><Link href="/commonwealth" className="rwg-secondary">Commonwealth Cup</Link></div>
     <WorldBattleScene cityName={city?.name||null} courtSlugs={battleCourtSlugs}
       onSelectCourt={slug=>{setScreen('world');chooseCourt(slug);}}/>
     <CourtDominion initialCourt={selectedSlug||''} showTakeovers/>
    </section>}

   {screen==='missions'&&<section className="rwg-mode" aria-label="Player missions">
     <span className="rwg-kicker">YOUR WEEKLY PLAYBOOK / REAL ACTIONS</span><h2>The journey is the reward.</h2>
     <p>Earn progress through discovering courts, joining scheduled games and proving performance. These guide existing basketball activity and do not mint bonus REP for clicks or attendance.</p>
     <WorldJourneyPanel journey={journey} loading={journeyLoading} mode="missions"/>
    </section>}

   {screen==='vault'&&<section className="rwg-mode" aria-label="Basketball achievement vault">
      <span className="rwg-kicker">THE TROPHY VAULT</span><h2>Everything you earned stays yours.</h2>
      <p>Your skill rating, court achievements and competitive history are separate from spendable REP. Money cannot purchase a verified win, Master title or badge.</p>
      <WorldJourneyPanel journey={journey} loading={journeyLoading} mode="vault"/>
      <RunPassport/>
      <div className="rwg-mode-links"><Link className="rwg-primary" href="/badges">Explore Badges <FaMedal/></Link><Link className="rwg-secondary" href="/rep">REP Exchange <FaGift/></Link></div>
    </section>}

   {screen==='player'&&<section className="rwg-mode" aria-label="My player identity">
      <span className="rwg-kicker">YOUR BASKETBALL CAREER</span><h2>My Player.</h2>
      {!user?<div className="rwg-empty"><p>Create a free RCH account to build a real basketball legacy.</p>
       <Link className="rwg-primary" href="/auth/sign-up">Create my player <FaArrowRight/></Link></div>:<>
       <div className="rwg-player-stats">
        <div><small>SOCIAL LEVEL</small><strong>{player.socialLevel??'—'}</strong><span>{player.socialXp===null?'Unavailable':player.socialXp+' social XP'}</span></div>
        <div><small>SPENDABLE REP</small><strong>{player.repBalance??'—'}</strong><span>Earned through eligible activities</span></div>
        <div><small>VERIFIED GAMES</small><strong>{player.passport?.verified_games??'—'}</strong><span>Competitive history</span></div>
        <div><small>RUN BADGES</small><strong>{player.passport?.badges?.length??'—'}</strong><span>Confirmed achievements</span></div>
       </div>

       {player.passport?.last_results?.length?(()=>{
        const result=player.passport!.last_results[0];
        const ratingChanged=typeof result.rating_after==='number'&&typeof result.rating_before==='number';
        return <section className="rwg-match-reveal" aria-label="Your most recent verified match">
         <span className="rwg-kicker"><FaTrophy/> VERIFIED MATCH RECEIPT</span>
         <h3>{result.court_name||'Competitive match'}</h3>
         <p>{result.game_format||'Basketball'} · {shortWhen(result.verified_at)}{typeof result.won==='boolean'?(result.won?' · Verified win':' · Verified loss'):''}</p>
         {ratingChanged&&<div className="rwg-rating-shift"><span>BEFORE <strong>{result.rating_before}</strong></span>
           <FaArrowRight/><span>AFTER <strong>{result.rating_after}</strong></span>
           <b>{(result.rating_after!-result.rating_before!)>=0?'+':''}{result.rating_after!-result.rating_before!} rating</b>
         </div>}
         <small>This comes from your confirmed match history, not a simulated game.</small>
        </section>;
       })():null}
       <WorldJourneyPanel journey={journey} loading={journeyLoading} mode="player"/>
       <p className="rwg-disclosure">Social XP, spendable REP, competitive skill rating and awards are distinct. No invented gameplay levels or pay-to-win advantages.</p>
       <div className="rwg-mode-links"><Link className="rwg-primary" href="/profile">View Profile <FaArrowRight/></Link><Link className="rwg-secondary" href="/crews?intent=mine">My Crew</Link><Link className="rwg-secondary" href="/rep">REP Exchange</Link></div>
      </>}
      <GravityLocationPicker compact/>
    </section>}
  </div>
 </main>;
}
