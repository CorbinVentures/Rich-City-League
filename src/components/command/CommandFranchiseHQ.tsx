'use client';
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseClient} from '@/lib/supabase';
import {labelFor} from '@/lib/command/templates';
import {CommandTerritories} from './CommandTerritories';
import {CommandGrowthHQ} from './CommandGrowthHQ';
import {FaArrowTrendUp,FaBasketball,FaBuilding,FaChartColumn,FaCircleExclamation,FaPeopleGroup,FaScaleBalanced} from 'react-icons/fa6';

type Row=Record<string,any>;
const dollars=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const number=(n:any)=>Number(n||0);
const date=(s:string)=>new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
export function CommandFranchiseHQ(){
 const db=useMemo(()=>getSupabaseClient() as unknown as SupabaseClient<any>|null,[]);
 const [teams,setTeams]=useState<Row[]>([]);
 const [games,setGames]=useState<Row[]>([]);
 const [ledger,setLedger]=useState<Row[]>([]);
 const [reports,setReports]=useState<Row[]>([]);
 const [sales,setSales]=useState<Row[]>([]);
 const [venues,setVenues]=useState<Row[]>([]);
 const [models,setModels]=useState<Row[]>([]);
 const [selected,setSelected]=useState('');
 const [search,setSearch]=useState('');
 const [multiple,setMultiple]=useState('');
 const [assets,setAssets]=useState('0');
 const [liabilities,setLiabilities]=useState('0');
 const [assumptions,setAssumptions]=useState('');
 const [editing,setEditing]=useState(false);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  if(!db){setError('Secure franchise database unavailable.');setLoading(false);return}
  const [t,g,l,r,s,v,m]=await Promise.all([
   db.from('teams').select('id,name,city,logo_url,is_active').eq('is_active',true).order('name').limit(250),
   db.from('games').select('id,home_team_id,away_team_id,scheduled_at,status').order('scheduled_at',{ascending:false}).limit(700),
   db.from('rcl_command_ledger').select('id,team_id,game_id,direction,state,amount,category,occurred_on').limit(1500),
   db.from('rcl_command_game_reports').select('game_id,paid_attendance,complimentary_attendance,tickets_sold,attendance_source').limit(1000),
   db.from('rcl_command_concession_sales').select('game_id,quantity,unit_price,unit_cost').limit(1500),
   db.from('rcl_command_venues').select('id,name,home_team_id,state').not('home_team_id','is',null).limit(500),
   db.from('rcl_command_franchise_models').select('*').limit(200)
  ]);
  const e=[t.error,g.error,l.error,r.error,s.error,v.error,m.error].find(Boolean);
  if(e){setError(e.message);setLoading(false);return}
  setTeams(t.data||[]);setGames(g.data||[]);setLedger(l.data||[]);setReports(r.data||[]);setSales(s.data||[]);
  setVenues(v.data||[]);setModels(m.data||[]);
  setSelected(current=>current||t.data?.[0]?.id||'');
  setLoading(false);
 },[db]);
 useEffect(()=>{void load()},[load]);
 const team=teams.find(t=>t.id===selected);
 const plan=models.find(m=>m.team_id===selected);
 const home=games.filter(g=>g.home_team_id===selected);
 const allGames=games.filter(g=>g.home_team_id===selected||g.away_team_id===selected);
 const homeIds=new Set(home.map(g=>g.id));
 const attributed=ledger.filter(l=>l.team_id===selected || (!l.team_id&&l.game_id&&homeIds.has(l.game_id)));
 const recorded=attributed.filter(l=>['recorded','reconciled'].includes(l.state));
 const realized=recorded.filter(l=>l.direction==='income').reduce((sum,l)=>sum+number(l.amount),0);
 const spending=recorded.filter(l=>l.direction==='expense').reduce((sum,l)=>sum+number(l.amount),0);
 const homeConcession=sales.filter(s=>homeIds.has(s.game_id));
 const concessionGross=homeConcession.reduce((sum,s)=>sum+number(s.quantity)*number(s.unit_price),0);
 const concessionCost=homeConcession.reduce((sum,s)=>sum+number(s.quantity)*number(s.unit_cost),0);
 const actualReports=home.map(g=>reports.find(r=>r.game_id===g.id)).filter(r=>r&&(r.paid_attendance!==null||r.complimentary_attendance!==null)) as Row[];
 const attendees=actualReports.reduce((v,r)=>v+number(r.paid_attendance)+number(r.complimentary_attendance),0);
 const avgAttendance=actualReports.length?Math.round(attendees/actualReports.length):null;
 const reportedSold=actualReports.reduce((v,r)=>v+number(r.tickets_sold),0);
 const cutoff=Date.now()-365*86400000;
 const directTeamRevenue=ledger.filter(l=>l.team_id===selected&&l.direction==='income'&&
  ['recorded','reconciled'].includes(l.state)&&new Date(l.occurred_on).getTime()>=cutoff)
  .reduce((v,l)=>v+number(l.amount),0);
 const modelValue=plan?.annual_revenue_multiple&&directTeamRevenue>0?
  Math.max(0,directTeamRevenue*number(plan.annual_revenue_multiple)+number(plan.independently_verified_assets)-number(plan.outstanding_liabilities)):null;
 const concessionNote='Home-game concession gross is only attributed for venue performance; it is not recognized franchise-owned income unless settlement assigns it.';
 const upcoming=allGames.filter(g=>new Date(g.scheduled_at).getTime()>Date.now()-86400000).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at));
 const homeVenue=venues.find(v=>v.home_team_id===selected);
 const sponsorRevenue=recorded.filter(l=>l.direction==='income'&&String(l.category).startsWith('sponsorship')).reduce((v,l)=>v+number(l.amount),0);
 function openModel(){
  setMultiple(plan?.annual_revenue_multiple==null?'':String(plan.annual_revenue_multiple));
  setAssets(String(plan?.independently_verified_assets??0));
  setLiabilities(String(plan?.outstanding_liabilities??0));
  setAssumptions(String(plan?.assumptions??''));
  setEditing(true);setError('');setNotice('');
 }
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!db||!selected||saving)return;
  const mult=multiple.trim()===''?null:Number(multiple),a=Number(assets),l=Number(liabilities);
  if((mult!==null&&(!Number.isFinite(mult)||mult<0.1||mult>20))||!Number.isFinite(a)||a<0||!Number.isFinite(l)||l<0){
   setError('Enter documented nonnegative assets and liabilities. Planning multiple must be between 0.1× and 20×.');return
  }
  setSaving(true);
  const r=await db.from('rcl_command_franchise_models').upsert({
   team_id:selected,independently_verified_assets:a,outstanding_liabilities:l,
   annual_revenue_multiple:mult,assumptions:assumptions.slice(0,2000)
  },{onConflict:'team_id'});
  if(r.error)setError(r.error.message);else{setNotice('Scenario inputs saved and audit logged.');setEditing(false);await load()}
  setSaving(false);
 }
 const top=teams.filter(t=>!search||[t.name,t.city].join(' ').toLowerCase().includes(search.toLowerCase()));
 return <div className="cmd-franchise-intelligence">
  <section className="cmd-info"><strong>Franchise intelligence is grounded in recorded transactions and game reports.</strong> RCL teams share a platform, but event money and franchise-owned money are not always the same. The value calculator is a documented planning scenario, <b>not</b> an independently verified market appraisal.</section>
  <CommandTerritories selectedTeamId={selected} onSelectTeam={setSelected}/>
  {team&&<CommandGrowthHQ teamId={selected} teamName={team.name} isAdmin/>}
  <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">COMMONWEALTH FRANCHISE INTELLIGENCE</p><h3>League Franchise Portfolio</h3></div><span className="cmd-count">{teams.length} active franchises</span></div>
  <div className="cmd-franchise-selector"><label>FIND OR SELECT A FRANCHISE<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter team or city…" type="search"/></label><select aria-label="Choose a franchise" value={selected} onChange={e=>{setSelected(e.target.value);setEditing(false);setError('');setNotice('')}}>{top.map(t=><option key={t.id} value={t.id}>{t.name} · {t.city||'Virginia'}</option>)}</select></div>
  </section>
  {team&&<><section className="cmd-franchise-feature"><div className="cmd-franchise-monogram">{team.name.charAt(0)}</div><div><p className="cmd-eyebrow">FRANCHISE PERFORMANCE BOARD</p><h2>{team.name}</h2><span>{team.city||'Virginia'} · {homeVenue?.name||'Home gym not assigned yet'}</span></div></section>
  <div className="cmd-metrics">{[
   {label:'EVENT-ATTRIBUTED REVENUE',value:dollars(realized),detail:'Verified game and team ledger income'},
   {label:'HOME-GAME ATTENDANCE',value:actualReports.length?attendees.toLocaleString('en-US'):'Unreported',detail:actualReports.length+' home games with verified counts'},
   {label:'AVERAGE HOME ATTENDANCE',value:avgAttendance===null?'Not yet reported':String(avgAttendance),detail:'Only games with recorded gate counts'},
   {label:'SCENARIO VALUE',value:modelValue===null?'Not established':dollars(modelValue),detail:'Requires team revenue and a documented multiple'}
  ].map(x=><article className="cmd-metric" key={x.label}><p>{x.label}</p><strong>{x.value}</strong><small>{x.detail}</small></article>)}</div>
  <div className="cmd-columns">
   <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">FRANCHISE ECONOMICS</p><h3>Business performance</h3></div><FaChartColumn color="#ff6877"/></div><div className="cmd-brief-grid">
    <div><span>Attributed game & team income</span><strong>{dollars(realized)}</strong></div>
    <div><span>Attributed ledger expenses</span><strong>{dollars(spending)}</strong></div>
    <div><span>Attributed ledger contribution</span><strong>{dollars(realized-spending)}</strong></div>
    <div><span>Home concessions gross</span><strong>{dollars(concessionGross)}</strong></div>
    <div><span>Home concessions sold cost</span><strong>{dollars(concessionCost)}</strong></div>
    <div><span>Sponsorship ledger receipts</span><strong>{dollars(sponsorRevenue)}</strong></div>
    <div><span>Official games</span><strong>{allGames.length}</strong></div>
    <div><span>Reported tickets sold</span><strong>{actualReports.length?reportedSold:'—'}</strong></div>
   </div><p className="cmd-fine">{concessionNote}</p></section>
   <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">INDICATIVE VALUATION WORKBENCH</p><h3>Scenario calculator</h3></div><FaScaleBalanced color="#ff6877"/></div>
    <div className="cmd-model-summary"><p>Direct, verified franchise revenue in trailing 365 days: <b>{dollars(directTeamRevenue)}</b></p><p>Documented assets: <b>{dollars(number(plan?.independently_verified_assets))}</b></p><p>Known liabilities: <b>{dollars(number(plan?.outstanding_liabilities))}</b></p><p>Selected annual revenue multiple: <b>{plan?.annual_revenue_multiple?String(plan.annual_revenue_multiple)+'×':'Not selected'}</b></p></div>
    <div className="cmd-model-value"><small>INTERNAL SCENARIO · NOT A MARKET APPRAISAL</small><strong>{modelValue===null?'INSUFFICIENT DATA':dollars(modelValue)}</strong></div>
    {!editing?<div className="cmd-model-buttons"><button className="cmd-button" type="button" onClick={openModel}>Set valuation assumptions</button></div>:<form className="cmd-form-grid cmd-inline-form" onSubmit={e=>void save(e)}>
    <label className="cmd-field"><span>Annual recognized-revenue multiple</span><input type="number" min=".1" max="20" step=".1" value={multiple} onChange={e=>setMultiple(e.target.value)} placeholder="Set from documented comparable"/></label>
    <label className="cmd-field"><span>Documented franchise assets ($)</span><input type="number" min="0" step=".01" value={assets} onChange={e=>setAssets(e.target.value)}/></label>
    <label className="cmd-field"><span>Outstanding liabilities ($)</span><input type="number" min="0" step=".01" value={liabilities} onChange={e=>setLiabilities(e.target.value)}/></label>
    <label className="cmd-field cmd-wide"><span>Source / assumptions used</span><textarea rows={2} value={assumptions} onChange={e=>setAssumptions(e.target.value)} maxLength={2000}/></label>
    <div className="cmd-form-actions"><button type="submit" className="cmd-button" disabled={saving}>{saving?'Saving…':'Save scenario'}</button><button type="button" className="cmd-text-button" onClick={()=>setEditing(false)}>Cancel</button></div>
    </form>}
    <p className="cmd-fine">Equation: trailing 365-day <b>team-assigned</b> verified income × admin-selected multiple + documented assets − liabilities. If no team income, no valuation is displayed. This cannot be used as a financial appraisal.</p>
   </section>
  </div>
  <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">OFFICIAL RCH / LEAGUEAPPS SCHEDULE</p><h3>Upcoming appearances</h3></div><FaBasketball color="#ff6877"/></div>
   {!upcoming.length?<div className="cmd-empty">No upcoming games on the official schedule.</div>:<div className="cmd-records">{upcoming.slice(0,12).map(g=><div key={g.id} className="cmd-record"><div className="cmd-record-main"><strong>{g.home_team_id===selected?'HOME':'AWAY'} · {teams.find(t=>t.id===(g.home_team_id===selected?g.away_team_id:g.home_team_id))?.name||'TBD'}</strong><small>{date(g.scheduled_at)} · {g.status}</small></div><div className="cmd-record-right"><b>{home.find(h=>h.id===g.id)?'Home event':'Away event'}</b></div></div>)}</div>}
   <p className="cmd-fine">Rosters, outcomes and official game states remain managed by RCH and LeagueApps.</p>
  </section></>}
  {loading&&<p className="cmd-empty">Calculating official RCL franchise analytics…</p>}
  {error&&<div className="cmd-notice error" role="alert"><FaCircleExclamation/> {error}</div>}
  {notice&&<div className="cmd-notice" role="status">{notice}</div>}
 </div>;
}
