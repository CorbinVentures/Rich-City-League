'use client';

import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseClient} from '@/lib/supabase';
import {gameIncomeTemplates,gameExpenseTemplates,labelFor} from '@/lib/command/templates';
import {FaArrowUpRightFromSquare,FaBasketball,FaChartLine,FaCheck,FaClipboardList,FaTicket,FaUsers} from 'react-icons/fa6';

type Row=Record<string,any>&{id:string};
type TemplateDirection='income'|'expense';
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const amount=(n:any)=>Number(n||0);
const date=(v:string)=>new Date(v).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
type Att={paid_attendance:number|null;complimentary_attendance:number|null;tickets_sold:number|null;attendance_source:string;notes:string};

export function CommandGameRevenue(){
 const db=useMemo(()=>getSupabaseClient() as unknown as SupabaseClient<any>|null,[]);
 const [games,setGames]=useState<Row[]>([]);
 const [teams,setTeams]=useState<Row[]>([]);
 const [ledger,setLedger]=useState<Row[]>([]);
 const [sales,setSales]=useState<Row[]>([]);
 const [reports,setReports]=useState<Row[]>([]);
 const [selected,setSelected]=useState('');
 const [direction,setDirection]=useState<TemplateDirection>('income');
 const [category,setCategory]=useState('ticket_general');
 const [cash,setCash]=useState('');
 const [reference,setReference]=useState('');
 const [status,setStatus]=useState('projected');
 const [paid,setPaid]=useState('');
 const [complimentary,setComplimentary]=useState('');
 const [tickets,setTickets]=useState('');
 const [source,setSource]=useState('not_recorded');
 const [notes,setNotes]=useState('');
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const load=useCallback(async()=>{
  if(!db){setError('Secure database connection required.');setLoading(false);return}
  const [g,t,l,s,r]=await Promise.all([
   db.from('games').select('id,home_team_id,away_team_id,scheduled_at,status,home_score,away_score').order('scheduled_at',{ascending:false}).limit(400),
   db.from('teams').select('id,name').eq('is_active',true).limit(200),
   db.from('rcl_command_ledger').select('*').order('created_at',{ascending:false}).limit(1500),
   db.from('rcl_command_concession_sales').select('*').order('recorded_at',{ascending:false}).limit(1500),
   db.from('rcl_command_game_reports').select('*').limit(500),
  ]);
  const err=[g.error,t.error,l.error,s.error,r.error].find(Boolean);
  if(err){setError(err.message);setLoading(false);return}
  setGames(g.data||[]);setTeams(t.data||[]);setLedger(l.data||[]);setSales(s.data||[]);setReports(r.data||[]);
  setSelected(current=>current||g.data?.find((x:Row)=>new Date(x.scheduled_at).getTime()>=Date.now()-86400000)?.id||g.data?.[0]?.id||'');
  setLoading(false);
 },[db]);
 useEffect(()=>{void load()},[load]);
 const team=(id:string)=>teams.find(x=>x.id===id)?.name||'RCL Franchise';
 const gameName=(g:Row)=>team(g.home_team_id)+' vs '+team(g.away_team_id);
 const game=games.find(g=>g.id===selected);
 const entries=ledger.filter(x=>x.game_id===selected && x.state!=='void');
 const actual=entries.filter(x=>['recorded','reconciled'].includes(x.state));
 const rev=actual.filter(x=>x.direction==='income').reduce((v,x)=>v+amount(x.amount),0);
 const costs=actual.filter(x=>x.direction==='expense').reduce((v,x)=>v+amount(x.amount),0);
 const sold=sales.filter(x=>x.game_id===selected);
 const gross=sold.reduce((v,x)=>v+amount(x.quantity)*amount(x.unit_price),0);
 const cogs=sold.reduce((v,x)=>v+amount(x.quantity)*amount(x.unit_cost),0);
 const attendance=reports.find(x=>x.game_id===selected);
 const people=attendance&&(attendance.paid_attendance!==null||attendance.complimentary_attendance!==null)?
  amount(attendance.paid_attendance)+amount(attendance.complimentary_attendance):null;
 const templateOptions=direction==='income'?gameIncomeTemplates:gameExpenseTemplates;
 function chooseGame(id:string){
  setSelected(id);const report=reports.find(x=>x.game_id===id);
  setPaid(report?.paid_attendance==null?'':String(report.paid_attendance));
  setComplimentary(report?.complimentary_attendance==null?'':String(report.complimentary_attendance));
  setTickets(report?.tickets_sold==null?'':String(report.tickets_sold));
  setSource(report?.attendance_source||'not_recorded');setNotes(report?.notes||'');
 }
 useEffect(()=>{
  if(!selected)return;
  const report=reports.find(x=>x.game_id===selected);
  setPaid(report?.paid_attendance==null?'':String(report.paid_attendance));
  setComplimentary(report?.complimentary_attendance==null?'':String(report.complimentary_attendance));
  setTickets(report?.tickets_sold==null?'':String(report.tickets_sold));
  setSource(report?.attendance_source||'not_recorded');setNotes(report?.notes||'');
 // Freshly loaded reports reset the displayed gate log to the database truth.
 },[selected,reports]);
 async function addTransaction(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!selected||busy||!db)return;
  setNotice('');setError('');
  const value=Number(cash);
  if(!Number.isFinite(value)||value<=0||!templateOptions.some(x=>x.code===category)){setError('Choose an approved game revenue/cost type and positive amount.');return}
  if(status!=='projected'&&!reference.trim()){setError('Recorded receipts or expenses require a settlement/receipt reference.');return}
  setBusy(true);
  const inserted=await db.from('rcl_command_ledger').insert({
   game_id:selected,category,direction,amount:Math.round(value*100)/100,
   state:status,occurred_on:new Date().toLocaleDateString('en-CA'),
   description:labelFor(category)+' — '+(game?gameName(game):'RCL game'),
   reference:reference.trim(),
  });
  if(inserted.error)setError(inserted.error.message);else{
   setCash('');setReference('');setNotice('Game transaction saved in the official categorized ledger.');
   await load();
  }
  setBusy(false);
 }
 async function saveAttendance(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!selected||!db||busy)return;
  setNotice('');setError('');
  const parse=(v:string)=>v.trim()===''?null:Number(v);
  const paidCount=parse(paid),compCount=parse(complimentary),soldCount=parse(tickets);
  if([paidCount,compCount,soldCount].some(v=>v!==null&&(!Number.isSafeInteger(v)||v<0))){setError('Gate counts must be nonnegative whole numbers.');return}
  if((paidCount!==null||compCount!==null)&&source==='not_recorded'){setError('Select how attendance was counted before saving people counts.');return}
  setBusy(true);
  const result=await db.from('rcl_command_game_reports').upsert({
   game_id:selected,paid_attendance:paidCount,complimentary_attendance:compCount,
   tickets_sold:soldCount,attendance_source:source,notes:notes.slice(0,1500),
  },{onConflict:'game_id'});
  if(result.error)setError(result.error.message);
  else{setNotice('Gate report saved. Attendance is marked recorded, not assumed from ticket revenue.');await load()}
  setBusy(false);
 }
 return <div className="cmd-finance-special">
  <div className="cmd-info"><strong>Templates control data quality.</strong> Game revenue is limited to ticketing, game sponsorships, vendor fees, premium admissions and other actual event receipts. Concession sales come exclusively from the concession POS; online RCH shop orders are not assumed to be ticket sales. Recorded income requires receipt evidence.</div>
  <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">EVENT SETTLEMENT</p><h3>Game Revenue Command</h3></div><FaBasketball size={21} color="#ff6274"/></div>
   <div className="cmd-game-selector"><label htmlFor="cmd-rev-game">SELECT AN OFFICIAL RCL GAME</label><select id="cmd-rev-game" value={selected} onChange={e=>chooseGame(e.target.value)}>{games.map(g=><option key={g.id} value={g.id}>{date(g.scheduled_at)} · {gameName(g)}</option>)}</select></div>
   {game&&<p className="cmd-fine">Home franchise: {team(game.home_team_id)} · Status: {game.status}. This game’s receipts are attributed to its event, not automatically recognized as a franchise-owned account balance.</p>}
  </section>
  <div className="cmd-metrics">
   {[{label:'GAME REVENUE',value:money(rev),detail:'Recorded and reconciled ledger receipts'},
     {label:'GAME EXPENSES',value:money(costs),detail:'Recorded and reconciled ledger costs'},
     {label:'CONCESSION GROSS',value:money(gross),detail:'POS sales · gross cost '+money(cogs)},
     {label:'EVENT CONTRIBUTION',value:money(rev-costs+gross-cogs),detail:'Estimate: sales less recorded expense and sold unit cost'}].map(x=><article className="cmd-metric" key={x.label}><p>{x.label}</p><strong>{x.value}</strong><small>{x.detail}</small></article>)}
  </div>
  <div className="cmd-columns">
   <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">EMPLOYEE ENTRY</p><h3>Record a categorized receipt or expense</h3></div><FaChartLine color="#ff6877"/></div>
    <form className="cmd-form-grid cmd-inline-form" onSubmit={e=>void addTransaction(e)}>
     <label className="cmd-field"><span>Entry type</span><select value={direction} onChange={e=>{const next=e.target.value as TemplateDirection;setDirection(next);setCategory(next==='income'?gameIncomeTemplates[0].code:gameExpenseTemplates[0].code)}}><option value="income">Game income</option><option value="expense">Game expense</option></select></label>
     <label className="cmd-field"><span>Defined revenue / cost template</span><select required value={category} onChange={e=>setCategory(e.target.value)}>{templateOptions.map(x=><option value={x.code} key={x.code}>{x.label}</option>)}</select></label>
     <label className="cmd-field"><span>Amount in dollars</span><input required type="number" min=".01" step=".01" value={cash} onChange={e=>setCash(e.target.value)}/></label>
     <label className="cmd-field"><span>Evidence</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="projected">Forecast only</option><option value="recorded">Recorded receipt</option><option value="reconciled">Bank / cash reconciled</option></select></label>
     <label className="cmd-field cmd-wide"><span>Receipt, settlement batch or invoice reference {status!=='projected'?'*':''}</span><input maxLength={190} required={status!=='projected'} value={reference} onChange={e=>setReference(e.target.value)} placeholder="e.g., gate-close-2026-10-13"/></label>
     <div className="cmd-form-actions"><button type="submit" className="cmd-button" disabled={busy||!selected}>{busy?'Saving…':'Save financial record'} <FaCheck/></button></div>
    </form>
   </section>
   <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">BOX OFFICE / GATE</p><h3>Attendance report</h3></div><FaUsers color="#ff6877"/></div>
    <div className="cmd-report-kpis"><span><b>{people===null?'Not reported':people.toLocaleString()}</b>Actual people recorded</span><span><b>{attendance?.tickets_sold??'—'}</b>Tickets sold (staff reported)</span></div>
    <form className="cmd-form-grid cmd-inline-form" onSubmit={e=>void saveAttendance(e)}>
     <label className="cmd-field"><span>Paid attendees counted</span><input type="number" min="0" step="1" value={paid} onChange={e=>setPaid(e.target.value)} placeholder="Leave blank if unverified"/></label>
     <label className="cmd-field"><span>Complimentary attendees counted</span><input type="number" min="0" step="1" value={complimentary} onChange={e=>setComplimentary(e.target.value)} placeholder="Leave blank if unverified"/></label>
     <label className="cmd-field"><span>Tickets sold (not people scanned)</span><input type="number" min="0" step="1" value={tickets} onChange={e=>setTickets(e.target.value)} placeholder="Optional box-office count"/></label>
     <label className="cmd-field"><span>Gate count source</span><select value={source} onChange={e=>setSource(e.target.value)}><option value="not_recorded">Not recorded</option><option value="staff_gate_count">Staff manual gate count</option><option value="ticket_scans">Verified ticket scans</option><option value="venue_turnstile">Venue turnstile</option><option value="box_office_report">Box-office report</option></select></label>
     <label className="cmd-field cmd-wide"><span>Count notes / settlement discrepancies</span><textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1500}/></label>
     <div className="cmd-form-actions"><button type="submit" className="cmd-button" disabled={busy||!selected}>{busy?'Saving…':'Save verified gate report'} <FaClipboardList/></button></div>
    </form>
    <p className="cmd-fine">Tickets sold, ticket receipts, and people physically present are different measures. Do not automatically infer one from another.</p>
   </section>
  </div>
  <section className="cmd-panel"><div className="cmd-panel-heading"><div><p className="cmd-eyebrow">GAME FINANCIAL JOURNAL</p><h3>Receipt & expense breakdown</h3></div><FaTicket color="#ff6877"/></div>
   {!entries.length?<div className="cmd-empty">No game-specific financial records yet. Use the defined entry types above.</div>:<div className="cmd-records">{entries.map(x=><div key={x.id} className="cmd-record"><div className="cmd-record-main"><strong>{labelFor(x.category)}</strong><small>{x.direction==='income'?'Revenue':'Expense'} · {x.state} · {x.reference||'Projection'}</small></div><div className="cmd-record-right"><b className={x.direction==='income'?'cmd-positive':'cmd-negative'}>{x.direction==='income'?'+':'−'}{money(amount(x.amount))}</b></div></div>)}</div>}
   <p className="cmd-fine">Event contribution is an internal operational estimate, not audited profit. Allocated league-wide costs and staff pay may not be reflected until entered.</p>
  </section>
  {error&&<div className="cmd-notice error" role="alert">{error}</div>}
  {notice&&<div className="cmd-notice" role="status">{notice}</div>}
 </div>;
}
