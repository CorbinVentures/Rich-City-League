'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const CommandEntertainment = dynamic(() => import('./CommandEntertainment').then(m=>m.CommandEntertainment), {loading:()=> <p className="cmd-empty">Loading entertainment desk…</p>});
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import { CommandVenueDirectory } from './CommandVenueDirectory';
import { CommandGameRevenue } from './CommandGameRevenue';
import { CommandConcessionCatalog } from './CommandConcessionCatalog';
import { CommandFranchiseHQ } from './CommandFranchiseHQ';
import { CommandStorylineStudio } from './CommandStorylineStudio';
import { CommandSmartOperations } from './CommandSmartOperations';
import { budgetTemplates, incomeTemplates, expenseTemplates, templatesFor, labelFor } from '@/lib/command/templates';
import { FaArrowRight, FaBasketball, FaBuilding, FaCalendarDays, FaChartLine, FaClock, FaCreditCard, FaFileLines, FaPeopleGroup, FaUserShield } from 'react-icons/fa6';

type Row = Record<string, any> & { id: string };
type Area = 'overview'|'revenue'|'finance'|'venues'|'concessions'|'trades'|'stories'|'entertainment'|'operations'|'franchises'|'audit';
type Kind = 'budgets'|'ledger'|'venues'|'bookings'|'inventory'|'concession_sales'|'trades'|'stories'|'tasks'|'audit';
type Field = {name:string; label:string; type?:string;required?:boolean;options?:string[];lookup?:'teams'|'games'|'venues'|'inventory'|'seasons'|'players';hint?:string};
const tables:Record<Kind,string> = {
 budgets:'rcl_command_budgets',ledger:'rcl_command_ledger',venues:'rcl_command_venues',
 bookings:'rcl_command_bookings',inventory:'rcl_command_inventory',concession_sales:'rcl_command_concession_sales',
 trades:'rcl_command_trades',stories:'rcl_command_stories',tasks:'rcl_command_tasks',audit:'rcl_command_audit'
};
const kinds = Object.keys(tables) as Kind[];
const empty = ():Record<Kind,Row[]> => Object.fromEntries(kinds.map(k=>[k,[]])) as unknown as Record<Kind,Row[]>;
const nav: {id:Area;name:string;group:string;icon:React.ComponentType<{size?:number}>}[] = [
 {id:'overview',name:'Executive Overview',group:'COMMAND',icon:FaChartLine},
 {id:'finance',name:'Financial Office',group:'BUSINESS',icon:FaCreditCard},
 {id:'revenue',name:'Game Revenue',group:'BUSINESS',icon:FaChartLine},
 {id:'venues',name:'Venues & Bookings',group:'BUSINESS',icon:FaBuilding},
 {id:'concessions',name:'Concessions',group:'BUSINESS',icon:FaBasketball},
 {id:'franchises',name:'Franchise HQ',group:'LEAGUE',icon:FaPeopleGroup},
 {id:'trades',name:'Trade Portal',group:'LEAGUE',icon:FaArrowRight},
 {id:'stories',name:'Storyline Studio',group:'PRODUCTION',icon:FaFileLines},
 {id:'entertainment',name:'Entertainment',group:'PRODUCTION',icon:FaPeopleGroup},
 {id:'operations',name:'Game-Day Operations',group:'PRODUCTION',icon:FaCalendarDays},
 {id:'audit',name:'Audit Trail',group:'SECURITY',icon:FaUserShield},
];
const schemas: Record<Exclude<Kind,'audit'>,Field[]> = {
 budgets:[
  {name:'category',label:'Standard basketball operating budget category',options:budgetTemplates.map(t=>t.code),required:true},
  {name:'units',label:'Quantity / rental hours / games (optional)',type:'number',hint:'Examples: 18 jerseys, 20 gym hours, 10 games.'},
  {name:'unit_price',label:'Cost per unit / hour ($, optional)',type:'number',hint:'Leave both quantities blank for a fixed dollar allocation.'},
  {name:'planned_amount',label:'Flat budget allocation ($) if no quantity/rate',type:'number'},
  {name:'season_id',label:'Season',lookup:'seasons'},{name:'team_id',label:'Franchise',lookup:'teams'},
  {name:'notes',label:'Budget notes',type:'textarea'},
 ],
 ledger:[
  {name:'direction',label:'Record type',options:['income','expense'],required:true},
  {name:'category',label:'RCL standard income / expense template',options:[...incomeTemplates,...expenseTemplates].map(t=>t.code),required:true},
  {name:'amount',label:'Amount ($)',type:'number',required:true},
  {name:'state',label:'Verification',options:['projected','recorded','reconciled'],required:true,hint:'Projected money is excluded from actual totals.'},
  {name:'occurred_on',label:'Date',type:'date',required:true},
  {name:'game_id',label:'Related game',lookup:'games'},{name:'team_id',label:'Franchise',lookup:'teams'},
  {name:'season_id',label:'Season',lookup:'seasons'},{name:'reference',label:'Invoice / receipt reference'},
 ],
 venues:[
  {name:'name',label:'Gym or venue',required:true},{name:'city',label:'City / area',required:true},
  {name:'address',label:'Street address'},{name:'hourly_rate',label:'Published / quoted BASE gym rate ($/hr)',type:'number'},
  {name:'rate_basis',label:'Price evidence',options:['unknown','published','quoted'],hint:'Published fee and private quote are different levels of evidence.'},
  {name:'effective_hourly_rate',label:'Known total hourly rate after extra charges ($)',type:'number'},
  {name:'rate_details',label:'Pricing terms, residency, deposits and minimums',type:'textarea'},
  {name:'availability_details',label:'Availability research (not guaranteed bookings)',type:'textarea'},
  {name:'phone',label:'Facility phone'},{name:'email',label:'Facility email'},
  {name:'source_url',label:'Official facility / rental source URL'},
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
const iconMap:Record<Area,string>={overview:'01',finance:'02',revenue:'03',venues:'04',concessions:'05',franchises:'06',trades:'07',stories:'08',entertainment:'09',operations:'10',audit:'11'};
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const amount=(n:any)=>Number(n||0);
const pretty=(v:unknown)=>String(v??'').replaceAll('_',' ');
const stamp=(s?:string)=>s?new Date(s).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'}):'—';
const dateOnly=(s?:string)=>s?new Date(s+'T12:00:00').toLocaleDateString('en-US',{dateStyle:'medium'}):'—';

export function CommandDashboard(){
 const db = useMemo(()=>getSupabaseClient() as unknown as SupabaseClient<any> | null,[]);
 const [active,setActive]=useState<Area>('overview');
 const [studioDirty,setStudioDirty]=useState(false);
 const [records,setRecords]=useState<Record<Kind,Row[]>>(empty);
 const [venueStats,setVenueStats]=useState({total:0,priced:0,potential:0});
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
  const [installPrompt,setInstallPrompt]=useState<{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}|null>(null);
 const load=useCallback(async()=>{
  if(!db) {setNotice({message:'Supabase connection unavailable.',error:true});setBusy(false);return;}
  setBusy(true);
  try{
   const [all,teamQ,gameQ,seasonQ,playerQ,venueStatQ]=await Promise.all([
    Promise.all(kinds.map(async kind=>({kind, result:await db.from(tables[kind]).select('*').order(kind==='concession_sales'?'recorded_at':'created_at',{ascending:false}).limit(kind==='audit'?120:400)}))),
    db.from('teams').select('id,name,city,logo_url,is_active').eq('is_active',true).order('name').limit(200),
    db.from('games').select('id,home_team_id,away_team_id,scheduled_at,status,home_score,away_score').order('scheduled_at',{ascending:false}).limit(250),
    db.from('seasons').select('id,name,start_date,status').order('start_date',{ascending:false}).limit(40),
    db.from('players').select('id,first_name,last_name').limit(500),
    Promise.all([
     db.from('rcl_command_venues').select('id',{head:true,count:'exact'}),
     db.from('rcl_command_venues').select('id',{head:true,count:'exact'}).not('hourly_rate','is',null),
     db.from('rcl_command_venues').select('id',{head:true,count:'exact'}).in('budget_status',['within_limit','conditional']),
    ])
   ]);
   const failed=all.find(x=>x.result.error);
   const error=failed?.result.error || teamQ.error || gameQ.error || seasonQ.error || playerQ.error || venueStatQ.find(s=>s.error)?.error;
   if(error) throw new Error(error.message);
   setRecords(Object.fromEntries(all.map(({kind,result})=>[kind,result.data??[]])) as unknown as Record<Kind,Row[]>);
   setVenueStats({total:venueStatQ[0].count??0,priced:venueStatQ[1].count??0,potential:venueStatQ[2].count??0});
   setTeams(teamQ.data??[]);setGames(gameQ.data??[]);setSeasons(seasonQ.data??[]);setPlayers(playerQ.data??[]);
  }catch(error){setNotice({message:error instanceof Error?error.message:'Could not load Command Center records.',error:true});}
  finally{setBusy(false);}
 },[db]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{const fromHash=()=>{const target=window.location.hash.slice(1);if(nav.some(n=>n.id===target))setActive(target as Area)};fromHash();window.addEventListener('hashchange',fromHash);return()=>window.removeEventListener('hashchange',fromHash)},[]);
 useEffect(()=>{const onPrompt=(event:Event)=>{event.preventDefault();setInstallPrompt(event as Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>})};window.addEventListener('beforeinstallprompt',onPrompt);return()=>window.removeEventListener('beforeinstallprompt',onPrompt)},[]);
 const labelTeam=(id?:string)=>teams.find(t=>t.id===id)?.name||'League-wide';
 const labelVenue=(id?:string)=>records.venues.find(v=>v.id===id)?.name||'Unassigned venue';
 const labelGame=(id?:string)=>{if(!id)return 'All games';const g=games.find(x=>x.id===id);return g?labelTeam(g.home_team_id)+' vs '+labelTeam(g.away_team_id):'Game record'};
 const options=(f:Field)=>{
  if(f.name==='category'&&editing==='budgets')return budgetTemplates.map(t=>({value:t.code,label:t.group+' / '+t.label}));
  if(f.name==='category'&&editing==='ledger')return templatesFor(form.direction==='income'?'income':'expense').map(t=>({value:t.code,label:t.group+' / '+t.label}));
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
 const reset=(kind:Kind|null)=>{setEditing(kind);setForm(kind==='ledger'?{direction:'expense',category:expenseTemplates[0].code,state:'projected',occurred_on:new Date().toISOString().slice(0,10)}:kind==='budgets'?{category:budgetTemplates[0].code}:{});setNotice(null)};
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
  if(kind==='budgets'){
    if(!budgetTemplates.some(t=>t.code===payload.category)){setNotice({message:'Select a recognized basketball season budget category.',error:true});return;}
    payload.title=labelFor(String(payload.category));
    const qty=payload.units,price=payload.unit_price;
    if((qty===undefined)!==(price===undefined)){setNotice({message:'Enter both quantity and unit cost, or leave both blank for a flat budget.',error:true});return;}
    if(qty!==undefined&&price!==undefined)payload.planned_amount=Math.round(Number(qty)*Number(price)*100)/100;
    if(payload.planned_amount===undefined){setNotice({message:'Enter a flat budget amount or quantity and unit cost.',error:true});return;}
  }
  if(kind==='ledger'){
    if(!templatesFor(payload.direction==='income'?'income':'expense').some(t=>t.code===payload.category)){
      setNotice({message:'Select an approved income or expense template.',error:true});return;
    }
    if(payload.state!=='projected'&&!payload.reference){setNotice({message:'Actual receipts and payments require an invoice, deposit or settlement reference.',error:true});return;}
    payload.description=labelFor(String(payload.category));
  }
  if(kind==='venues'){
    const rawRate=payload.hourly_rate;
    if(rawRate!==undefined){
      if(!payload.rate_basis || payload.rate_basis==='unknown'){setNotice({message:'Choose Published or Quoted for the hourly gym rental rate.',error:true});return;}
      const basic=Number(rawRate);const allIn=payload.effective_hourly_rate===undefined?null:Number(payload.effective_hourly_rate);
      const conditions=String(payload.rate_details||'');
      payload.budget_status=(/resident|minimum|staff|additional|peak|weekend|ticket|eligib|package|off-peak/i.test(conditions))?'conditional':((allIn??basic)<=75?'within_limit':'over_limit');
    }
    payload.source_verification='manual';
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
    {field.type==='textarea'?<textarea rows={3} maxLength={5000} value={form[field.name]??''} onChange={e=>setForm(x=>field.name==='direction'?({...x,direction:e.target.value,category:e.target.value==='income'?incomeTemplates[0].code:expenseTemplates[0].code}):({...x,[field.name]:e.target.value}))} required={field.required}/>:
    (field.options||field.lookup)?<select required={field.required} value={form[field.name]??''} onChange={e=>setForm(x=>({...x,[field.name]:e.target.value}))}><option value="">Select {field.label.toLowerCase()}</option>{options(field).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:
    <input required={field.required} type={field.type||'text'} step={field.type==='number'?(field.name==='stock_count'||field.name==='quantity'||field.name==='capacity'||field.name==='reorder_at'?'1':'0.01'):undefined} min={field.type==='number'?'0':undefined} maxLength={field.type==='number'?undefined:200} value={form[field.name]??''} onChange={e=>setForm(x=>({...x,[field.name]:e.target.value}))}/>}
    {field.hint&&<small>{field.hint}</small>}</label>)}
   {kind==='budgets' && form.units!==undefined && form.unit_price!==undefined && form.units!=='' && form.unit_price!==''?
    <div className="cmd-budget-auto-preview cmd-wide"><span>AUTOMATIC CATEGORY BUDGET</span><strong>{money(Math.round(Number(form.units)*Number(form.unit_price)*100)/100)}</strong><small>{form.units} units × {money(Number(form.unit_price))} each · This becomes the approved allocation instead of the flat amount.</small></div>:null}
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
 <div className="cmd-columns"><section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">LEAGUE SNAPSHOT</p><h3>Front Office Briefing</h3></div></div><div className="cmd-brief-grid"><div><span>Approved budget lines</span><strong>{money(budgetTotal)}</strong></div><div><span>Venue commitment estimate</span><strong>{money(venueExposure)}</strong></div><div><span>Projected ledger net</span><strong>{money(projected)}</strong></div><div><span>Concession gross margin</span><strong>{money(grossSales-concessionCost)}</strong></div><div><span>Active franchises</span><strong>{teams.length}</strong></div><div><span>Scouted gym leads</span><strong>{venueStats.total}</strong></div></div><p className="cmd-fine">Ledger totals and concession sales are deliberately separate to prevent accidental double counting. Venue commitments are estimates, not confirmed expenses.</p></section>
 <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">LEAGUEAPPS + SCOREBOOK</p><h3>Upcoming Matchups</h3></div></div>{upcoming.length?upcoming.map(g=><div className="cmd-mini" key={g.id}><strong>{labelGame(g.id)}</strong><span>{stamp(g.scheduled_at)}</span></div>):emptyState('upcoming games')}<p className="cmd-fine">Official game details are read from the existing RCH database. Command does not overwrite game results.</p></section></div></>;
 const finance=<><section className="cmd-info"><strong>Guided finance templates:</strong> Select the standardized basketball cost or income category and enter only the amount, season, team and supporting evidence. Category names are controlled to protect reporting consistency. Game-specific tickets and sponsorships can also be entered directly in Game Revenue; concession sales belong in the Concessions POS.</section>{cards([{label:'OPERATING BUDGET',value:money(budgetTotal),detail:records.budgets.length+' budget lines'},{label:'ACTUAL INCOME',value:money(income),detail:'Recorded and reconciled only'},{label:'ACTUAL EXPENSES',value:money(expenses),detail:'Recorded and reconciled only'},{label:'LEDGER NET',value:money(income-expenses),detail:'Excludes concession inventory and sales'}])}
 {frame('budgets',rows('budgets',r=><><div className="cmd-record-main"><strong>{r.title}</strong><small>{labelFor(r.category)} · {labelTeam(r.team_id)} · {seasons.find(s=>s.id===r.season_id)?.name||'All seasons'}</small>{r.units!==null&&r.unit_price!==null?<small>{Number(r.units).toLocaleString('en-US')} units × {money(amount(r.unit_price))} each</small>:null}</div><div className="cmd-record-right"><b>{money(amount(r.planned_amount))}</b><small>{r.notes||'Budget allocation'}</small></div></>),'PLANNING & ALLOCATIONS')}
 {frame('ledger',<><p className="cmd-fine cmd-spacing">Projected transactions do not count as actual cash. Reconcile against supporting receipts before reporting finalized totals. Enter concession sales through the Concessions module, not twice.</p>{rows('ledger',r=><><div className="cmd-record-main"><strong>{r.description}</strong><small>{labelFor(r.category)} · {dateOnly(r.occurred_on)} · {labelGame(r.game_id)}</small></div><div className="cmd-record-right"><b className={r.direction==='income'?'cmd-positive':'cmd-negative'}>{r.direction==='income'?'+':'−'}{money(amount(r.amount))}</b>{status(r,'ledger','state',['projected','recorded','reconciled','void'])}</div></>)}</>,'VERIFIED TRANSACTION LEDGER')}</>;
 const venues=<>
 {cards([{label:'GYM LEADS INDEXED',value:String(venueStats.total),detail:'Statewide research leads, not confirmed rentals'},
 {label:'POTENTIAL ≤ $75/HR',value:String(venueStats.potential),detail:'Includes conditional eligibility and off-peak prices'},
 {label:'PUBLISHED / QUOTED RATES',value:String(venueStats.priced),detail:'Review each location’s rental conditions'},
 {label:'CONFIRMED BOOKING RECORDS',value:String(records.bookings.filter(b=>b.status==='confirmed').length),detail:'RCL staff bookings, not external live inventory'}])}
 {frame('venues',<CommandVenueDirectory/>,'VIRGINIA FACILITY INTELLIGENCE · VERIFIED SOURCE LINKS')}
 {frame('bookings',<><p className="cmd-fine cmd-spacing">A gym listing is not a court reservation. Contact venues directly to confirm your date, insurance, filming, spectators and approval before setting a booking to confirmed.</p>{rows('bookings',r=><><div className="cmd-record-main"><strong>{labelVenue(r.venue_id)}</strong><small>{labelTeam(r.team_id)} · {labelGame(r.game_id)}</small><small>{stamp(r.starts_at)} — {stamp(r.ends_at)}</small></div><div className="cmd-record-right"><b>{money(Math.max(0,(new Date(r.ends_at).getTime()-new Date(r.starts_at).getTime())/3600000)*amount(r.hourly_rate))}</b>{status(r,'bookings','status',['tentative','confirmed','cancelled'])}</div></>)}</>,'HOME COURTS · GAME-DAY RESERVATIONS')}</>;
 const concessions=<><CommandConcessionCatalog onActivated={load}/>{cards([{label:'SALES REVENUE',value:money(grossSales),detail:'Recorded sale transactions'},{label:'SOLD UNIT COST',value:money(concessionCost),detail:'Cost at time of sale'},{label:'GROSS PROFIT',value:money(grossSales-concessionCost),detail:'Before staffing / rental overhead'},{label:'LOW STOCK ITEMS',value:String(records.inventory.filter(i=>i.active&&amount(i.stock_count)<=amount(i.reorder_at)).length),detail:'At or below reorder point'}])}
 {frame('inventory',rows('inventory',r=><><div className="cmd-record-main"><strong>{r.name} {amount(r.stock_count)<=amount(r.reorder_at)?<span className="cmd-warning-text">LOW STOCK</span>:null}</strong><small>Unit cost {money(amount(r.unit_cost))} · Sale price {money(amount(r.sale_price))}</small></div><div className="cmd-record-right"><b>{r.stock_count} units</b><div className="cmd-quick-actions">{adjusting===r.id?<form className="cmd-stock-editor" onSubmit={e=>{e.preventDefault();const n=Number(stockValue);if(!Number.isSafeInteger(n)||n<0){setNotice({message:'Enter a valid whole number.',error:true});return;}void update('inventory',r.id,{stock_count:n});setAdjusting(null)}}><label><span className="cmd-sr-only">Updated inventory units</span><input autoFocus type="number" min="0" step="1" value={stockValue} onChange={e=>setStockValue(e.target.value)}/></label><button type="submit" disabled={working}>Save stock</button><button type="button" onClick={()=>setAdjusting(null)}>Cancel</button></form>:<button type="button" disabled={working} onClick={()=>{setAdjusting(r.id);setStockValue(String(r.stock_count))}}>Adjust stock</button>}</div></div></>),'STOCK ON HAND')}
 {frame('concession_sales',<><p className="cmd-fine cmd-spacing">Submitting a sale atomically reduces inventory and records the sale price and cost at the time of purchase. Sales are append-only.</p>{rows('concession_sales',r=><><div className="cmd-record-main"><strong>{records.inventory.find(i=>i.id===r.item_id)?.name||'Item'}</strong><small>{r.quantity} sold · {labelGame(r.game_id)} · {stamp(r.recorded_at)}</small></div><div className="cmd-record-right"><b className="cmd-positive">+{money(amount(r.quantity)*amount(r.unit_price))}</b><small>Gross {money(amount(r.quantity)*(amount(r.unit_price)-amount(r.unit_cost)))}</small></div></>)}</>,'POINT OF SALE RECORDS')}</>;
 const gameRevenue=<CommandGameRevenue/>;
 const franchises=<CommandFranchiseHQ/>;
 const trades=<><section className="cmd-info"><strong>Roster safety:</strong> Approval here documents a proposed transaction only. It does not automatically transfer a player in LeagueApps or RCH. Official roster changes require a separately verified workflow.</section>{frame('trades',rows('trades',r=><><div className="cmd-record-main"><strong>{labelTeam(r.sending_team_id)} → {labelTeam(r.receiving_team_id)}</strong><small>{r.proposal}</small><small>{stamp(r.created_at)}</small></div><div className="cmd-record-right">{status(r,'trades','status',['proposed','under_review','approved','rejected','cancelled'])}</div></>),'FRONT OFFICE TRANSACTIONS')}</>;
 const stories=<><CommandStorylineStudio onDirtyChange={setStudioDirty}/>{records.stories.length>0&&frame('stories',rows('stories',r=><><div className="cmd-record-main"><strong>{r.title}</strong><p className="cmd-snippet">{r.narrative}</p></div><small>{pretty(r.status)}</small></>),'LEGACY CREATIVE NOTES')}</>;
 const operations=<><CommandSmartOperations/>{cards([{label:'OPEN TASKS',value:String(records.tasks.filter(r=>r.status==='open').length),detail:'Waiting for assignment'},{label:'IN PROGRESS',value:String(records.tasks.filter(r=>r.status==='in_progress').length),detail:'Active on game-day'},{label:'COMPLETED',value:String(records.tasks.filter(r=>r.status==='done').length),detail:'Tracked to completion'},{label:'URGENT',value:String(records.tasks.filter(r=>r.status!=='done'&&r.priority==='urgent').length),detail:'Require priority attention'}])}
 {frame('tasks',rows('tasks',r=><><div className="cmd-record-main"><strong>{r.title} {r.priority==='urgent'?<span className="cmd-warning-text">URGENT</span>:null}</strong><small>{pretty(r.category)} · {labelTeam(r.team_id)} · Due {dateOnly(r.due_on)}</small><small>{r.notes}</small></div><div className="cmd-record-right">{status(r,'tasks','status',['open','in_progress','done'])}</div></>),'GAME DAY · STAFFING · DELIVERABLES')}</>;
 const audit=<div className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">READ-ONLY SECURITY RECORD</p><h3>Administrative Change History</h3></div></div>{rows('audit',r=><><div className="cmd-record-main"><strong>{pretty(r.operation)} · {pretty(r.table_name).replace('rcl command ','')}</strong><small>Record {r.record_id} · Actor {r.actor_id||'system'}</small></div><div className="cmd-record-right"><small>{stamp(r.created_at)}</small></div></>)}<p className="cmd-fine">Most operational record changes are logged with before and after snapshots. Audit history cannot be edited or deleted from the application.</p></div>;
 const screens:Record<Area,React.ReactNode>={overview,finance,revenue:gameRevenue,venues,concessions,franchises,trades,stories,entertainment:<CommandEntertainment onDirtyChange={setStudioDirty}/>,operations,audit};
 return <div className="command-app"><aside className={'cmd-sidebar '+(menuOpen?'cmd-sidebar-open':'')}><div className="cmd-brand"><div className="cmd-brand-r">R</div><div><b>RCL COMMAND</b><span>LEAGUE OPERATIONS</span></div></div><div className="cmd-side-tag"><span className="cmd-live-dot"/>PRIVATE OPERATIONS NETWORK</div><nav aria-label="Command Center modules">{nav.map((n,i)=><div key={n.id}>{i===0||nav[i-1].group!==n.group?<p className="cmd-nav-group">{n.group}</p>:null}<button className={'cmd-nav-item '+(active===n.id?'active':'')} onClick={()=>{if(studioDirty&&n.id!==active&&!window.confirm('Discard unsaved workspace changes?'))return;setActive(n.id);setMenuOpen(false);reset(null)}} type="button"><n.icon size={15}/><span>{n.name}</span>{active===n.id?<span className="cmd-active-line"/>:null}</button></div>)}</nav><div className="cmd-side-footer"><Link href="/admin">← RCH Admin</Link><small>RCL COMMAND CENTER · SECURE</small></div></aside><div className="cmd-workspace"><header className="cmd-topbar"><div className="cmd-top-left"><button type="button" className="cmd-menu-toggle" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle navigation">☰</button><span className="cmd-route">RICH CITY LEAGUE <span>/</span> {nav.find(n=>n.id===active)?.name.toUpperCase()}</span></div><div className="cmd-top-actions"><span className="cmd-access"><FaUserShield size={12}/> ADMIN SECURE</span><button type="button" className="cmd-refresh cmd-install" onClick={async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;setInstallPrompt(null);}else setNotice({message:'To install: open this page in Safari, select Share, then Add to Home Screen. On desktop Chrome use Install App in the browser menu.',error:false})}}>↓ INSTALL</button><button type="button" onClick={()=>{if(!studioDirty||window.confirm('Discard unsaved workspace changes and sync?'))void load()}} className="cmd-refresh" disabled={busy}>↻ <span>SYNC VIEW</span></button></div></header><main className="cmd-content" id="command-main"><div className="cmd-section-heading"><div><p className="cmd-eyebrow">COMMAND DIVISION {iconMap[active]} / 11</p><h1>{nav.find(n=>n.id===active)?.name}</h1></div><div className="cmd-timestamp"><FaClock size={13}/> LIVE RCH DATA</div></div>{notice?<div role="status" className={'cmd-notice '+(notice.error?'error':'')}><span>{notice.message}</span><button type="button" onClick={()=>setNotice(null)} aria-label="Dismiss message">×</button></div>:null}{busy?<div className="cmd-loading" role="status"><span className="cmd-loading-r">R</span><p>Synchronizing league operations…</p></div>:screens[active]}<footer className="cmd-footer">RICH CITY LEAGUE · LEAGUE COMMAND SYSTEM <span>OPERATIONS ARE RESTRICTED TO AUTHORIZED ADMINISTRATORS</span></footer></main></div></div>;
}
