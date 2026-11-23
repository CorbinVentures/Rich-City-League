'use client';
import { useCallback,useEffect,useMemo,useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { BUDGET_FIELDS,calculateEventBudget,EVENT_KEYS,INITIAL_EVENT_BUDGETS,NON_CONFIRMED_REVENUE_NOTE,type BudgetField,type EventBudgetPlan,type EventKey } from '@/lib/command/event-budgets-2027';

const usd=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const int=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(n);
const fieldGroups:{heading:string;items:BudgetField[]}[]=[
 {heading:'Registration & projected income',items:['teams','entryFee','spectators','ticketPrice','sponsors','vendors','vendorFee','days','games']},
 {heading:'Jerseys, belts & tournament operations',items:['jerseysPerTeam','jerseyUnitCost','beltCount','beltCost','venueRental','venueStaff','officials','media','dj','otherAwards']},
 {heading:'Event expenses & allowances',items:['insurance','security','marketing','equipment','permits','otherStaff','contingencyRate','processingRate']},
];
const fieldLabels:Record<BudgetField,string>={
 teams:'Players / teams (#)',entryFee:'Registration fee ($)',spectators:'Paid spectators (estimated #)',ticketPrice:'Ticket price ($)',sponsors:'Sponsorships (estimated $)',vendors:'Vendors (estimated #)',vendorFee:'Vendor fee ($)',days:'Event days',games:'Budgeted games (#)',
 jerseysPerTeam:'Jerseys per team / player',jerseyUnitCost:'All-in jersey unit cost ($)',beltCount:'Belts per event (#)',beltCost:'Belt cost each ($)',venueRental:'Gym rental total ($)',venueStaff:'Venue staffing total ($)',officials:'Referee payments total ($)',media:'Media / video total ($)',dj:'DJ / sound ($)',otherAwards:'Additional awards ($)',
 insurance:'Insurance ($)',security:'Security ($)',marketing:'Marketing ($)',equipment:'Equipment ($)',permits:'Permits / admin ($)',otherStaff:'Other event staff ($)',contingencyRate:'Contingency (decimal)',processingRate:'Processing (decimal)'
};
const inputClass='w-full rounded-lg border border-white/15 bg-[#10151d] px-3 py-2 text-sm text-white outline-none focus:border-white/50';
type Notice={message:string;error:boolean}|null;

export function CommandEventBudgets2027(){
 const db=useMemo(()=>getSupabaseClient(),[]);
 const [plans,setPlans]=useState<EventBudgetPlan[]>([]);
 const [selectedKey,setSelectedKey]=useState<EventKey>('cup');
 const [draft,setDraft]=useState<EventBudgetPlan|null>(null);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [notice,setNotice]=useState<Notice>(null);
 const load=useCallback(async()=>{
  if(!db){setNotice({message:'Supabase is not configured.',error:true});setLoading(false);return}
  setLoading(true);
  const {data,error}=await db.from('rcl_command_event_financial_plans').select('*').eq('year',2027);
  if(error){setNotice({message:'Unable to load private event plans. The new database migration may not be deployed yet: '+error.message,error:true});setLoading(false);return}
  const sorted=(data||[]) as EventBudgetPlan[];
  sorted.sort((a,b)=>EVENT_KEYS.indexOf(a.event_key)-EVENT_KEYS.indexOf(b.event_key));
  setPlans(sorted);setDraft(sorted.find(x=>x.event_key===selectedKey)??sorted[0]??null);
  if(!sorted.length)setNotice({message:'No budget records are available. Confirm the Command Center migration has run.',error:true});
  else setNotice(null);
  setLoading(false);
 },[db,selectedKey]);
 useEffect(()=>{void load()},[load]);
 const select=(key:EventKey)=>{
  if(draft&&plans.find(p=>p.event_key===draft.event_key)&&
    JSON.stringify(draft)!==JSON.stringify(plans.find(p=>p.event_key===draft.event_key))&&
    !window.confirm('Discard unsaved scenario changes?'))return;
  setSelectedKey(key);
  setDraft(plans.find(p=>p.event_key===key)??null);
 };
 const updateNumber=(key:BudgetField,value:string)=>{
  if(!draft)return;
  setDraft({...draft,assumptions:{...draft.assumptions,[key]:value===''?0:Number(value)}});
 };
 const calc=draft?calculateEventBudget(draft):null;
 const annual=plans.reduce((acc,p)=>{const x=calculateEventBudget(p);return {income:acc.income+x.annualRevenue,expenses:acc.expenses+x.annualExpenses,profit:acc.profit+x.annualProfitBeforePrize}}, {income:0,expenses:0,profit:0});
 const unresolvedPrize=plans.some(p=>p.event_count>0&&p.cash_prize===null);
 const check=(plan:EventBudgetPlan)=>{
  if(!Number.isInteger(plan.event_count)||plan.event_count<0||plan.event_count>100)return 'Event count must be a whole number from 0–100.';
  if(Object.entries(plan.assumptions).some(([,v])=>!Number.isFinite(v)||v<0))return 'All budget amounts must be valid nonnegative numbers.';
  if(plan.event_key==='cup'&&plan.assumptions.jerseysPerTeam!==5)return 'The Cup allocation is confirmed at 5 jerseys per team.';
  if(plan.event_key==='shootout'&&plan.assumptions.jerseysPerTeam!==12)return 'The Shootout allocation is confirmed at 12 jerseys per team.';
  if(['cup','shootout'].includes(plan.event_key)&&plan.assumptions.jerseyUnitCost>9)return 'The confirmed all-inclusive jersey cap is $9.';
  if(plan.cash_prize!==null&&(!Number.isFinite(plan.cash_prize)||plan.cash_prize<0))return 'Enter a valid cash prize or leave it TBD.';
  return null;
 };
 const save=async()=>{
  if(!db||!draft||saving)return;
  const message=check(draft);if(message){setNotice({message,error:true});return}
  setSaving(true);setNotice(null);
  const {data,error}=await db.from('rcl_command_event_financial_plans')
   .update({event_count:draft.event_count,cash_prize:draft.cash_prize,notes:draft.notes,assumptions:draft.assumptions})
   .eq('id',draft.id).eq('year',2027).select('*').single();
  if(error||!data)setNotice({message:'Budget was not saved: '+(error?.message||'No matching record.'),error:true});
  else {setPlans(prev=>prev.map(p=>p.id===draft.id?data as EventBudgetPlan:p));setDraft(data as EventBudgetPlan);setNotice({message:'2027 event forecast saved. No actual income or expenses were posted to the ledger.',error:false})}
  setSaving(false);
 };
 const download=()=>{
  const headers=['Event','Events','Teams/players','Fee','Registration','Spectator estimate','Sponsor estimate','Vendor estimate','Projected gross','Jerseys','Belts','Direct costs','Contingency','Processing','Operating expenses','Profit before cash prize','Cash prize','Net profit status'];
  const rows=plans.map(p=>{const v=calculateEventBudget(p);return [p.name,p.event_count,p.assumptions.teams,p.assumptions.entryFee,v.registration,v.gate,v.sponsorship,v.vendors,v.revenue,v.jerseys,v.belts,v.direct,v.contingency,v.processing,v.expenses,v.prePrizeProfit,p.cash_prize===null?'TBD':p.cash_prize,v.netProfit===null?'TBD':v.netProfit]});
  const csv=[headers,...rows].map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='RCH_Command_2027_Event_Budgets.csv';a.click();URL.revokeObjectURL(url);
 };
 return <main className="min-h-screen bg-[#08090c] px-4 pb-20 pt-8 text-white sm:px-8">
  <div className="mx-auto max-w-7xl">
   <Link href="/command#finance" className="text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white">← Command Center / Financial Office</Link>
   <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/15 pb-6">
    <div><p className="text-xs font-bold uppercase tracking-[.25em] text-white/50">Private financial planning · 2027</p><h1 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-5xl">Event Budgets & Projections</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">These are editable operating forecasts, never verified sales, payouts, or settlements. Confirmed pricing is recorded separately from assumptions.</p></div>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={download} disabled={!plans.length} className="rounded-lg border border-white/30 px-4 py-3 text-sm font-bold disabled:opacity-40">Export current CSV</button><button type="button" onClick={()=>{void load()}} disabled={loading} className="rounded-lg border border-white/30 px-4 py-3 text-sm font-bold disabled:opacity-40">Refresh</button></div>
   </div>
   {notice&&<p role={notice.error?'alert':'status'} className={'mt-5 rounded-lg border px-4 py-3 text-sm '+(notice.error?'border-red-500/30 text-red-200':'border-white/20 text-white')}>{notice.message}</p>}
   <div className="mt-7 grid gap-3 sm:grid-cols-3">
    {[['2027 projected revenue',annual.income],['2027 projected expenses',annual.expenses],['2027 projected profit BEFORE pending prize',annual.profit]].map(([label,value])=><div key={String(label)} className="rounded-xl border border-white/15 bg-[#10141b] p-5"><p className="text-xs font-bold uppercase tracking-wider text-white/50">{label}</p><p className="mt-2 text-2xl font-black">{usd(Number(value))}</p></div>)}
   </div>
   {unresolvedPrize&&<p className="mt-3 text-sm text-amber-200">RVA Shootout cash prize remains TBD. Annual profit does not deduct that unapproved prize.</p>}
   <p className="mt-2 text-xs text-white/50">{NON_CONFIRMED_REVENUE_NOTE} Excel is a separate offline snapshot; exporting a CSV does not overwrite it.</p>
   <div className="mt-8 grid gap-5 lg:grid-cols-[270px_1fr]">
    <aside className="rounded-xl border border-white/15 bg-[#10141b] p-3">
     <h2 className="px-3 py-2 text-xs font-black uppercase tracking-widest text-white/50">Event formats</h2>
     {INITIAL_EVENT_BUDGETS.map(item=>{const p=plans.find(x=>x.event_key===item.event_key);return <button key={item.event_key} type="button" onClick={()=>select(item.event_key)} className={'mb-1 w-full rounded-lg px-3 py-3 text-left '+(selectedKey===item.event_key?'bg-white text-black':'text-white hover:bg-white/10')}><span className="block text-sm font-bold">{item.name}</span><span className={'mt-1 block text-xs '+(selectedKey===item.event_key?'text-black/60':'text-white/50')}>{p?p.event_count+' event(s) planned':'Not loaded'}{item.event_key==='full_team'?' · scenario only':''}</span></button>})}
    </aside>
    <div className="min-w-0">
     {loading?<p className="rounded-xl border border-white/15 p-6 text-white/60">Loading private financial budgets…</p>:draft&&calc?<div className="space-y-5">
      <section className="rounded-xl border border-white/15 bg-[#10141b] p-5">
       <p className="text-xs font-black uppercase tracking-widest text-white/50">Event scenario</p>
       <h2 className="mt-2 text-2xl font-black">{draft.name}</h2>
       <p className="mt-2 text-sm text-white/60">{draft.notes}</p>
       <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Registration',calc.registration],['Gross projected',calc.revenue],['Operating cost',calc.expenses],['Profit before prize',calc.prePrizeProfit]].map(([title,value])=><div key={String(title)} className="rounded-lg border border-white/10 p-3"><p className="text-xs text-white/50">{title}</p><b className="mt-1 block text-lg">{usd(Number(value))}</b></div>)}
       </div>
       <p className="mt-4 text-xs text-white/50">Expenses include {usd(calc.jerseys)} of jerseys, {usd(calc.belts)} of championship belts, {usd(calc.contingency)} contingency and {usd(calc.processing)} payment processing.</p>
      </section>
      <section className="rounded-xl border border-white/15 bg-[#10141b] p-5">
       <h3 className="text-lg font-bold">Edit forecast assumptions</h3><p className="mt-1 text-xs text-white/50">Editing affects planned forecasts only, never the actual Command ledger.</p>
       <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold text-white/70">Scheduled events (#)<input className={'mt-2 '+inputClass} type="number" min="0" max="100" step="1" value={draft.event_count} onChange={e=>setDraft({...draft,event_count:Number(e.target.value)})}/></label>
        <label className="block text-xs font-bold text-white/70">Cash championship prize ($; blank means TBD)<input className={'mt-2 '+inputClass} type="number" min="0" step=".01" value={draft.cash_prize??''} placeholder="TBD" onChange={e=>setDraft({...draft,cash_prize:e.target.value===''?null:Number(e.target.value)})}/></label>
       </div>
       {fieldGroups.map(group=><div key={group.heading} className="mt-6"><h4 className="mb-3 border-b border-white/15 pb-2 text-xs font-black uppercase tracking-widest text-white/60">{group.heading}</h4><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{group.items.map(key=><label key={key} className="block text-xs font-semibold text-white/70">{fieldLabels[key]}<input className={'mt-2 '+inputClass} type="number" inputMode="decimal" min="0" max={key==='jerseyUnitCost'&&(draft.event_key==='cup'||draft.event_key==='shootout')?9:undefined} step={key==='contingencyRate'||key==='processingRate'?'0.01':'any'} value={draft.assumptions[key]} onChange={e=>updateNumber(key,e.target.value)}/></label>)}</div></div>)}
       <label className="mt-6 block text-xs font-bold text-white/70">Planning notes / decisions<textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} rows={3} className={'mt-2 '+inputClass}/></label>
       <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-white/65">{draft.cash_prize===null?'Prize TBD · net profit cannot be finalized':'Projected net profit after prize: '+usd(calc.netProfit??0)}</p><button type="button" onClick={()=>{void save()}} disabled={saving} className="rounded-lg bg-white px-6 py-3 text-sm font-black uppercase tracking-wider text-black disabled:opacity-50">{saving?'Saving…':'Save financial forecast'}</button></div>
      </section>
     </div>:<p className="rounded-xl border border-white/15 p-6 text-white/60">No event budget loaded.</p>}
    </div>
   </div>
  </div>
 </main>;
}
