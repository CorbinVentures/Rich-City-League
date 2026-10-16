'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {FaBasketball,FaBolt,FaCrown,FaLocationDot,FaTrophy} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';

type Court={slug:string;name:string;locality:string};
type Master={division:string;rank:number;profile_id:string;player_name:string;games:number;wins:number;win_pct:number;ppg:number;is_master:boolean};
type Crew={crew_id:string;crew_name:string;logo_path:string|null;games:number;wins:number;win_pct:number;eligible:boolean;is_controller:boolean;rank:number};
type Challenge={id:string;challenger_crew_id:string;defender_crew_id:string;status:string};
type Run={id:string;title:string;starts_at:string;game_format:string};
type Rep={profile_id:string;player_name:string;run_rep:number};
type Mine={id:string;name:string};

export function CourtDominion({initialCourt='',showTakeovers=false}:{initialCourt?:string;showTakeovers?:boolean}){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [courts,setCourts]=useState<Court[]>([]);
 const [court,setCourt]=useState(initialCourt);
 const [search,setSearch]=useState('');
 const [masters,setMasters]=useState<Master[]>([]);
 const [crewBoard,setCrewBoard]=useState<Crew[]>([]);
 const [challenges,setChallenges]=useState<Challenge[]>([]);
 const [runs,setRuns]=useState<Run[]>([]);
 const [repBoard,setRepBoard]=useState<Rep[]>([]);
 const [mine,setMine]=useState<Mine|null>(null);
 const [runId,setRunId]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [version,setVersion]=useState(0);
 useEffect(()=>{
  if(!db)return;
  let active=true;
  void (async()=>{
   const [a,b,c]=await Promise.all([
    db.from('basketball_locations').select('slug,name,locality').eq('is_active',true).order('name').limit(800),
    db.rpc('get_rch_run_rep_board',{p_limit:8}),
    user?db.from('commonwealth_crews').select('id,name').eq('captain_id',user.id).limit(1):Promise.resolve({data:[]})
   ]);
   if(!active)return;
   setCourts((a.data||[]) as Court[]);setRepBoard((b.data||[]) as Rep[]);
   setMine(((c.data||[]) as Mine[])[0]||null);
  })();
  return ()=>{active=false;};
 },[db,user?.id,version]);
 useEffect(()=>{
  if(!db||!court){setMasters([]);setCrewBoard([]);setChallenges([]);setRuns([]);return;}
  let active=true;setLoading(true);setError('');
  void (async()=>{
   const [a,b,c,d]=await Promise.all([
    db.rpc('get_rch_court_masters',{p_court:court}),
    db.rpc('get_rch_court_crew_standings',{p_court:court}),
    db.from('rch_court_takeovers').select('id,challenger_crew_id,defender_crew_id,status')
      .eq('court_slug',court).in('status',['requested','accepted']).limit(2),
    db.from('runs').select('id,title,starts_at,game_format')
      .eq('location_slug',court).eq('run_type','competitive')
      .in('status',['open','full'])
      .gte('starts_at',new Date(Date.now()-2*3600000).toISOString())
      .lte('starts_at',new Date(Date.now()+30*86400000).toISOString())
      .order('starts_at').limit(25)
   ]);
   if(!active)return;
   setMasters((a.data||[]) as Master[]);setCrewBoard((b.data||[]) as Crew[]);
   setChallenges((c.data||[]) as Challenge[]);setRuns((d.data||[]) as Run[]);
   if(a.error||b.error)setError('Court rankings are unavailable; no unverified results are displayed.');
   setLoading(false);
  })();
  return ()=>{active=false;};
 },[db,court,version]);
 const venues=useMemo(()=>courts.filter(c=>(c.name+' '+c.locality).toLowerCase().includes(search.toLowerCase())).slice(0,150),[courts,search]);
 const selected=courts.find(x=>x.slug===court);
 const owner=crewBoard.find(x=>x.is_controller);
 const active=challenges[0];
 const name=(id:string)=>crewBoard.find(c=>c.crew_id===id)?.crew_name||'Registered crew';
 const canChallenge=Boolean(showTakeovers&&mine&&owner&&!active&&owner.crew_id!==mine.id);
 const canAnswer=Boolean(showTakeovers&&mine&&active&&active.defender_crew_id===mine.id&&active.status==='requested');
 const logo=(path:string|null)=>path&&db?db.storage.from('rch-crew-logos').getPublicUrl(path).data.publicUrl:null;
 const action=async(fn:string,args:Record<string,unknown>,success:string)=>{
  if(!db)return;setBusy(true);setError('');setMessage('');
  const {error:failure}=await db.rpc(fn,args);
  if(failure)setError(failure.message);
  else{setMessage(success);setVersion(x=>x+1);}
  setBusy(false);
 };
 return <section aria-label="Court Masters and Crew Territory" className="my-7 overflow-hidden rounded-3xl border border-[#376987] bg-[#081b2d] text-white">
  <div className="bg-[radial-gradient(ellipse_at_top_left,#174d70,#081b2d_75%)] p-5 sm:p-7">
   <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-[#87d4ef]"><FaLocationDot/> RCH · Court Dominion</p>
   <h2 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">Every Court Has a King</h2>
   <p className="mt-2 text-sm leading-6 text-[#bfd5e5]">Virginia courts are basketball gyms to conquer. Each court has separate 1v1, 2v2 and 3v3 individual Masters, plus one controlling crew. Verified performances—not check-ins or social popularity—determine the rankings.</p>
   <div className="mt-5 grid gap-3 sm:grid-cols-2">
    <label className="text-xs font-bold text-[#b5d9f0]">Search courts<input aria-label="Search Virginia courts" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Court name or Virginia city" className="mt-2 min-h-11 w-full rounded-lg border border-[#48708b] bg-[#071525] px-3 text-sm text-white"/></label>
    <label className="text-xs font-bold text-[#b5d9f0]">Selected basketball gym<select aria-label="Choose a court" value={court} onChange={e=>{setCourt(e.target.value);setRunId('');}} className="mt-2 min-h-11 w-full rounded-lg border border-[#48708b] bg-[#071525] px-3 text-sm text-white"><option value="">Choose a Virginia court</option>{venues.map(v=><option key={v.slug} value={v.slug}>{v.name} — {v.locality}</option>)}{court&&!venues.some(x=>x.slug===court)&&selected&&<option value={court}>{selected.name} — {selected.locality}</option>}</select></label>
   </div>
  </div>
  {court?<div className="border-t border-[#315978] p-5 sm:p-7">
   <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-xl font-black">{selected?.name||'Virginia basketball court'}</h3><p className="text-xs text-[#98c1db]">{selected?.locality||'Virginia'} · verified court ladders</p></div><Link className="rounded-xl bg-[#286fa8] px-4 py-3 text-xs font-bold" href={'/runs?court='+encodeURIComponent(court)}>Find Runs here</Link></div>
   {loading&&<p className="mt-3 text-xs">Checking verified results…</p>}
   {error&&<p className="mt-3 text-xs text-[#f6bda1]">{error}</p>}
   <div className="mt-5 grid gap-3 md:grid-cols-3">
    {(['1v1','2v2','3v3'] as const).map(division=>{
     const top=masters.filter(m=>m.division===division);
     const king=top.find(m=>m.is_master);
     return <div key={division} className="rounded-xl border border-[#335c7b] bg-[#0a263e] p-4">
      <div className="flex items-center justify-between"><strong className="text-xl font-black">{division}</strong><FaCrown className={king?'text-[#f1c879]':'text-[#688398]'}/></div>
      <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-[#89cbed]">{king?'Court Master':'Master title unclaimed'}</p>
      <p className="mt-2 min-h-7 truncate text-base font-black">{king?.player_name||'Awaiting verified games'}</p>
      <p className="mt-1 text-xs text-[#aac9dc]">{king?king.wins+' wins · '+king.win_pct+'% · '+king.ppg+' PPG':'Requires 3 games across 2+ Runs'}</p>
      <div className="mt-3 space-y-2 border-t border-[#305372] pt-3">{top.map(row=><div key={row.profile_id} className="flex justify-between gap-2 text-xs"><span className="truncate">#{row.rank} {row.player_name}</span><span className="text-[#8bc4e8]">{row.win_pct}%</span></div>)}{!top.length&&<span className="text-xs text-[#8daac0]">No contenders yet</span>}</div>
     </div>;
    })}
   </div>
   <div className="mt-5 rounded-2xl border border-[#7a6943] bg-[#152a3b] p-5">
    <div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#e7c478]">Controlling Crew</p><h3 className="mt-2 text-xl font-black">{owner?.crew_name||'Unclaimed territory'}</h3><p className="mt-1 text-xs text-[#b4d0df]">{owner?owner.wins+' of '+owner.games+' verified local wins · '+owner.win_pct+'%':'First qualifying crew by local winning percentage earns control'}</p></div><span className="grid h-20 w-20 place-items-center rounded-xl border border-[#55758b] bg-[#06172a]">{owner?.logo_path&&logo(owner.logo_path)?<img src={logo(owner.logo_path)||''} alt={owner.crew_name+' court stamp'} className="h-full w-full object-contain"/>:<FaBasketball className="text-3xl text-[#93bee2]"/>}</span></div>
    <p className="mt-3 text-xs leading-5 text-[#abcadf]">The top eligible local crew wins the initial territory by winning percentage. A verified Takeover Run can transfer control; successful defenses retain it and earn triple game REP.</p>
    <div className="mt-4 space-y-2">{crewBoard.slice(0,6).map(row=><div key={row.crew_id} className="flex justify-between gap-3 border-t border-[#345371] pt-2 text-xs"><span className="truncate">{row.is_controller?'👑 ':''}#{row.rank} {row.crew_name}</span><span className="shrink-0 text-[#a6d2ef]">{row.win_pct}% · {row.eligible?'Qualified':'Provisional'}</span></div>)}</div>
    {active&&<p className="mt-4 rounded-xl border border-[#bd904a] bg-[#563a1a]/40 p-3 text-xs text-[#f0d09b]"><FaBolt className="mr-2 inline"/>{name(active.challenger_crew_id)} challenges {name(active.defender_crew_id)} · {active.status}</p>}
    {canChallenge&&<div className="mt-5 rounded-xl border border-[#47718e] p-4"><h4 className="font-black uppercase text-[#a9e9ff]">Request a Takeover Run</h4><p className="mt-2 text-xs text-[#aecbde]">Register your crew for an upcoming Run at this court, then request the challenge. The defending captain must accept and register. A real verified crew-v-crew game determines control.</p><select value={runId} onChange={e=>setRunId(e.target.value)} aria-label="Takeover Run" className="mt-3 min-h-11 w-full rounded-lg border border-[#47718e] bg-[#071b2e] px-3 text-xs"><option value="">Choose an upcoming Run</option>{runs.filter(r=>['2v2','3v3','4v4','5v5'].includes(r.game_format)).map(r=><option key={r.id} value={r.id}>{r.title} · {r.game_format} · {new Date(r.starts_at).toLocaleDateString()}</option>)}</select><button disabled={!runId||busy} onClick={()=>void action('rch_request_court_takeover',{p_court:court,p_run:runId,p_crew:mine!.id},'Challenge requested. Awaiting defender acceptance.')} className="mt-3 min-h-11 rounded-lg bg-[#ecc074] px-4 text-xs font-black text-[#201607] disabled:opacity-40">Declare Takeover</button></div>}
    {canAnswer&&<div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={()=>void action('rch_answer_court_takeover',{p_takeover:active.id,p_accept:true},'Defense accepted. Assign full crew teams in the Run Room.')} className="min-h-11 rounded-lg bg-[#63c1f4] px-4 text-xs font-black text-[#062139]">Accept defense</button><button disabled={busy} onClick={()=>void action('rch_answer_court_takeover',{p_takeover:active.id,p_accept:false},'Challenge declined.')} className="min-h-11 rounded-lg border border-[#6b88a4] px-4 text-xs font-bold">Decline</button></div>}
    {showTakeovers&&user&&!mine&&<p className="mt-3 text-xs text-[#b3d2e6]">Only a registered crew captain can initiate or accept a Takeover Run. <Link className="underline" href="/commonwealth#rch-cw-my-crew">Create your crew</Link>.</p>}
    {message&&<p role="status" className="mt-3 text-xs text-[#b3f7de]">{message}</p>}
   </div>
  </div>:<p className="border-t border-[#315978] p-6 text-sm text-[#afd0e6]">Select any Virginia basketball court to see three player Master ladders and the current crew stamp. No fabricated winners are shown.</p>}
  <div className="border-t border-[#315978] p-5 sm:p-7"><h3 className="flex items-center gap-2 font-black uppercase"><FaTrophy className="text-[#90daee]"/> Statewide Run REP</h3><p className="mt-2 text-xs leading-5 text-[#adccdf]">Verified wins: 30 REP · losses: 10 REP · successful Takeover defense: 90 REP (3×). Run REP does not determine Cup titles or crew court ownership.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{repBoard.length?repBoard.map((row,i)=><div key={row.profile_id} className="flex justify-between rounded-lg border border-[#345675] p-3 text-xs"><span>#{i+1} {row.player_name}</span><strong className="text-[#f2d58e]">{row.run_rep} REP</strong></div>):<span className="text-xs text-[#95b9d5]">Verified games will establish the leaderboard.</span>}</div></div>
 </section>;
}
