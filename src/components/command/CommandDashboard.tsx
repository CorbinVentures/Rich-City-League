'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowRight, FaBasketball, FaBuilding, FaCalendarDays, FaChartLine, FaClock, FaCreditCard, FaFileLines, FaPeopleGroup, FaUserShield } from 'react-icons/fa6';

type Row = Record<string, any> & { id: string };
type Area = 'overview'|'revenue'|'finance'|'venues'|'concessions'|'trades'|'stories'|'operations'|'franchises'|'audit';
type Kind = 'budgets'|'ledger'|'venues'|'bookings'|'inventory'|'concession_sales'|'trades'|'stories'|'tasks'|'audit';
type Field = {name:string; label:string; type?:string;required?:boolean;options?:string[];lookup?:'teams'|'games'|'venues'|'inventory'|'seasons'|'players';hint?:string};
const tables:Record<Kind,string> = {
 budgets:'rcl_command_budgets',ledger:'rcl_command_ledger',venues:'rcl_command_venues',
 bookings:'rcl_command_bookings',inventory:'rcl_command_inventory',concession_sales:'rcl_command_concession_sales',
 trades:'rcl_command_trades',stories:'rcl_command_stories',tasks:'rcl_command_tasks',audit:'rcl_command_audit'
};
const kinds = Object.keys(tables) as Kind[];
const empty = ():Record<Kind,Row[]> => Object.fromEntries(kinds.map(k=>[k,[]])) as Record<Kind,Row[]>;
const nav: {id:Area;name:string;group:string;icon:React.ComponentType<{size?:number}>}[] = [
 {id:'overview',name:'Executive Overview',group:'COMMAND',icon:FaChartLine},
 {id:'finance',name:'Financial Office',group:'BUSINESS',icon:FaCreditCard},
 {id:'revenue',name:'Game Revenue',group:'BUSINESS',icon:FaChartLine},
 {id:'venues',name:'Venues & Bookings',group:'BUSINESS',icon:FaBuilding},
 {id:'concessions',name:'Concessions',group:'BUSINESS',icon:FaBasketball},
 {id:'franchises',name:'Franchise HQ',group:'LEAGUE',icon:FaPeopleGroup},
 {id:'trades',name:'Trade Portal',group:'LEAGUE',icon:FaArrowRight},
 {id:'stories',name:'Storyline Studio',group:'PRODUCTION',icon:FaFileLines},
 {id:'operations',name:'Game-Day Operations',group:'PRODUCTION',icon:FaCalendarDays},
 {id:'audit',name:'Audit Trail',group:'SECURITY',icon:FaUserShield},
];
const schemas: Record<Exclude<Kind,'audit'>,Field[]> = {
 budgets:[
  {name:'title',label:'Budget line',required:true},{name:'category',label:'Cost category',required:true},
  {name:'planned_amount',label:'Approved / planned allocation ($)',type:'number',required:true},
  {name:'season_id',label:'Season',lookup:'seasons'},{name:'team_id',label:'Franchise',lookup:'teams'},
  {name:'notes',label:'Budget notes',type:'textarea'},
 ],
 ledger:[
  {name:'direction',label:'Flow',options:['income','expense'],required:true},
  {name:'description',label:'Transaction description',required:true},
  {name:'category',label:'Category',required:true},
  {name:'amount',label:'Amount ($)',type:'number',required:true},
  {name:'state',label:'Verification',options:['projected','recorded','reconciled'],required:true,hint:'Projected money is excluded from actual totals.'},
  {name:'occurred_on',label:'Date',type:'date',required:true},
  {name:'game_id',label:'Related game',lookup:'games'},{name:'team_id',label:'Franchise',lookup:'teams'},
  {name:'season_id',label:'Season',lookup:'seasons'},{name:'reference',label:'Invoice / receipt reference'},
 ],
 venues:[
  {name:'name',label:'Gym or venue',required:true},{name:'city',label:'City / area',required:true},
  {name:'address',label:'Street address'},{name:'hourly_rate',label:'Quoted hourly cost ($)',type:'number'},
  {name:'capacity',label:'Spectator capacity',type:'number'},
  {name:'contact',label:'Contact / phone / email'},
  {name:'state',label:'Rental status',options:['researching','contacted','available','contracted','unavailable'],required:true},
  {name:'home_team_id',label:'Proposed home franchise',lookup:'teams'},
  {name:'notes',label:'Rental conditions, filming, spectators, permits',type:'textarea'},
 ],
 bookings:[
  {name:'venue_id',label:'Gym',lookup:'venues',required:true},{name:'team_id',label:'Home franchise',lookup:'teams'},
  {name:'game_id',label:'Associated game',lookup:'games'},
  {name:'starts_at',label:'Booking starts',type:'datetime-local',required:true},
  {name:'ends_at',label:'Booking ends',type:'datetime-local',required:true},
  {name:'hourly_rate',label:'Agreed hourly rate ($)',type:'number',required:true},
  {name:'status',label:'Booking status',options:['tentative','confirmed'],required:true},
  {name:'notes',label:'Confirmation number or special conditions',type:'textarea'},
 ],
 inventory:[
  {name:'name',label:'Concession item',required:true},
  {name:'unit_cost',label:'Cost per unit ($)',type:'number',required:true},
  {name:'sale_price',label:'Sale price ($)',type:'number',required:true},
  {name:'stock_count',label:'Starting stock',type:'number',required:true},
  {name:'reorder_at',label:'Low-stock threshold',type:'number',required:true},
 ],
 concession_sales:[
  {name:'item_id',label:'Concession item',lookup:'inventory',required:true},
  {name:'quantity',label:'Units sold',type:'number',required:true},
  {name:'game_id',label:'Related game',lookup:'games'},
 ],
 trades:[
  {name:'sending_team_id',label:'Sending team',lookup:'teams',required:true},
  {name:'receiving_team_id',label:'Receiving team',lookup:'teams',required:true},
  {name:'player_id',label:'Player (optional)',lookup:'players'},
  {name:'proposal',label:'Trade terms / players involved',type:'textarea',required:true},
 ],
 stories:[
  {name:'title',label:'Storyline / campaign name',required:true},
  {name:'format',label:'Content format',options:['game_promo','rivalry','player_feature','rch_tv','press','other'],required:true},
  {name:'narrative',label:'Creative brief and storyline',type:'textarea',required:true},
  {name:'game_id',label:'Featured game',lookup:'games'},{name:'team_id',label:'Featured team',lookup:'teams'},
  {name:'scheduled_for',label:'Production / release target',type:'date'},
 ],
 tasks:[
  {name:'title',label:'Operational assignment',required:true},
  {name:'category',label:'Department',options:['operations','game_day','staffing','media','finance','venue'],required:true},
  {name:'priority',label:'Priority',options:['normal','low','urgent'],required:true},
  {name:'due_on',label:'Due date',type:'date'},
  {name:'game_id',label:'Related game',lookup:'games'},{name:'team_id',label:'Franchise',lookup:'teams'},
  {name:'notes',label:'Instructions',type:'textarea'},
 ],
};
const titles:Record<Exclude<Kind,'audit'>,string>={
 budgets:'Season budgets',ledger:'Income & expenses',venues:'Gym directory',bookings:'Court reservations',
 inventory:'Concession inventory',concession_sales:'Concession sales',trades:'Trade proposals',
 stories:'Creative storylines',tasks:'Operations assignments'
};
const iconMap:Record<Area,string>={overview:'01',finance:'02',revenue:'03',venues:'04',concessions:'05',franchises:'06',trades:'07',stories:'08',operations:'09',audit:'10'};
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const amount=(n:any)=>Number(n||0);
const pretty=(v:unknown)=>String(v??'').replaceAll('_',' ');
const stamp=(s?:string)=>s?new Date(s).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'}):'—';
const dateOnly=(s?:string)=>s?new Date(s+'T12:00:00').toLocaleDateString('en-US',{dateStyle:'medium'}):'—';

export function CommandDashboard(){
 const db = useMemo(()=>getSupabaseClient() as unknown as SupabaseClient<any> | null,[]);
 const [active,setActive]=useState<Area>('overview');
 const [records,setRecords]=useState<Record<Kind,Row[]>>(empty);
 const [teams,setTeams]=useState<Row[]>([]);
 const [games,setGames]=useState<Row[]>([]);
 const [seasons,setSeasons]=useState<Row[]>([]);
 const [players,setPlayers]=useState<Row[]>([]);
 const [busy,setBusy]=useState(true);
 const [working,setWorking]=useState(false);
 const [notice,setNotice]=useState<{message:string;error:boolean}|null>(null);
 const [editing,setEditing]=useState<Kind|null>(null);
 const [form,setForm]=useState<Record<string,string>>({});
 const [menuOpen,setMenuOpen]=useState(false);
 const [adjusting,setAdjusting]=useState<string|null>(null);
 const [stockValue,setStockValue]=useState('');
 const [gameFilter,setGameFilter]=useState('');
 const [installPrompt,setInstallPrompt]=useState<{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}|null>(null);
 const load=useCallback(async()=>{
  if(!db) {setNotice({message:'Supabase connection unavailable.',error:true});setBusy(false);return;}
  setBusy(true);
  try{
   const [all,teamQ,gameQ,seasonQ,playerQ]=await Promise.all([
    Promise.all(kinds.map(async kind=>({kind, result:await db.from(tables[kind]).select('*').order(kind==='concession_sales'?'recorded_at':'created_at',{ascending:false}).limit(kind==='audit'?120:400)}))),
    db.from('teams').select('id,name,city,logo_url,is_active').eq('is_active',true).order('name').limit(200),
    db.from('games').select('id,home_team_id,away_team_id,scheduled_at,status,home_score,away_score').order('scheduled_at',{ascending:false}).limit(250),
    db.from('seasons').select('id,name,start_date,status').order('start_date',{ascending:false}).limit(40),
    db.from('players').select('id,first_name,last_name').limit(500)
   ]);
   const failed=all.find(x=>x.result.error);
   const error=failed?.result.error || teamQ.error || gameQ.error || seasonQ.error || playerQ.error;
   if(error) throw new Error(error.message);
   setRecords(Object.fromEntries(all.map(({kind,result})=>[kind,result.data??[]])) as Record<Kind,Row[]>);
   setTeams(teamQ.data??[]);setGames(gameQ.data??[]);setSeasons(seasonQ.data??[]);setPlayers(playerQ.data??[]);
  }catch(error){setNotice({message:error instanceof Error?error.message:'Could not load Command Center records.',error:true});}
  finally{setBusy(false);}
 },[db]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{const onPrompt=(event:Event)=>{event.preventDefault();setInstallPrompt(event as Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>})};window.addEventListener('beforeinstallprompt',onPrompt);return()=>window.removeEventListener('beforeinstallprompt',onPrompt)},[]);
 const labelTeam=(id?:string)=>teams.find(t=>t.id===id)?.name||'League-wide';
 const labelVenue=(id?:string)=>records.venues.find(v=>v.id===id)?.name||'Unassigned venue';
 const labelGame=(id?:string)=>{if(!id)return 'All games';const g=games.find(x=>x.id===id);return g?labelTeam(g.home_team_id)+' vs '+labelTeam(g.away_team_id):'Game record'};
 const options=(f:Field)=>{
  if(f.options)return f.options.map(v=>({value:v,label:pretty(v)}));
  switch(f.lookup){
   case 'teams':return teams.map(v=>({value:v.id,label:v.name}));
   case 'games':return games.map(v=>({value:v.id,label:labelGame(v.id)+' · '+stamp(v.scheduled_at)}));
   case 'venues':return records.venues.map(v=>({value:v.id,label:v.name+' · '+v.city}));
   case 'inventory':return records.inventory.filter(v=>v.active).map(v=>({value:v.id,label:v.name+' · '+v.stock_count+' remaining'}));
   case 'seasons':return seasons.map(v=>({value:v.id,label:v.name}));
   case 'players':return players.map(v=>({value:v.id,label:v.first_name+' '+v.last_name}));
   default:return [];
  }
 };
 const reset=(kind:Kind|null)=>{setEditing(kind);setForm({});setNotice(null)};
 async function create(event:FormEvent<HTMLFormElement>,kind:Exclude<Kind,'audit'>){
  event.preventDefault();if(!db||working)return;
  const payload:Record<string,unknown>={};
  for(const field of schemas[kind]){
   const value=(form[field.name]??'').trim();
   if(field.required&&!value){setNotice({message:'Complete '+field.label+'.',error:true});return}
   if(!value)continue;
   if(field.type==='number') { const n=Number(value);if(!Number.isFinite(n)||n<0){setNotice({message:'Invalid number: '+field.label,error:true});return} payload[field.name]=n; }
   else if(field.type==='datetime-local'){const d=new Date(value);if(Number.isNaN(d.getTime())){setNotice({message:'Invalid date.',error:true});return}payload[field.name]=d.toISOString();}
   else payload[field.name]=value;
  }
  if(kind==='bookings' && String(payload.ends_at)<=String(payload.starts_at)){setNotice({message:'Booking end must be after start.',error:true});return;}
  if(kind==='trades'&&payload.sending_team_id===payload.receiving_team_id){setNotice({message:'Choose two different teams.',error:true});return;}
  setWorking(true);setNotice(null);
  const {error}=await db.from(tables[kind]).insert(payload);
  if(error){setNotice({message:error.message,error:true});setWorking(false);return;}
  setNotice({message:titles[kind]+' entry saved.',error:false});setEditing(null);setForm({});await load();setWorking(false);
 }
 async function update(kind:Exclude<Kind,'audit'>,id:string,values:Record<string,unknown>){
  if(!db||working)return;
  setWorking(true);setNotice(null);
  const {error}=await db.from(tables[kind]).update(values).eq('id',id);
  if(error){setNotice({message:error.message,error:true});setWorking(false);return;}
  setNotice({message:'Change saved and included in the audit trail.',error:false});await load();setWorking(false);
 }
 const ledActual=records.ledger.filter(r=>['recorded','reconciled'].includes(r.state));
 const income=ledActual.filter(r=>r.direction==='income').reduce((n,r)=>n+amount(r.amount),0);
 const expenses=ledActual.filter(r=>r.direction==='expense').reduce((n,r)=>n+amount(r.amount),0);
 const projected=records.ledger.filter(r=>r.state==='projected').reduce((n,r)=>n+(r.direction==='income'?1:-1)*amount(r.amount),0);
 const budgetTotal=records.budgets.reduce((n,r)=>n+amount(r.planned_amount),0);
 const grossSales=records.concession_sales.reduce((n,r)=>n+amount(r.quantity)*amount(r.unit_price),0);
 const concessionCost=records.concession_sales.reduce((n,r)=>n+amount(r.quantity)*amount(r.unit_cost),0);
 const outstanding=records.tasks.filter(r=>r.status!=='done').length;
 const venueExposure=records.bookings.filter(r=>r.status!=='cancelled').reduce((n,r)=>n+Math.max(0,(new Date(r.ends_at).getTime()-new Date(r.starts_at).getTime())/3600000)*amount(r.hourly_rate),0);
 const upcoming=[...games].filter(g=>new Date(g.scheduled_at).getTime()>Date.now()).sort((a,b)=>String(a.scheduled_at).localeCompare(String(b.scheduled_at))).slice(0,5);
 function renderForm(kind:Exclude<Kind,'audit'>){
  return <section className="cmd-create"><div className="cmd-form-head"><div><div className="cmd-eyebrow">NEW RECORD</div><h3>{titles[kind]}</h3></div><button type="button" className="cmd-close" onClick={()=>reset(null)} aria-label="Close form">×</button></div><form onSubmit={e=>void create(e,kind)} className="cmd-form-grid">
   {schemas[kind].map(field=><label key={field.name} className={'cmd-field '+(field.type==='textarea'?'cmd-wide':'')}><span>{field.label}{field.required?' *':''}</span>
    {field.type==='textarea'?<textarea rows={3} maxLength={5000} value={form[field.name]??''} onChange={e=>setForm(x=>({...x,[field.name]:e.target.value}))} required={field.required}/>:
    (field.options||field.lookup)?<select required={field.required} value={form[field.name]??''} onChange={e=>setForm(x=>({...x,[field.name]:e.target.value}))}><option value="">Select {field.label.toLowerCase()}</option>{options(field).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:
    <input required={field.required} type={field.type||'text'} step={field.type==='number'?(field.name==='stock_count'||field.name==='quantity'||field.name==='capacity'||field.name==='reorder_at'?'1':'0.01'):undefined} min={field.type==='number'?'0':undefined} maxLength={field.type==='number'?undefined:200} value={form[field.name]??''} onChange={e=>setForm(x=>({...x,[field.name]:e.target.value}))}/>}
    {field.hint&&<small>{field.hint}</small>}</label>)}
   <div className="cmd-form-actions"><button className="cmd-button" type="submit" disabled={working}>{working?'Saving…':'Save record'} <FaArrowRight size={12}/></button><button type="button" className="cmd-text-button" onClick={()=>reset(null)}>Cancel</button></div>
  </form></section>;
 }
 function add(kind:Exclude<Kind,'audit'>){return <button className="cmd-add" type="button" onClick={()=>reset(kind)}>+ New {kind==='concession_sales'?'sale':kind==='bookings'?'booking':kind==='ledger'?'transaction':kind==='budgets'?'budget':kind==='inventory'?'item':kind==='venues'?'gym':kind==='trades'?'proposal':kind==='stories'?'storyline':'task'}</button>;}
 function status(row:Row,kind:Exclude<Kind,'audit'>,key:string,values:string[]){return <select className="cmd-status" disabled={working} aria-label={'Update '+key} value={row[key]||''} onChange={e=>void update(kind,row.id,{[key]:e.target.value})}>{values.map(s=><option key={s} value={s}>{pretty(s)}</option>)}</select>}
 function frame(kind:Exclude<Kind,'audit'>,children:React.ReactNode,sub:string){
  return <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">{sub}</p><h3>{titles[kind]} <span className="cmd-count">{records[kind].length}</span></h3></div>{add(kind)}</div>{editing===kind?renderForm(kind):null}{children}</section>;
 }
 const emptyState=(label:string)=> <div className="cmd-empty"><span className="cmd-empty-glyph">R</span><p>No {label} recorded yet.</p><small>Add the first entry to activate this workspace.</small></div>;
 const rows=(kind:Kind,render:(r:Row)=>React.ReactNode)=>records[kind].length?<div className="cmd-records">{records[kind].map(r=><div key={r.id} className="cmd-record">{render(r)}</div>)}</div>:emptyState(titles[kind as Exclude<Kind,'audit'>]||'audit activity');
 const cards=(arr:{label:string;value:string;detail:string;className?:string}[])=><div className="cmd-metrics">{arr.map(x=><article className={'cmd-metric '+(x.className||'')} key={x.label}><p>{x.label}</p><strong>{x.value}</strong><small>{x.detail}</small></article>)}</div>;
 const overview=<><section className="cmd-hero"><div><div className="cmd-eyebrow">EXECUTIVE INTELLIGENCE · RCL INTERNAL</div><h2>Run the league.<br/><em>Own the operation.</em></h2><p>Your private control room for league financials, game-day operations and statewide franchise development.</p></div><div className="cmd-hero-mark" aria-hidden="true">R</div></section>
 {cards([{label:'RECORDED LEDGER INCOME',value:money(income),detail:'Recorded + reconciled; no projections'},{label:'RECORDED LEDGER EXPENSE',value:money(expenses),detail:'Recorded + reconciled'},{label:'CONCESSION GROSS SALES',value:money(grossSales),detail:'Tracked independently from ledger'},{label:'OUTSTANDING OPERATIONS',value:String(outstanding).padStart(2,'0'),detail:'Open and active action items'}])}
 <div className="cmd-columns"><section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">LEAGUE SNAPSHOT</p><h3>Front Office Briefing</h3></div></div><div className="cmd-brief-grid"><div><span>Approved budget lines</span><strong>{money(budgetTotal)}</strong></div><div><span>Venue commitment estimate</span><strong>{money(venueExposure)}</strong></div><div><span>Projected ledger net</span><strong>{money(projected)}</strong></div><div><span>Concession gross margin</span><strong>{money(grossSales-concessionCost)}</strong></div><div><span>Active franchises</span><strong>{teams.length}</strong></div><div><span>Scouted gyms</span><strong>{records.venues.length}</strong></div></div><p className="cmd-fine">Ledger totals and concession sales are deliberately separate to prevent accidental double counting. Venue commitments are estimates, not confirmed expenses.</p></section>
 <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">LEAGUEAPPS + SCOREBOOK</p><h3>Upcoming Matchups</h3></div></div>{upcoming.length?upcoming.map(g=><div className="cmd-mini" key={g.id}><strong>{labelGame(g.id)}</strong><span>{stamp(g.scheduled_at)}</span></div>):emptyState('upcoming games')}<p className="cmd-fine">Official game details are read from the existing RCH database. Command does not overwrite game results.</p></section></div></>;
 const finance=<>{cards([{label:'OPERATING BUDGET',value:money(budgetTotal),detail:records.budgets.length+' budget lines'},{label:'ACTUAL INCOME',value:money(income),detail:'Recorded and reconciled only'},{label:'ACTUAL EXPENSES',value:money(expenses),detail:'Recorded and reconciled only'},{label:'LEDGER NET',value:money(income-expenses),detail:'Excludes concession inventory and sales'}])}
 {frame('budgets',rows('budgets',r=><><div className="cmd-record-main"><strong>{r.title}</strong><small>{r.category} · {labelTeam(r.team_id)} · {seasons.find(s=>s.id===r.season_id)?.name||'All seasons'}</small></div><div className="cmd-record-right"><b>{money(amount(r.planned_amount))}</b><small>{r.notes||'Budget allocation'}</small></div></>),'PLANNING & ALLOCATIONS')}
 {frame('ledger',<><p className="cmd-fine cmd-spacing">Projected transactions do not count as actual cash. Reconcile against supporting receipts before reporting finalized totals. Enter concession sales through the Concessions module, not twice.</p>{rows('ledger',r=><><div className="cmd-record-main"><strong>{r.description}</strong><small>{r.category} · {dateOnly(r.occurred_on)} · {labelGame(r.game_id)}</small></div><div className="cmd-record-right"><b className={r.direction==='income'?'cmd-positive':'cmd-negative'}>{r.direction==='income'?'+':'−'}{money(amount(r.amount))}</b>{status(r,'ledger','state',['projected','recorded','reconciled','void'])}</div></>)}</>,'VERIFIED TRANSACTION LEDGER')}</>;
 const venues=<>{cards([{label:'GYMS IN PIPELINE',value:String(records.venues.length),detail:'Research through contracted'},{label:'UNDER $75/HR',value:String(records.venues.filter(v=>v.hourly_rate!==null&&v.hourly_rate!==undefined&&amount(v.hourly_rate)<=75).length),detail:'Quoted rate only, not availability'},{label:'ACTIVE BOOKING ESTIMATE',value:money(venueExposure),detail:'Tentative + confirmed reservations'},{label:'CONFIRMED RESERVATIONS',value:String(records.bookings.filter(b=>b.status==='confirmed').length),detail:'Venue date + time collision guarded'}])}
 {frame('venues',rows('venues',r=><><div className="cmd-record-main"><strong>{r.name} <span className={'cmd-dot '+(amount(r.hourly_rate)>75?'warning':'')}/></strong><small>{r.city} · {labelTeam(r.home_team_id)} · {r.contact||'No rental contact on file'}</small><small>{r.notes}</small></div><div className="cmd-record-right"><b>{r.hourly_rate===null?'Rate needed':money(amount(r.hourly_rate))+'/hr'}</b>{status(r,'venues','state',['researching','contacted','available','contracted','unavailable'])}</div></>),'VIRGINIA FACILITY INTELLIGENCE')}
 {frame('bookings',rows('bookings',r=><><div className="cmd-record-main"><strong>{labelVenue(r.venue_id)}</strong><small>{labelTeam(r.team_id)} · {labelGame(r.game_id)}</small><small>{stamp(r.starts_at)} — {stamp(r.ends_at)}</small></div><div className="cmd-record-right"><b>{money(Math.max(0,(new Date(r.ends_at).getTime()-new Date(r.starts_at).getTime())/3600000)*amount(r.hourly_rate))}</b>{status(r,'bookings','status',['tentative','confirmed','cancelled'])}</div></>),'RECURRING HOME COURTS & GAME DAYS')}</>;
 const concessions=<>{cards([{label:'SALES REVENUE',value:money(grossSales),detail:'Recorded sale transactions'},{label:'SOLD UNIT COST',value:money(concessionCost),detail:'Cost at time of sale'},{label:'GROSS PROFIT',value:money(grossSales-concessionCost),detail:'Before staffing / rental overhead'},{label:'LOW STOCK ITEMS',value:String(records.inventory.filter(i=>i.active&&amount(i.stock_count)<=amount(i.reorder_at)).length),detail:'At or below reorder point'}])}
 {frame('inventory',rows('inventory',r=><><div className="cmd-record-main"><strong>{r.name} {amount(r.stock_count)<=amount(r.reorder_at)?<span className="cmd-warning-text">LOW STOCK</span>:null}</strong><small>Unit cost {money(amount(r.unit_cost))} · Sale price {money(amount(r.sale_price))}</small></div><div className="cmd-record-right"><b>{r.stock_count} units</b><div className="cmd-quick-actions">{adjusting===r.id?<form className="cmd-stock-editor" onSubmit={e=>{e.preventDefault();const n=Number(stockValue);if(!Number.isSafeInteger(n)||n<0){setNotice({message:'Enter a valid whole number.',error:true});return;}void update('inventory',r.id,{stock_count:n});setAdjusting(null)}}><label><span className="cmd-sr-only">Updated inventory units</span><input autoFocus type="number" min="0" step="1" value={stockValue} onChange={e=>setStockValue(e.target.value)}/></label><button type="submit" disabled={working}>Save stock</button><button type="button" onClick={()=>setAdjusting(null)}>Cancel</button></form>:<button type="button" disabled={working} onClick={()=>{setAdjusting(r.id);setStockValue(String(r.stock_count))}}>Adjust stock</button>}</div></div></>),'STOCK ON HAND')}
 {frame('concession_sales',<><p className="cmd-fine cmd-spacing">Submitting a sale atomically reduces inventory and records the sale price and cost at the time of purchase. Sales are append-only.</p>{rows('concession_sales',r=><><div className="cmd-record-main"><strong>{records.inventory.find(i=>i.id===r.item_id)?.name||'Item'}</strong><small>{r.quantity} sold · {labelGame(r.game_id)} · {stamp(r.recorded_at)}</small></div><div className="cmd-record-right"><b className="cmd-positive">+{money(amount(r.quantity)*amount(r.unit_price))}</b><small>Gross {money(amount(r.quantity)*(amount(r.unit_price)-amount(r.unit_cost)))}</small></div></>)}</>,'POINT OF SALE RECORDS')}</>;
 const gameRevenue=<>
 <section className="cmd-info"><strong>Financial control:</strong> Only recorded and reconciled entries count toward game revenue. Concession transactions are tracked separately. This report excludes projected income and any unassigned receipts.</section>
 <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">GAME-DAY PERFORMANCE</p><h3>Revenue & Settlement Reports</h3></div><div className="cmd-export-controls"><select aria-label="Filter by game" value={gameFilter} onChange={e=>setGameFilter(e.target.value)}><option value="">All games with transactions</option>{games.map(g=><option key={g.id} value={g.id}>{labelGame(g.id)} · {stamp(g.scheduled_at)}</option>)}</select><button type="button" className="cmd-add" onClick={()=>{setActive('finance');reset('ledger')}}>+ Record revenue</button></div></div>
 <div className="cmd-report-table"><div className="cmd-report-row cmd-report-head"><span>MATCHUP / GAME DATE</span><span>REVENUE</span><span>EXPENSES</span><span>CONCESSIONS</span><span>NET INDICATOR</span></div>
 {games.filter(g=>gameFilter?g.id===gameFilter:ledActual.some(t=>t.game_id===g.id)||records.concession_sales.some(s=>s.game_id===g.id)).map(g=>{
 const tx=ledActual.filter(t=>t.game_id===g.id);const gain=tx.filter(t=>t.direction==='income').reduce((n,t)=>n+amount(t.amount),0);const cost=tx.filter(t=>t.direction==='expense').reduce((n,t)=>n+amount(t.amount),0);
 const sales=records.concession_sales.filter(s=>s.game_id===g.id);const gross=sales.reduce((n,s)=>n+amount(s.quantity)*amount(s.unit_price),0);const cogs=sales.reduce((n,s)=>n+amount(s.quantity)*amount(s.unit_cost),0);
 const net=gain-cost+gross-cogs;
 return <div key={g.id} className="cmd-report-row"><span><strong>{labelGame(g.id)}</strong><small>{stamp(g.scheduled_at)} · {pretty(g.status)}</small></span><b className="cmd-positive">{money(gain)}</b><b className="cmd-negative">{money(cost)}</b><b>{money(gross)}</b><b className={net>=0?'cmd-positive':'cmd-negative'}>{money(net)}</b></div>})}
 {!gameFilter&&!games.some(g=>ledActual.some(t=>t.game_id===g.id)||records.concession_sales.some(s=>s.game_id===g.id))?emptyState('game-linked transactions'):null}
 </div><p className="cmd-fine">Net indicator = ledger income − ledger expenses + concession gross sales − concession cost of goods sold. This is an operations estimate, not an audited profit-and-loss statement. Do not duplicate concession revenues or merchandise inventory costs in the ledger.</p></section></>;
 const franchises=<><div className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">LEAGUEAPPS SYNCED FRANCHISES</p><h3>Statewide Franchise Network</h3></div><Link className="cmd-secondary-link" href="/admin/leagueapps">LeagueApps administration →</Link></div><div className="cmd-franchise-grid">{teams.map(team=><div key={team.id} className="cmd-franchise"><div className="cmd-franchise-icon">{team.name.slice(0,1)}</div><div><strong>{team.name}</strong><small>{team.city||'Virginia'} · {records.venues.find(v=>v.home_team_id===team.id)?.name||'Home court not assigned'}</small></div></div>)}</div>{!teams.length&&emptyState('active franchises')}<p className="cmd-fine">Official teams and game records are managed by LeagueApps / RCH. Command Center assigns the business plan and home-court scouting information; it does not duplicate rosters.</p></div></>;
 const trades=<><section className="cmd-info"><strong>Roster safety:</strong> Approval here documents a proposed transaction only. It does not automatically transfer a player in LeagueApps or RCH. Official roster changes require a separately verified workflow.</section>{frame('trades',rows('trades',r=><><div className="cmd-record-main"><strong>{labelTeam(r.sending_team_id)} → {labelTeam(r.receiving_team_id)}</strong><small>{r.proposal}</small><small>{stamp(r.created_at)}</small></div><div className="cmd-record-right">{status(r,'trades','status',['proposed','under_review','approved','rejected','cancelled'])}</div></>),'FRONT OFFICE TRANSACTIONS')}</>;
 const stories=<><section className="cmd-info"><strong>Editorial integrity:</strong> Storyline plans are creative production notes. They cannot alter official games, standings or results. Publishing to RCH TV requires a separate editorial action.</section>{frame('stories',rows('stories',r=><><div className="cmd-record-main"><strong>{r.title}</strong><small>{pretty(r.format)} · {labelTeam(r.team_id)} · Target {dateOnly(r.scheduled_for)}</small><p className="cmd-snippet">{r.narrative}</p></div><div className="cmd-record-right">{status(r,'stories','status',['draft','review','approved','released'])}</div></>),'RCL CINEMATIC UNIVERSE')}</>;
 const operations=<>{cards([{label:'OPEN TASKS',value:String(records.tasks.filter(r=>r.status==='open').length),detail:'Waiting for assignment'},{label:'IN PROGRESS',value:String(records.tasks.filter(r=>r.status==='in_progress').length),detail:'Active on game-day'},{label:'COMPLETED',value:String(records.tasks.filter(r=>r.status==='done').length),detail:'Tracked to completion'},{label:'URGENT',value:String(records.tasks.filter(r=>r.status!=='done'&&r.priority==='urgent').length),detail:'Require priority attention'}])}
 {frame('tasks',rows('tasks',r=><><div className="cmd-record-main"><strong>{r.title} {r.priority==='urgent'?<span className="cmd-warning-text">URGENT</span>:null}</strong><small>{pretty(r.category)} · {labelTeam(r.team_id)} · Due {dateOnly(r.due_on)}</small><small>{r.notes}</small></div><div className="cmd-record-right">{status(r,'tasks','status',['open','in_progress','done'])}</div></>),'GAME DAY · STAFFING · DELIVERABLES')}</>;
 const audit=<div className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">READ-ONLY SECURITY RECORD</p><h3>Administrative Change History</h3></div></div>{rows('audit',r=><><div className="cmd-record-main"><strong>{pretty(r.operation)} · {pretty(r.table_name).replace('rcl command ','')}</strong><small>Record {r.record_id} · Actor {r.actor_id||'system'}</small></div><div className="cmd-record-right"><small>{stamp(r.created_at)}</small></div></>)}<p className="cmd-fine">Most operational record changes are logged with before and after snapshots. Audit history cannot be edited or deleted from the application.</p></div>;
 const screens:Record<Area,React.ReactNode>={overview,finance,revenue:gameRevenue,venues,concessions,franchises,trades,stories,operations,audit};
 return <div className="command-app"><aside className={'cmd-sidebar '+(menuOpen?'cmd-sidebar-open':'')}><div className="cmd-brand"><div className="cmd-brand-r">R</div><div><b>RCL COMMAND</b><span>LEAGUE OPERATIONS</span></div></div><div className="cmd-side-tag"><span className="cmd-live-dot"/>PRIVATE OPERATIONS NETWORK</div><nav aria-label="Command Center modules">{nav.map((n,i)=><div key={n.id}>{i===0||nav[i-1].group!==n.group?<p className="cmd-nav-group">{n.group}</p>:null}<button className={'cmd-nav-item '+(active===n.id?'active':'')} onClick={()=>{setActive(n.id);setMenuOpen(false);reset(null)}} type="button"><n.icon size={15}/><span>{n.name}</span>{active===n.id?<span className="cmd-active-line"/>:null}</button></div>)}</nav><div className="cmd-side-footer"><Link href="/admin">← RCH Admin</Link><small>RCL COMMAND CENTER · SECURE</small></div></aside><div className="cmd-workspace"><header className="cmd-topbar"><div className="cmd-top-left"><button type="button" className="cmd-menu-toggle" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle navigation">☰</button><span className="cmd-route">RICH CITY LEAGUE <span>/</span> {nav.find(n=>n.id===active)?.name.toUpperCase()}</span></div><div className="cmd-top-actions"><span className="cmd-access"><FaUserShield size={12}/> ADMIN SECURE</span><button type="button" className="cmd-refresh cmd-install" onClick={async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;setInstallPrompt(null);}else setNotice({message:'To install: open this page in Safari, select Share, then Add to Home Screen. On desktop Chrome use Install App in the browser menu.',error:false})}}>↓ INSTALL</button><button type="button" onClick={()=>void load()} className="cmd-refresh" disabled={busy}>↻ <span>SYNC VIEW</span></button></div></header><main className="cmd-content" id="command-main"><div className="cmd-section-heading"><div><p className="cmd-eyebrow">COMMAND DIVISION {iconMap[active]} / 10</p><h1>{nav.find(n=>n.id===active)?.name}</h1></div><div className="cmd-timestamp"><FaClock size={13}/> LIVE RCH DATA</div></div>{notice?<div role="status" className={'cmd-notice '+(notice.error?'error':'')}><span>{notice.message}</span><button type="button" onClick={()=>setNotice(null)} aria-label="Dismiss message">×</button></div>:null}{busy?<div className="cmd-loading" role="status"><span className="cmd-loading-r">R</span><p>Synchronizing league operations…</p></div>:screens[active]}<footer className="cmd-footer">RICH CITY LEAGUE · LEAGUE COMMAND SYSTEM <span>OPERATIONS ARE RESTRICTED TO AUTHORIZED ADMINISTRATORS</span></footer></main></div></div>;
}
