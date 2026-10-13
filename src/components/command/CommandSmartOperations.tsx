'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseClient} from '@/lib/supabase';
import {gameTaskRules} from '@/lib/command/templates';
import {FaArrowRight,FaBasketball,FaCalendarCheck,FaCheck,FaCircleExclamation,FaClipboardCheck,FaClock,FaLocationDot,FaTriangleExclamation} from 'react-icons/fa6';

type Row=Record<string,any>;
const asDate=(v:string)=>new Date(v).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
const getStage=(hours:number,status:string)=>{
 if(['final','completed','finished'].includes(status)||hours<0)return 'POSTGAME';
 if(hours<=8)return 'GAME DAY';
 if(hours<=48)return 'FINAL 48 HOURS';
 if(hours<=168)return 'GAME WEEK';
 return 'ADVANCE PLANNING';
};
export function CommandSmartOperations(){
 const db=useMemo(()=>getSupabaseClient() as unknown as SupabaseClient<any>|null,[]);
 const [games,setGames]=useState<Row[]>([]);
 const [teams,setTeams]=useState<Row[]>([]);
 const [bookings,setBookings]=useState<Row[]>([]);
 const [checks,setChecks]=useState<Row[]>([]);
 const [gateReports,setGateReports]=useState<Row[]>([]);
 const [inventory,setInventory]=useState<Row[]>([]);
 const [ledger,setLedger]=useState<Row[]>([]);
 const [selected,setSelected]=useState('');
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  if(!db){setError('Secure operations data is unavailable.');setLoading(false);return}
  const [g,t,b,c,r,i,l]=await Promise.all([
   db.from('games').select('id,home_team_id,away_team_id,scheduled_at,status,venue_id,scorebook_status,home_score,away_score').order('scheduled_at',{ascending:true}).limit(600),
   db.from('teams').select('id,name').limit(200),
   db.from('rcl_command_bookings').select('game_id,team_id,status,starts_at,ends_at,venue_id').limit(1000),
   db.from('rcl_command_game_checks').select('*').limit(1500),
   db.from('rcl_command_game_reports').select('game_id,paid_attendance,complimentary_attendance').limit(1000),
   db.from('rcl_command_inventory').select('id,name,stock_count,reorder_at,active').limit(1000),
   db.from('rcl_command_ledger').select('id,game_id,state,amount,direction').limit(1200),
  ]);
  const err=[g.error,t.error,b.error,c.error,r.error,i.error,l.error].find(Boolean);
  if(err){setError(err.message);setLoading(false);return}
  setGames(g.data||[]);setTeams(t.data||[]);setBookings(b.data||[]);
  setChecks(c.data||[]);setGateReports(r.data||[]);setInventory(i.data||[]);setLedger(l.data||[]);
  setSelected(s=>s||g.data?.find((x:Row)=>new Date(x.scheduled_at).getTime()>=Date.now()-86400000)?.id||g.data?.[0]?.id||'');
  setLoading(false);
 },[db]);
 useEffect(()=>{void load()},[load]);
 const now=Date.now();
 const displayGames=games.filter(g=>new Date(g.scheduled_at).getTime()>=now-14*86400000).sort((a,b)=>new Date(a.scheduled_at).getTime()-new Date(b.scheduled_at).getTime());
 const tName=(id:string)=>teams.find(t=>t.id===id)?.name||'Unassigned franchise';
 const display=(g:Row)=>tName(g.home_team_id)+' vs '+tName(g.away_team_id);
 const game=games.find(g=>g.id===selected);
 const until=game?(new Date(game.scheduled_at).getTime()-now)/3600000:0;
 const stage=game?getStage(until,String(game.status)):'—';
 const past=stage==='POSTGAME';
 const isBookedFor=(b:Row,g:Row)=>b.status==='confirmed'&&(b.game_id===g.id
  ||(b.team_id===g.home_team_id&&new Date(b.starts_at).getTime()<=new Date(g.scheduled_at).getTime()
   &&new Date(b.ends_at).getTime()>new Date(g.scheduled_at).getTime()));
 const confirmed=Boolean(game&&bookings.some(b=>isBookedFor(b,game)));
 const bothTeams=Boolean(game?.home_team_id&&game?.away_team_id&&teams.some(t=>t.id===game.home_team_id)&&teams.some(t=>t.id===game.away_team_id));
 const final=Boolean(game&&['completed','final','finished'].includes(String(game.status)));
 const report=gateReports.find(r=>r.game_id===selected);
 const attendanceVerified=Boolean(report&&(report.paid_attendance!==null||report.complimentary_attendance!==null));
 const transactionSet=ledger.filter(l=>l.game_id===selected&&l.state!=='void');
 const moneyReconciled=transactionSet.length>0 && transactionSet.every(x=>x.state==='reconciled');
 const lowItems=inventory.filter(x=>x.active&&Number(x.stock_count)<=Number(x.reorder_at));
 const auto:Record<string,boolean>={confirm_venue:confirmed,assign_opponent:bothTeams,game_status:final,attendance_entered:attendanceVerified};
 const manual=(key:string)=>checks.find(c=>c.game_id===selected&&c.check_key===key);
 const liveRules=gameTaskRules.filter(r=>past?true:!['game_status','attendance_entered','financial_settlement'].includes(r.key));
 const achieved=liveRules.filter(r=>r.type==='auto'?auto[r.key]:Boolean(manual(r.key)?.completed)).length;
 const issues=liveRules.filter(r=>{
  const done=r.type==='auto'?auto[r.key]:Boolean(manual(r.key)?.completed);
  return !done&&until<=r.days*24;
 });
 const reserveUrgency=issues.filter(x=>x.key==='confirm_venue'||x.key==='officials_confirmed'||x.key==='security_medical');
 async function check(key:string,completed:boolean){
  if(!db||!selected||working||!gameTaskRules.some(r=>r.key===key&&r.type==='manual'))return;
  setWorking(true);setError('');setNotice('');
  const result=await db.from('rcl_command_game_checks').upsert({
   game_id:selected,check_key:key,completed,
  },{onConflict:'game_id,check_key'});
  if(result.error)setError(result.error.message);
  else{setNotice(completed?'Checklist requirement confirmed by staff.':'Requirement reopened.');await load()}
  setWorking(false);
 }
 const gameRows=displayGames.slice(0,40);
 const daysUntil=game?Math.ceil(until/24):0;
 return <div className="cmd-game-operations">
  <section className="cmd-hero cmd-game-ops-hero"><div><p className="cmd-eyebrow">INTELLIGENT LEAGUE OPERATIONS</p><h2>The game plan.<br/><em>Already in motion.</em></h2><p>Checklists appear automatically from RCH&apos;s official game schedule. Court reservations, game states and gate reports resolve the corresponding requirements without staff typing duplicate records.</p></div><div className="cmd-hero-mark">R</div></section>
  <div className="cmd-info"><strong>Smart, not imaginary:</strong> RCH knows official schedules and game status. It does not automatically know whether a referee accepted, cameras are physically ready, or a venue granted exclusive use. Those operational confirmations stay employee-completed and audit logged.</div>
  <div className="cmd-columns">
   <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">OFFICIAL GAME QUEUE</p><h3>Upcoming game operations</h3></div><FaBasketball color="#ff6979"/></div>
    {!gameRows.length?<div className="cmd-empty">No upcoming official games within the operations window.</div>:<div className="cmd-ops-game-list">{gameRows.map(g=>{
     const selectedRow=selected===g.id;
     const confirmedForGame=bookings.some(b=>isBookedFor(b,g));
     const hours=(new Date(g.scheduled_at).getTime()-now)/3600000;
     return <button type="button" key={g.id} className={'cmd-ops-game '+(selectedRow?'selected':'')} onClick={()=>{setSelected(g.id);setNotice('');setError('')}}>
      <div><b>{display(g)}</b><small>{asDate(g.scheduled_at)} · {getStage(hours,String(g.status))}</small></div>
      <span className={confirmedForGame?'cmd-positive':'cmd-negative'}>{confirmedForGame?'VENUE CONFIRMED':'VENUE TO VERIFY'}</span>
      <FaArrowRight size={12}/>
     </button>
    })}</div>}
   </section>
   <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">AUTOMATED READINESS</p><h3>Live game control</h3></div><FaClipboardCheck color="#ff6979"/></div>
    {game?<div className="cmd-ops-status">
     <p className="cmd-eyebrow">{stage}</p><h3>{display(game)}</h3><p>{asDate(game.scheduled_at)} · {past?'Game time has passed':daysUntil+' days to tip-off'}</p>
     <div className="cmd-ops-score"><strong>{achieved} / {liveRules.length}</strong><span>Completed readiness controls</span></div>
     <div className="cmd-ops-progress"><div style={{width:(liveRules.length?Math.round(100*achieved/liveRules.length):0)+'%'}}/></div>
     <div className="cmd-ops-alerts"><div className={reserveUrgency.length?'warning':'ok'}><FaLocationDot/> {confirmed?'Court booking confirmed':'No matching confirmed court reservation'}</div>
      <div className={issues.length?'warning':'ok'}><FaTriangleExclamation/> {issues.length} overdue or currently due checks</div>
      <div className={lowItems.length?'warning':'ok'}><FaCircleExclamation/> {lowItems.length} inventory items at reorder threshold</div>
      {past&&<div className={moneyReconciled?'ok':'warning'}><FaClock/> {moneyReconciled?'Linked ledger entries reconciled':'Game settlement still needs staff review'}</div>}</div>
    </div>:<div className="cmd-empty">Choose a scheduled game to load automatic readiness checks.</div>}
   </section>
  </div>
  {game&&<section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">LIVE CHECKLIST ENGINE</p><h3>{stage} · Staff & data requirements</h3></div><FaCalendarCheck color="#ff6979"/></div>
   <div className="cmd-ops-rule-grid">{liveRules.map(rule=>{
    const completed=rule.type==='auto'?Boolean(auto[rule.key]):Boolean(manual(rule.key)?.completed);
    const due=!completed&&until<=rule.days*24;
    return <div className={'cmd-ops-rule '+(completed?'done':'')+(due?' due':'')} key={rule.key}>
     <div className="cmd-ops-rule-status">{completed?<FaCheck size={12}/>:rule.type==='auto'?<FaClock size={12}/>:<span>·</span>}</div>
     <div className="cmd-ops-rule-main"><small>{rule.group} · {rule.type==='auto'?'RCH DATA CHECK':'EMPLOYEE VERIFICATION'}</small><b>{rule.title}</b><span>{completed?'Requirement satisfied':rule.type==='auto'?'Waiting for the official linked data':due?'Action required now':'Scheduled for the game readiness window'}</span></div>
     {rule.type==='manual'&&<button type="button" disabled={working} className={completed?'cmd-ops-uncheck':'cmd-ops-check'} onClick={()=>void check(rule.key,!completed)}>{completed?'Reopen':'Mark done'}</button>}
    </div>
   })}</div>
   <p className="cmd-fine">Upcoming rules activate by their deadline. Postgame settlement and attendance checks appear after tip-off or when a game is completed. Changing official game times automatically shifts the checklist stages.</p>
  </section>}
  {loading&&<p className="cmd-empty">Synchronizing official games and operational evidence…</p>}
  {error&&<div className="cmd-notice error" role="alert">{error}</div>}
  {notice&&<div className="cmd-notice" role="status">{notice}</div>}
 </div>;
}
