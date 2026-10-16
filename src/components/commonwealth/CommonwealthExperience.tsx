'use client';

import Link from 'next/link';
import { FormEvent,useCallback,useEffect,useMemo,useState } from 'react';
import {
  FaArrowRight,FaBasketball,FaBolt,FaCalendarDays,FaCheck,FaChevronLeft,
  FaCircleCheck,FaClock,FaCrown,FaFlag,FaLocationDot,FaMapLocationDot,
  FaPeopleGroup,FaPlus,FaShieldHalved,FaSitemap,FaTrophy,FaTv,FaUserPlus,
  FaVideo,FaXmark
} from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { VIRGINIA_CITIES } from '@/lib/virginia-world';
import { COMMONWEALTH_SEASON_SLUG,competitionRecord,formatCompetitionDate,pilotRadarXY,
  stateRadarXY,type CommonwealthSite,type CommonwealthStanding,type CommonwealthFormat } from '@/lib/commonwealth';
import { CommonwealthCupPath,type CupGroupStanding } from './CommonwealthCupPath';
import './commonwealth.css';

type Season={id:string;name:string;region:string;status:string};
type Crew={id:string;season_id:string;name:string;motto:string;captain_id:string;city:string;home_court_slug:string;created_at:string;logo_path:string|null};
type Member={crew_id:string;season_id:string;profile_id:string;role:string;joined_at:string};
type Request={id:string;crew_id:string;profile_id:string;status:string;created_at:string;display_name?:string};
type Challenge={
  id:string;season_id:string;challenger_id:string;defender_id:string;court_slug:string;scheduled_at:string;
  format:CommonwealthFormat;status:string;run_id:string|null;challenger_score:number|null;defender_score:number|null;
  created_at:string;submitted_by:string|null;cup_stage?:string;cup_group?:string|null
};
type RunOption={id:string;title:string;location_slug:string|null;starts_at:string;run_type:string;status:string};
type RadarMode='state'|'pilot';
const cityPins=['richmond','petersburg','fredericksburg','charlottesville','roanoke','norfolk','virginia-beach','alexandria'];
const foundingCourtSlugs=['pine-camp','battery-park','chimborazo','broad-rock-sports','randolph'];

export default function CommonwealthExperience(){
  const {user,profile,loading:authLoading}=useAuth();
  const db=useMemo(()=>getSupabaseClient(true) as any,[]);
  const [season,setSeason]=useState<Season|null>(null);
  const [sites,setSites]=useState<CommonwealthSite[]>([]);
  const [crews,setCrews]=useState<Crew[]>([]);
  const [members,setMembers]=useState<Member[]>([]);
  const [standings,setStandings]=useState<CommonwealthStanding[]>([]);
  const [cupGroups,setCupGroups]=useState<CupGroupStanding[]>([]);
  const [requests,setRequests]=useState<Request[]>([]);
  const [challenges,setChallenges]=useState<Challenge[]>([]);
  const [runs,setRuns]=useState<RunOption[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [version,setVersion]=useState(0);
  const [radarMode,setRadarMode]=useState<RadarMode>('state');
  const [selectedCourt,setSelectedCourt]=useState('');
  const [foundingOpen,setFoundingOpen]=useState(false);
  const [crewName,setCrewName]=useState('');
  const [motto,setMotto]=useState('');
  const [courtChoice,setCourtChoice]=useState('');
  const [opponent,setOpponent]=useState('');
  const [challengeCourt,setChallengeCourt]=useState('');
  const [scheduled,setScheduled]=useState('');
  const [gameFormat,setGameFormat]=useState<CommonwealthFormat>('3v3');
  const [resultInputs,setResultInputs]=useState<Record<string,{a:string;b:string}>>({});
  const [runChoices,setRunChoices]=useState<Record<string,string>>({});
  const [cupSeed,setCupSeed]=useState({group:'A',slot:'1',crew:''});
  const [cupFixture,setCupFixture]=useState({challenger:'',defender:'',court:'',start:'',format:'5v5',stage:'group',group:'A'});

  const reload=useCallback(()=>setVersion(value=>value+1),[]);
  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      if(!db){setError('RCH competition services are unavailable.');setLoading(false);return;}
      setLoading(true);setError('');
      const seasonResult=await db.from('commonwealth_seasons').select('id,name,region,status')
        .eq('slug',COMMONWEALTH_SEASON_SLUG).maybeSingle();
      if(cancelled)return;
      if(seasonResult.error){setError('Competition data is not ready. Please check again soon.');setLoading(false);return;}
      const active=seasonResult.data as Season|null;
      setSeason(active);
      if(!active){setLoading(false);return;}
      const [siteRefs,crewRows,membersRows,rankingRows,challengeRows,runRows,cupGroupRows]=await Promise.all([
        db.from('commonwealth_sites').select('court_slug').eq('season_id',active.id),
        db.from('commonwealth_crews').select('id,season_id,name,motto,captain_id,city,home_court_slug,created_at,logo_path')
          .eq('season_id',active.id).order('created_at',{ascending:true}).limit(250),
        user?db.from('commonwealth_crew_members').select('crew_id,season_id,profile_id,role,joined_at')
          .eq('season_id',active.id).limit(3000):Promise.resolve({data:[]}),
        db.from('commonwealth_standings').select('id,season_id,name,city,home_court_slug,created_at,games,wins,losses,points,points_for,points_against')
          .eq('season_id',active.id).order('points',{ascending:false}).order('wins',{ascending:false}).limit(250),
        db.from('commonwealth_challenges').select('id,season_id,challenger_id,defender_id,court_slug,scheduled_at,format,status,run_id,challenger_score,defender_score,created_at,submitted_by,cup_stage,cup_group')
          .eq('season_id',active.id).order('created_at',{ascending:false}).limit(120),
        user?db.from('runs').select('id,title,location_slug,starts_at,run_type,status')
          .eq('host_id',user.id).eq('run_type','competitive').in('status',['open','full','completed'])
          .order('starts_at',{ascending:false}).limit(50):Promise.resolve({data:[]}),
        db.from('commonwealth_cup_group_standings').select('season_id,group_code,slot,crew_id,name,city,games,wins,losses,points,points_for,points_against')
          .eq('season_id',active.id).limit(32)
      ]);
      if(cancelled)return;
      const courtSlugs=(siteRefs.data??[]).map((s:any)=>s.court_slug as string);
      const allSiteRows=courtSlugs.length
        ? await db.from('basketball_locations').select('slug,name,locality,latitude,longitude,address,access_type')
          .in('slug',courtSlugs).eq('is_active',true)
        : {data:[]};
      const teamRows=(crewRows.data??[]) as Crew[];
      const joinRows=user?await db.from('commonwealth_join_requests')
        .select('id,crew_id,profile_id,status,created_at').in('crew_id',teamRows.length?teamRows.map(c=>c.id):['00000000-0000-0000-0000-000000000000'])
        .order('created_at',{ascending:false}).limit(150):{data:[]};
      if(cancelled)return;
      let requestRows:Request[]=joinRows.data??[];
      if(requestRows.length){
        const ids=[...new Set(requestRows.map(r=>r.profile_id))];
        const people=await db.from('profiles').select('id,display_name,username').in('id',ids).limit(150);
        const names=new Map<string,string>((people.data??[]).map((p:any)=>[p.id,p.display_name||p.username||'RCH Member']));
        requestRows=requestRows.map(req=>({...req,display_name:names.get(req.profile_id)||'RCH Member'}));
      }
      if(cancelled)return;
      setSites(((allSiteRows.data??[]) as CommonwealthSite[]).filter(s=>Number.isFinite(s.latitude)&&Number.isFinite(s.longitude))
        .sort((a,b)=>foundingCourtSlugs.indexOf(a.slug)-foundingCourtSlugs.indexOf(b.slug)));
      setCrews(teamRows);
      setMembers(membersRows.data??[]);
      setStandings((rankingRows.data??[]) as CommonwealthStanding[]);
      setCupGroups((cupGroupRows.data??[]) as CupGroupStanding[]);
      setChallenges((challengeRows.data??[]) as Challenge[]);
      setRequests(requestRows);
      setRuns(runRows.data??[]);
      const firstSlug=((allSiteRows.data??[]) as CommonwealthSite[])[0]?.slug;
      if(firstSlug)setCourtChoice(value=>value||firstSlug);
      setLoading(false);
    };
    void load().catch(()=>{if(!cancelled){setError('The Commonwealth could not be loaded. Try refreshing.');setLoading(false);}});
    return ()=>{cancelled=true;};
  },[db,user?.id,version]);

  const ownMember=members.find(m=>m.profile_id===user?.id);
  const myCrew=crews.find(c=>c.id===ownMember?.crew_id)||null;
  const captainCrew=crews.find(c=>c.captain_id===user?.id)||null;
  const staff=profile?.role==='admin'||profile?.role==='staff';
  const crewById=useMemo(()=>new Map(crews.map(c=>[c.id,c])),[crews]);
  const courtBySlug=useMemo(()=>new Map(sites.map(s=>[s.slug,s])),[sites]);
  const rankById=useMemo(()=>new Map(standings.map(s=>[s.id,s])),[standings]);
  const rosterCount=useMemo(()=>{
    const count=new Map<string,number>();
    members.forEach(m=>count.set(m.crew_id,(count.get(m.crew_id)||0)+1));
    return count;
  },[members]);
  const verified=challenges.filter(c=>c.status==='verified');
  const openChallenges=challenges.filter(c=>['proposed','accepted','review'].includes(c.status));
  const crewTable=[...standings].sort((a,b)=>b.points-a.points || (b.points_for-b.points_against)-(a.points_for-a.points_against) || a.created_at.localeCompare(b.created_at));
  const focusedCrews=selectedCourt?crews.filter(c=>c.home_court_slug===selectedCourt):crews;
  const focusSite=courtBySlug.get(selectedCourt);
  const signIn=()=>window.location.assign('/auth/sign-in?redirect=/commonwealth');

  const rpc=async(action:string,args:Record<string,unknown>,success:string)=>{
    if(!user){signIn();return;}
    if(!db)return;
    setBusy(action);setError('');setNotice('');
    try{
      const {error:requestError}=await db.rpc(action,args);
      if(requestError)throw requestError;
      setNotice(success);reload();
    }catch(e){setError(e instanceof Error?e.message:'The action could not be completed.');}
    finally{setBusy('');}
  };
  const foundCrew=(event:FormEvent)=>{
    event.preventDefault();
    void rpc('commonwealth_found_crew',{p_name:crewName.trim(),p_court_slug:courtChoice,p_motto:motto.trim()},'Your crew is founded. Invite players to request a roster spot.');
  };
  const issueChallenge=(event:FormEvent)=>{
    event.preventDefault();
    const parsed=new Date(scheduled);
    if(Number.isNaN(parsed.getTime())){setError('Choose a valid challenge date and time.');return;}
    void rpc('commonwealth_issue_challenge',{
      p_opponent:opponent,p_court_slug:challengeCourt||sites[0]?.slug,
      p_start:parsed.toISOString(),p_format:gameFormat
    },'Challenge delivered to the opposing captain.');
  };
  const submitScore=(event:FormEvent,challenge:Challenge)=>{
    event.preventDefault();
    const values=resultInputs[challenge.id];
    const a=Number(values?.a),b=Number(values?.b);
    if(!values || values.a===''||values.b===''||!Number.isInteger(a)||!Number.isInteger(b)){setError('Enter both whole-number scores.');return;}
    void rpc('commonwealth_submit_result',{p_challenge:challenge.id,p_home_score:a,p_away_score:b},'Results sent to RCH for independent verification. Standings are unchanged until approved.');
  };
  const seedCup=(event:FormEvent)=>{
    event.preventDefault();
    if(!season)return;
    void rpc('commonwealth_seed_cup_group',{p_season:season.id,p_group:cupSeed.group,p_slot:Number(cupSeed.slot),p_crew:cupSeed.crew},'Official group seed saved.');
  };
  const scheduleCup=(event:FormEvent)=>{
    event.preventDefault();
    if(!season||!cupFixture.start)return;
    const date=new Date(cupFixture.start);
    if(Number.isNaN(date.getTime())){setError('Enter a valid Cup fixture date.');return;}
    void rpc('commonwealth_schedule_cup_fixture',{
      p_season:season.id,p_challenger:cupFixture.challenger,p_defender:cupFixture.defender,
      p_court:cupFixture.court||sites[0]?.slug,p_start:date.toISOString(),p_format:cupFixture.format,
      p_stage:cupFixture.stage,p_group:cupFixture.stage==='group'?cupFixture.group:null
    },'Official Cup fixture scheduled. The captains can attach a real competitive Run.');
  };
  const share=async()=>{
    const url=window.location.origin+'/commonwealth';
    try{
      if(navigator.share)await navigator.share({title:'The Commonwealth · RCH',text:'Represent your court. Build your crew. Play for Virginia.',url});
      else{await navigator.clipboard.writeText(url);setNotice('Invite link copied.');}
    }catch{setNotice('Share canceled.');}
  };
  return <main className="rch-cw">
    <div className="rch-cw-shell">
      <div className="rch-cw-topline"><Link href="/discover"><FaChevronLeft/> Virginia World</Link><span><span className="rch-cw-live-dot"/> FOUNDING SEASON · RICHMOND</span><Link href="/runs">Open Runs <FaArrowRight/></Link></div>

      <header className="rch-cw-hero">
        <div className="rch-cw-hero-copy">
          <span className="rch-cw-eyebrow"><FaTrophy/> THE COMMONWEALTH CUP <span>01 / FOUNDING SEASON</span></span>
          <h1>YOUR COURT.<br/>YOUR CITY.<br/><em>YOUR LEGACY.</em></h1>
          <p>The first Virginia basketball world built by the people who actually play. Form a crew, challenge another court, and make history in verified games.</p>
          <div className="rch-cw-actions">
            {user&&!myCrew?<button className="rch-cw-primary" onClick={()=>setFoundingOpen(value=>!value)}><FaPlus/> Found a crew</button>:
             !user?<button className="rch-cw-primary" onClick={signIn}><FaUserPlus/> Join the founding season</button>:
             <button className="rch-cw-primary" onClick={()=>document.getElementById('rch-cw-my-crew')?.scrollIntoView({behavior:'smooth'})}><FaPeopleGroup/> My crew</button>}
            <button onClick={()=>void share()} className="rch-cw-secondary"><FaArrowRight/> Invite Virginia</button>
          </div>
          <p className="rch-cw-caption"><FaShieldHalved/> Only staff-verified results count. No purchased wins, no fake rankings.</p>
        </div>
        <div className="rch-cw-hero-mark" aria-hidden="true"><span>R</span><b>COMMONWEALTH</b><small>BUILT ON REAL COURTS</small></div>
      </header>

      {error&&<div className="rch-cw-message error" role="alert"><span>{error}</span><button onClick={()=>setError('')} aria-label="Dismiss error"><FaXmark/></button></div>}
      {notice&&<div className="rch-cw-message" role="status"><FaCircleCheck/><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Dismiss"><FaXmark/></button></div>}
      {!season&&!loading&&<section className="rch-cw-panel p-6"><h2>Competition services are being initialized.</h2><p>The Commonwealth world is available once the founding season database is connected.</p></section>}

      <section className="rch-cw-snapshot" aria-label="Founding season facts">
        <div><small>REGISTERED CREWS</small><strong>{crews.length}</strong><span>Real founding crews</span></div>
        <div><small>VERIFIED GAMES</small><strong>{verified.length}</strong><span>Reviewed results only</span></div>
        <div><small>FOUNDING COURTS</small><strong>{sites.length}</strong><span>Mapped pilot sites</span></div>
        <div><small>OPEN CHALLENGES</small><strong>{openChallenges.length}</strong><span>Proposed or in progress</span></div>
      </section>

      <CommonwealthCupPath seasonStatus={season?.status||'enrollment'} qualifiers={standings} groups={cupGroups} challenges={challenges} crews={crews}/>

      <div className="rch-cw-grid">
        <section className="rch-cw-world rch-cw-panel" aria-label="Interactive Commonwealth competition radar">
          <div className="rch-cw-section-top"><div><p className="rch-cw-eyebrow">01 / THE WORLD</p><h2>Virginia is the game board.</h2></div><div className="rch-cw-mode"><button aria-pressed={radarMode==='state'} onClick={()=>setRadarMode('state')}>Virginia</button><button aria-pressed={radarMode==='pilot'} onClick={()=>setRadarMode('pilot')}>Richmond Pilot</button></div></div>
          <div className={'rch-cw-radar '+(radarMode==='pilot'?'pilot':'state')}>
            <div className="rch-cw-radar-grid" aria-hidden="true"/>
            {radarMode==='state'?<>
              <div className="rch-cw-state-image" aria-hidden="true"/>
              {VIRGINIA_CITIES.filter(city=>cityPins.includes(city.id)).map(city=>{
                const pos=stateRadarXY({latitude:city.lat,longitude:city.lon});
                const isPilot=city.id==='richmond';
                return <button key={city.id} type="button" className={'rch-cw-pin '+(isPilot?'active':'inactive')} style={{left:pos.x+'%',top:pos.y+'%'}} onClick={()=>{
                  if(isPilot){setRadarMode('pilot');setSelectedCourt('');}else setNotice(city.name+' is on the statewide expansion map. Founding play is currently in Richmond.');
                }}><i/><b>{city.name}</b>{isPilot&&<small>{crews.length} CREWS</small>}</button>;
              })}
            </>:<>
              <div className="rch-cw-pilot-road one"/><div className="rch-cw-pilot-road two"/>
              {sites.map(site=>{
                const p=pilotRadarXY(site);
                const courtCrews=crews.filter(c=>c.home_court_slug===site.slug);
                const wins=verified.filter(ch=>ch.court_slug===site.slug).length;
                return <button key={site.slug} className={'rch-cw-site-pin '+(selectedCourt===site.slug?'selected':'')} type="button"
                  style={{left:p.x+'%',top:p.y+'%'}} onClick={()=>setSelectedCourt(value=>value===site.slug?'':site.slug)} aria-pressed={selectedCourt===site.slug}>
                  <span><FaBasketball/></span><b>{site.name.replace(' Community Center','').replace(' Arts & Community Center','')}</b><small>{courtCrews.length} CREWS · {wins} FINALS</small>
                </button>;
              })}
            </>}
            <div className="rch-cw-radar-caption"><FaLocationDot/> {radarMode==='state'?'VIRGINIA / EXPANSION VIEW':'RICHMOND / REAL COURT LOCATIONS'} <span>● COMPETITION ACTIVITY</span></div>
          </div>
          <div className="rch-cw-world-footer">
            <p>{radarMode==='state'?'Select Richmond to explore the first competition courts. Other cities light up when official local seasons begin.':focusSite?focusSite.name+' · '+focusSite.locality+', Virginia':'Select a court to see crews and match history. Pins use recorded court coordinates.'}</p>
            <button onClick={()=>{setRadarMode(radarMode==='state'?'pilot':'state');setSelectedCourt('');}}>{radarMode==='state'?'Explore Richmond courts':'State overview'} <FaArrowRight/></button>
          </div>
          <p className="rch-cw-fine-print">Map positions are schematic. These locations are listed courts, not confirmed reservations or promises of public access. Check operating hours and obtain permission before hosting games.</p>
        </section>

        <aside className="rch-cw-right">
          <section className="rch-cw-panel rch-cw-standing">
            <div className="rch-cw-section-top"><div><p className="rch-cw-eyebrow">02 / THE CUP</p><h2>Founding leaderboard</h2></div><FaTrophy/></div>
            <div className="rch-cw-standing-head"><span>CREW</span><span>W–L</span><span>PTS</span></div>
            {crewTable.length?crewTable.slice(0,8).map((crew,index)=><div key={crew.id} className="rch-cw-standing-row">
              <span className="rch-cw-rank">{String(index+1).padStart(2,'0')}</span>
              <span className="rch-cw-standing-identity"><b>{crew.name}</b><small>{crew.city} · {courtBySlug.get(crew.home_court_slug)?.name||'Home court'}</small></span>
              <strong>{competitionRecord(crew)}</strong><b>{crew.points}</b>
            </div>):<div className="rch-cw-empty small"><FaFlag/><strong>The throne is unclaimed.</strong><p>No verified games yet. Founding crews can be first on the board.</p></div>}
            <p className="rch-cw-fine-print">3 points per verified victory. No points from unreviewed or rejected scores.</p>
          </section>
          <section className="rch-cw-panel rch-cw-feature">
            <p className="rch-cw-eyebrow">COMING NEXT / SIGNATURE EVENT</p>
            <h2><FaBolt/> The Commonwealth Hour</h2>
            <p>Coordinated city-versus-city challenges, community watch parties, and broadcast stories—activated after the pilot proves out.</p>
            <div className="rch-cw-feature-links"><Link href="/media"><FaTv/> RCH TV</Link><Link href="/clips"><FaVideo/> RCH Clips</Link></div>
          </section>
        </aside>
      </div>

      {staff&&season&&<section className="rch-cw-panel mb-6 p-5 sm:p-7" aria-labelledby="rch-cup-director-title">
        <div className="rch-cw-section-top"><div><p className="rch-cw-eyebrow">RCH STAFF / TOURNAMENT OPERATIONS</p><h2 id="rch-cup-director-title">Cup Director</h2><p>Only RCH staff can set official group seeds and schedule knockout fixtures. Qualifying challenges remain captain-led.</p></div><FaShieldHalved/></div>
        <div className="grid gap-5 lg:grid-cols-2">
          <form className="rch-cw-form" onSubmit={seedCup}>
            <h3>Official Group Draw</h3><div className="rch-cw-fields">
              <label>Group<select value={cupSeed.group} onChange={e=>setCupSeed(v=>({...v,group:e.target.value}))}>{['A','B','C','D','E','F','G','H'].map(code=><option key={code}>{code}</option>)}</select></label>
              <label>Slot<select value={cupSeed.slot} onChange={e=>setCupSeed(v=>({...v,slot:e.target.value}))}>{['1','2','3','4'].map(value=><option key={value}>{value}</option>)}</select></label>
              <label>Crew<select required value={cupSeed.crew} onChange={e=>setCupSeed(v=>({...v,crew:e.target.value}))}><option value="">Choose crew</option>{crews.map(c=><option key={c.id} value={c.id}>{c.name} · {c.city}</option>)}</select></label>
            </div><p className="rch-cw-fine-print">Four slots per group. Seeding locks once official group or knockout play starts.</p>
            <button disabled={!!busy||!cupSeed.crew} className="rch-cw-primary"><FaFlag/> Seed official group</button>
          </form>
          <form className="rch-cw-form" onSubmit={scheduleCup}>
            <h3>Schedule Sanctioned Fixture</h3><div className="rch-cw-fields">
              <label>Stage<select value={cupFixture.stage} onChange={e=>setCupFixture(v=>({...v,stage:e.target.value}))}>{[['group','Group stage'],['round_of_16','Round of 16'],['quarterfinal','Quarterfinal'],['semifinal','Semifinal'],['final','The Final']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
              {cupFixture.stage==='group'&&<label>Group<select value={cupFixture.group} onChange={e=>setCupFixture(v=>({...v,group:e.target.value}))}>{['A','B','C','D','E','F','G','H'].map(value=><option key={value}>{value}</option>)}</select></label>}
              <label>Challenger<select required value={cupFixture.challenger} onChange={e=>setCupFixture(v=>({...v,challenger:e.target.value}))}><option value="">Select crew</option>{crews.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
              <label>Defender<select required value={cupFixture.defender} onChange={e=>setCupFixture(v=>({...v,defender:e.target.value}))}><option value="">Select opponent</option>{crews.filter(c=>c.id!==cupFixture.challenger).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
              <label>Court<select required value={cupFixture.court} onChange={e=>setCupFixture(v=>({...v,court:e.target.value}))}><option value="">Choose court</option>{sites.map(c=><option value={c.slug} key={c.slug}>{c.name}</option>)}</select></label>
              <label>Game<select value={cupFixture.format} onChange={e=>setCupFixture(v=>({...v,format:e.target.value}))}><option value="5v5">5v5</option><option value="3v3">3v3</option></select></label>
              <label>Scheduled<input required type="datetime-local" value={cupFixture.start} onChange={e=>setCupFixture(v=>({...v,start:e.target.value}))}/></label>
            </div><p className="rch-cw-fine-print">Cup season must be active. Scheduling never fabricates a result. Teams still need a linked Run and independent staff review.</p>
            <button disabled={!!busy||season.status!=='active'||!cupFixture.challenger||!cupFixture.defender||!cupFixture.court||!cupFixture.start} className="rch-cw-primary"><FaCalendarDays/> {season.status!=='active'?'Activate season to schedule':'Schedule Cup fixture'}</button>
          </form>
        </div>
      </section>}

      <section className="rch-cw-panel rch-cw-crew-section" id="rch-cw-my-crew">
        <div className="rch-cw-section-top"><div><p className="rch-cw-eyebrow">03 / REP YOUR BLOCK</p><h2>Crews of the Commonwealth</h2><p>Every crew starts at zero. History is earned on a real court.</p></div>{!myCrew&&user&&<button className="rch-cw-primary compact" onClick={()=>setFoundingOpen(v=>!v)}><FaPlus/> Found a crew</button>}</div>
        {myCrew&&<div className="rch-cw-my-crew"><FaCrown/><div><small>YOU REPRESENT</small><strong>{myCrew.name}</strong><span>{ownMember?.role==='captain'?'Crew captain':'Crew member'} · {courtBySlug.get(myCrew.home_court_slug)?.name||myCrew.city} · {rosterCount.get(myCrew.id)||0}/12 roster spots</span></div><strong className="rch-cw-my-record">{competitionRecord(rankById.get(myCrew.id)||{wins:0,losses:0} as CommonwealthStanding)}</strong></div>}
        {foundingOpen&&!myCrew&&<form className="rch-cw-form" onSubmit={foundCrew}>
          <div className="rch-cw-form-title"><h3>Claim your founding identity</h3><button type="button" onClick={()=>setFoundingOpen(false)} aria-label="Close form"><FaXmark/></button></div>
          <div className="rch-cw-fields"><label>Crew name<input required maxLength={36} minLength={3} value={crewName} onChange={e=>setCrewName(e.target.value)} placeholder="Your crew name"/></label>
            <label>Home court<select required value={courtChoice} onChange={e=>setCourtChoice(e.target.value)}>{sites.map(s=><option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label></div>
          <label>Motto (optional)<input maxLength={160} value={motto} onChange={e=>setMotto(e.target.value)} placeholder="What does your crew stand for?"/></label>
          <p className="rch-cw-fine-print">A founding captain joins the roster automatically. One crew per member per season. Upload your logo and invite players from Crew HQ after creation. Court access must be arranged by participants.</p>
          <button className="rch-cw-primary" disabled={!!busy||!courtChoice}><FaFlag/> {busy?'Creating…':'Create founding crew'}</button>
        </form>}
        <div className="rch-cw-crew-grid">
          {focusedCrews.length?focusedCrews.map(crew=>{
            const standing=rankById.get(crew.id);
            const mine=crew.id===myCrew?.id;
            const asked=requests.some(r=>r.crew_id===crew.id&&r.profile_id===user?.id&&r.status==='pending');
            return <article key={crew.id} className={'rch-cw-crew-card '+(mine?'mine':'')}>
              <div className="rch-cw-crew-symbol">{crew.logo_path?<img src={db.storage.from('rch-crew-logos').getPublicUrl(crew.logo_path).data.publicUrl} alt={crew.name+' logo'} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<FaBasketball/>}</div>
              <div className="rch-cw-crew-top"><small>{courtBySlug.get(crew.home_court_slug)?.name||crew.city}</small>{mine&&<span>YOUR CREW</span>}</div>
              <h3>{crew.name}</h3><p>{crew.motto||'Founding crew · Ready to make history.'}</p><Link href={'/crews?crew='+crew.id} className="rch-cw-small-cta">Crew HQ · logo, invites &amp; top five <FaArrowRight/></Link>
              <div className="rch-cw-crew-stats"><span>{user?(rosterCount.get(crew.id)||0)+' / 12 PLAYERS':'ROSTER · MEMBERS ONLY'}</span><span>{standing?competitionRecord(standing):'0-0'} RECORD</span></div>
              {!myCrew&&user&&<button disabled={!!busy||asked} onClick={()=>void rpc('commonwealth_request_to_join',{p_crew:crew.id},'Roster request sent to the crew captain.')} className="rch-cw-small-cta">{asked?'Request pending':'Request roster spot'} <FaArrowRight/></button>}
              {captainCrew&&crew.id!==captainCrew.id&&<button className="rch-cw-small-cta" onClick={()=>{setOpponent(crew.id);setChallengeCourt(crew.home_court_slug);document.getElementById('rch-cw-challenge-form')?.scrollIntoView({behavior:'smooth'});}}>Challenge this crew <FaArrowRight/></button>}
            </article>;
          }):<div className="rch-cw-empty"><FaPeopleGroup/><strong>{selectedCourt?'No crews claim this court yet.':'The founding roster is open.'}</strong><p>Start the first crew, represent a real Richmond court and invite your people.</p></div>}
        </div>
        {selectedCourt&&<button className="rch-cw-text-link" onClick={()=>setSelectedCourt('')}>Show crews from all pilot courts <FaArrowRight/></button>}
        {captainCrew&&requests.filter(r=>r.crew_id===captainCrew.id&&r.status==='pending').length>0&&
          <div className="rch-cw-inbox"><h3><FaUserPlus/> Captain&apos;s roster requests</h3>
            {requests.filter(r=>r.crew_id===captainCrew.id&&r.status==='pending').map(r=><div key={r.id} className="rch-cw-request-row"><span>{r.display_name}</span><div><button disabled={!!busy} onClick={()=>void rpc('commonwealth_review_join',{p_request:r.id,p_approve:true},'Player added to your crew.')}><FaCheck/> Approve</button><button disabled={!!busy} onClick={()=>void rpc('commonwealth_review_join',{p_request:r.id,p_approve:false},'Roster request declined.')}><FaXmark/> Decline</button></div></div>)}
          </div>}
      </section>

      <section className="rch-cw-panel rch-cw-challenges">
        <div className="rch-cw-section-top"><div><p className="rch-cw-eyebrow">04 / MATCH CONTROL</p><h2>Challenge the Commonwealth.</h2><p>Crews organize the games. RCH independently reviews the outcome.</p></div><FaSitemap/></div>
        {captainCrew&&crews.length>1&&<form className="rch-cw-form" id="rch-cw-challenge-form" onSubmit={issueChallenge}>
          <h3><FaBolt/> Issue a challenge</h3>
          <div className="rch-cw-fields">
            <label>Opponent<select required value={opponent} onChange={e=>setOpponent(e.target.value)}><option value="">Select another crew</option>{crews.filter(c=>c.id!==captainCrew.id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Court<select required value={challengeCourt} onChange={e=>setChallengeCourt(e.target.value)}><option value="">Select pilot court</option>{sites.map(s=><option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label>
            <label>Proposed date and time<input required type="datetime-local" value={scheduled} onChange={e=>setScheduled(e.target.value)}/></label>
            <label>Format<select value={gameFormat} onChange={e=>setGameFormat(e.target.value as CommonwealthFormat)}><option value="3v3">3v3</option><option value="5v5">5v5</option></select></label>
          </div>
          <p className="rch-cw-fine-print">You must coordinate permission and court availability independently. Games require full rosters, a connected competitive Run and staff verification before counting.</p>
          <button disabled={!!busy||!opponent||!challengeCourt||!scheduled} className="rch-cw-primary"><FaFlag/> Send challenge</button>
        </form>}
        {!captainCrew&&<div className="rch-cw-empty small"><FaBasketball/><strong>{myCrew?'Your captain manages official crew challenges.':'Found or join a crew to enter the Cup.'}</strong><p>Every crew captain can challenge another crew at a pilot court.</p></div>}
        <div className="rch-cw-match-list">
          {challenges.length?challenges.slice(0,40).map(ch=>{
            const challenger=crewById.get(ch.challenger_id),defender=crewById.get(ch.defender_id);
            const myCaptain=Boolean(captainCrew&&(ch.challenger_id===captainCrew.id||ch.defender_id===captainCrew.id));
            const defending=Boolean(captainCrew&&ch.defender_id===captainCrew.id);
            const options=runs.filter(run=>run.location_slug===ch.court_slug&&Math.abs(new Date(run.starts_at).getTime()-new Date(ch.scheduled_at).getTime())<=86400000);
            const scores=resultInputs[ch.id]||{a:'',b:''};
            return <article key={ch.id} className="rch-cw-match">
              <div className="rch-cw-match-top"><span className={'rch-cw-status '+ch.status}>{ch.status==='review'?'Awaiting staff review':ch.status==='verified'?'✓ Verified final':ch.status==='proposed'?'Invitation pending':ch.status==='accepted'?'Accepted · schedule run':ch.status}</span><span><FaCalendarDays/> {formatCompetitionDate(ch.scheduled_at)}</span></div>
              <div className="rch-cw-matchup"><div><small>CHALLENGER</small><strong>{challenger?.name||'Crew'}</strong>{ch.status==='verified'&&<b>{ch.challenger_score}</b>}</div><span>VS</span><div><small>DEFENDER</small><strong>{defender?.name||'Crew'}</strong>{ch.status==='verified'&&<b>{ch.defender_score}</b>}</div></div>
              <div className="rch-cw-match-meta"><FaLocationDot/> {courtBySlug.get(ch.court_slug)?.name||'Pilot court'} <span>·</span> {ch.format} <span>· {ch.cup_stage==='qualifier'||!ch.cup_stage?'Qualifier':(ch.cup_stage||'').replaceAll('_',' ').toUpperCase()}</span> {ch.cup_group&&<span>· Group {ch.cup_group}</span>} {ch.run_id&&<span>· Connected Run</span>}</div>
              {defending&&ch.status==='proposed'&&<div className="rch-cw-match-buttons"><button disabled={!!busy} onClick={()=>void rpc('commonwealth_respond_challenge',{p_challenge:ch.id,p_accept:true},'Challenge accepted. Link a competitive Run for game day.')}><FaCheck/> Accept challenge</button><button disabled={!!busy} onClick={()=>void rpc('commonwealth_respond_challenge',{p_challenge:ch.id,p_accept:false},'Challenge declined.')}><FaXmark/> Decline</button></div>}
              {myCaptain&&ch.status==='accepted'&&!ch.run_id&&<div className="rch-cw-run-link">
                <p><FaShieldHalved/> Link an actual competitive Run at this court (within 24 hours of the proposed time).</p>
                <div><select aria-label={'Choose run for '+(challenger?.name||'challenge')} value={runChoices[ch.id]||''} onChange={e=>setRunChoices({...runChoices,[ch.id]:e.target.value})}><option value="">Select a Run you host</option>{options.map(run=><option key={run.id} value={run.id}>{run.title} · {formatCompetitionDate(run.starts_at)}</option>)}</select><button disabled={!!busy||!runChoices[ch.id]} onClick={()=>void rpc('commonwealth_attach_run',{p_challenge:ch.id,p_run:runChoices[ch.id]},'Competitive Run linked to this challenge.')}>Link Run</button></div>
                <Link href={'/runs?create=1&court='+encodeURIComponent(ch.court_slug)}>Create a competitive Run <FaArrowRight/></Link>
              </div>}
              {myCaptain&&ch.status==='accepted'&&ch.run_id&&new Date(ch.scheduled_at).getTime()<=Date.now()&&<form onSubmit={e=>submitScore(e,ch)} className="rch-cw-score-form">
                <p><FaShieldHalved/> Submit scores for independent RCH review. Neither crew may certify its own result.</p>
                <label>Challenger<input type="number" min="0" max="200" required value={scores.a} onChange={e=>setResultInputs({...resultInputs,[ch.id]:{...scores,a:e.target.value}})}/></label>
                <label>Defender<input type="number" min="0" max="200" required value={scores.b} onChange={e=>setResultInputs({...resultInputs,[ch.id]:{...scores,b:e.target.value}})}/></label>
                <button disabled={!!busy}>Submit scores</button>
              </form>}
              {staff&&ch.status==='review'&&<div className="rch-cw-review"><span>Staff review: {ch.challenger_score} – {ch.defender_score}. Confirm independently before verifying.</span><button disabled={!!busy} onClick={()=>void rpc('commonwealth_review_result',{p_challenge:ch.id,p_approve:true},'Result independently verified. Standings updated.')}>Verify</button><button disabled={!!busy} onClick={()=>void rpc('commonwealth_review_result',{p_challenge:ch.id,p_approve:false},'Result rejected for correction.')}>Reject</button></div>}
              {ch.run_id&&<Link className="rch-cw-text-link" href={'/runs/'+encodeURIComponent(ch.run_id)}>Open connected Run <FaArrowRight/></Link>}
            </article>;
          }):<div className="rch-cw-empty small"><FaClock/><strong>All rivalries start somewhere.</strong><p>No challenges have been submitted. When crews join, this becomes Virginia&apos;s real match board.</p></div>}
        </div>
      </section>

      <footer className="rch-cw-footer"><div><b>RCH / THE COMMONWEALTH</b><span>Real places. Real players. Recorded legacy.</span></div><div><Link href="/discover"><FaMapLocationDot/> Virginia World</Link><Link href="/runs"><FaBasketball/> Runs</Link><Link href="/media"><FaTv/> RCH TV</Link></div></footer>
    </div>
  </main>;
}
