'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaCalendarCheck, FaCamera, FaCircleCheck, FaClock, FaClapperboard, FaFlag, FaLock, FaPlus, FaShieldHalved, FaTriangleExclamation } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  ROYALTEE_STATUSES, forRoyalteeEvent, daysUntilDue, dueDateForEvent,
  offsetLabel, readiness, workIsComplete, type RoyalteeWorkItem, type RoyalteeStatus
} from '@/lib/royaltee-production';

type Event = {id:string;title:string;starts_at:string;event_type:string;status:string;location:string};
type Change = Partial<Pick<RoyalteeWorkItem,'status'|'owner_label'|'notes'|'asset_url'|'rights_verified'|'editorial_approved'|'posted_at'>>;
type Props = {events:Event[];selectedEventId:string;onSelect:(id:string)=>void;onCreateEvent:()=>void};
const selectClass='min-h-11 rounded-xl border border-[#4c799d] bg-[#061c30] px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#ffaf77]';
const formClass='mt-1 block min-h-11 w-full rounded-xl border border-[#3f698a] bg-[#071b2f] px-3 py-2 text-sm text-white outline-none focus:border-[#ffb47b]';
const dt=(iso:string) => new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'}).format(new Date(iso+'T12:00:00Z'));

export function RoyalteeShowProduction({events,selectedEventId,onSelect,onCreateEvent}:Props) {
  const {user}=useAuth();
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const [items,setItems]=useState<RoyalteeWorkItem[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState<string|null>(null);
  const [retry,setRetry]=useState(0);
  const [filter,setFilter]=useState<'all'|'due'|'blocked'>('all');
  const [customTitle,setCustomTitle]=useState('');
  const [customBrief,setCustomBrief]=useState('');
  const [customOwner,setCustomOwner]=useState('Content lead');
  const [customDue,setCustomDue]=useState(-1);
  const event=events.find(e=>e.id===selectedEventId)??null;

  const reload=useCallback(async(id:string)=>{
    const result=await db.from('rcl_royaltee_event_work_items').select('*').eq('event_id',id).order('day_offset',{ascending:true}).limit(150);
    if(result.error)throw result.error;
    return (result.data??[]) as RoyalteeWorkItem[];
  },[db]);

  useEffect(()=>{
    if(!event||!db||!user){setItems([]);setLoading(false);return;}
    let active=true;
    setLoading(true);setError('');setNotice('');setItems([]);
    const initialize=async()=>{
      try{
        // Insert missing templates only; do not overwrite an existing coach's work.
        const rows=forRoyalteeEvent(event.event_type).map(t=>({
          event_id:event.id,template_key:t.key,kind:t.kind,
          day_offset:t.day_offset,priority:t.priority,title:t.title,
          instructions:t.instructions,owner_label:t.owner_label,updated_by:user.id
        }));
        const seed=await db.from('rcl_royaltee_event_work_items').upsert(rows,{
          onConflict:'event_id,template_key',ignoreDuplicates:true
        });
        if(seed.error)throw seed.error;
        const next=await reload(event.id);
        if(active)setItems(next);
      }catch(reason){
        if(active)setError('Could not load the event preparation plan. Confirm the production database migration and your Royaltee permissions. '+(reason instanceof Error?reason.message:''));
      }finally{if(active)setLoading(false);}
    };
    void initialize();
    return()=>{active=false};
  },[db,event?.id,event?.event_type,user?.id,retry,reload]);

  const save=async(row:RoyalteeWorkItem,changes:Change)=>{
    if(!db||!user||busy)return;
    setBusy(row.id);setError('');setNotice('');
    try{
      const result=await db.from('rcl_royaltee_event_work_items')
        .update({...changes,updated_by:user.id,updated_at:new Date().toISOString()})
        .eq('id',row.id).eq('event_id',row.event_id).eq('updated_at',row.updated_at)
        .select('*').maybeSingle();
      if(result.error)throw result.error;
      if(!result.data)throw new Error('This item changed in another session. Reload the plan before editing.');
      setItems(old=>old.map(t=>t.id===row.id?result.data:t));
      setNotice('Saved to the Royaltee event plan.');
    }catch(reason){setError(reason instanceof Error?reason.message:'Changes could not be saved.');}
    finally{setBusy(null);}
  };

  const addCustom=async(e:FormEvent)=>{
    e.preventDefault();
    if(!db||!user||!event||busy||customTitle.trim().length<3)return;
    setBusy('new');setError('');setNotice('');
    try{
      const record={
        event_id:event.id,template_key:'custom-'+crypto.randomUUID(),
        kind:'content',day_offset:customDue,priority:'standard',
        title:customTitle.trim(),instructions:customBrief.trim(),
        owner_label:customOwner.trim()||'Content lead',updated_by:user.id
      };
      const insert=await db.from('rcl_royaltee_event_work_items').insert(record).select('*').single();
      if(insert.error)throw insert.error;
      setItems(rows=>[...rows,insert.data].sort((a,b)=>a.day_offset-b.day_offset));
      setCustomTitle('');setCustomBrief('');
      setNotice('Custom content assignment added. Publication still requires review and rights clearance.');
    }catch(reason){setError(reason instanceof Error?reason.message:'Could not create content assignment.');}
    finally{setBusy(null);}
  };

  const summary=readiness(items);
  const unfinished=items.filter(row=>!workIsComplete(row));
  const priorityNow=unfinished.filter(row=>{
    if(!event)return false;
    return daysUntilDue(event.starts_at,row.day_offset)<=0;
  }).sort((a,b)=>a.day_offset-b.day_offset||Number(b.priority==='critical')-Number(a.priority==='critical')).slice(0,8);
  const filtered=(lane:'ops'|'content')=>items.filter(row=>row.kind===lane).filter(row=>
    filter==='all'||(filter==='blocked'?row.status==='blocked':!workIsComplete(row)&&event!==null&&daysUntilDue(event.starts_at,row.day_offset)<=0)
  ).sort((a,b)=>a.day_offset-b.day_offset||Number(b.priority==='critical')-Number(a.priority==='critical'));
  const showItems=(lane:'ops'|'content')=>filtered(lane).map(row=><WorkItemCard
    key={row.id+':'+row.updated_at} row={row} startsAt={event!.starts_at}
    saving={busy===row.id} disabled={busy!==null} onSave={changes=>void save(row,changes)}
  />);

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-2xl border border-[#3c76a2] bg-[radial-gradient(ellipse_at_90%_10%,#155381,#08243e_64%,#06192b)] px-5 py-6 sm:px-7 sm:py-8">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-[#ffb781]"><FaClapperboard/> The Royaltee Experience</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="font-display text-3xl font-black uppercase sm:text-4xl">Show Prep + <span className="text-[#ffae70]">Content Studio</span></h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#c7dfef]">Train with intention. Own your entrance. Build recognizable personalities. Give every appearance a storyline, rehearsal plan, shot list and approved content delivery.</p></div>
        <Link href="/league/royaltee/manage" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#7ab3d9] bg-[#143c5a] px-4 text-xs font-black text-white">Performer approvals <FaArrowRight/></Link>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-[#d3e8f6]">
        {['Prepare','Rehearse','Capture','Review','Release','Measure'].map((beat,i)=><span key={beat} className="rounded-lg border border-[#36668b] bg-[#051a2d] px-3 py-2">{String(i+1).padStart(2,'0')} · {beat}</span>)}
      </div>
    </section>

    {!events.length?<section className="rounded-2xl border border-[#36698e] bg-[#0b263b] p-7">
      <h3 className="text-xl font-black">Start with an event</h3>
      <p className="mt-2 text-sm leading-6 text-[#b9d7e9]">Create a Royaltee adult event. Its preparation and content plan will be generated automatically when selected.</p>
      <button onClick={onCreateEvent} className="mt-4 rounded-xl bg-[#ff9f59] px-5 py-3 text-sm font-black text-[#160e08]">Create adult event</button>
    </section>:<div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[#315d80] bg-[#0a2239] p-5">
        <label className="min-w-[240px] flex-1 text-xs font-black uppercase tracking-wide text-[#c2e2f5]">Working event
          <select className={'mt-2 w-full '+selectClass} value={selectedEventId} onChange={e=>onSelect(e.target.value)}>
            {events.filter(e=>e.status!=='cancelled').map(e=><option key={e.id} value={e.id}>{e.title} · {new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric'}).format(new Date(e.starts_at))}</option>)}
          </select>
        </label>
        {event&&<p className="text-sm text-[#bcdbef]">{new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'}).format(new Date(event.starts_at))} · {event.location||'Location pending'}</p>}
      </section>

      {error&&<div role="alert" className="rounded-xl border border-red-400/50 bg-red-950/30 p-4 text-sm text-red-100">{error} <button type="button" onClick={()=>setRetry(v=>v+1)} className="ml-2 font-black underline">Reload plan</button></div>}
      {notice&&<p role="status" className="rounded-xl border border-emerald-500/35 bg-emerald-950/30 p-3 text-sm text-emerald-100">{notice}</p>}
      {loading?<p className="rounded-xl border border-[#356889] bg-[#102b42] p-7 text-[#d5e9f6]">Preparing the event runbook…</p>:!!event&&items.length>0&&<>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Event preparation metrics">
          <Metric icon={<FaFlag/>} title="Critical show checks" value={summary.criticalComplete+' / '+summary.criticalTotal} note={summary.operationalReady?'All critical operations cleared':'Event readiness not yet signed off'}/>
          <Metric icon={<FaCalendarCheck/>} title="All prep tasks" value={summary.opsComplete+' / '+summary.opsTotal} note="Completed or justified N/A"/>
          <Metric icon={<FaCamera/>} title="Content approved" value={summary.contentCleared+' / '+summary.contentPlanned} note="Rights verified + editorial approved"/>
          <Metric icon={<FaClapperboard/>} title="Published records" value={String(summary.contentPublished)} note={summary.blocked+' blocked items · status is not auto-posting'}/>
        </div>

        <section className="rounded-2xl border border-[#426b88] bg-[#0c2b43] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-2xl font-black">Today’s production priorities</h3>
            <p className="mt-2 text-sm text-[#c4dfee]">Unfinished items due today or earlier, relative to the selected event in Eastern Time. Nothing is marked complete automatically.</p></div>
            <span className={'rounded-lg border px-3 py-2 text-xs font-black '+(summary.operationalReady?'border-emerald-400/40 bg-emerald-800/25 text-emerald-100':'border-amber-400/40 bg-amber-900/25 text-amber-100')}>{summary.operationalReady?'Critical checks cleared':'Show readiness pending'}</span></div>
          {priorityNow.length?<div className="mt-5 grid gap-2 lg:grid-cols-2">{priorityNow.map(row=><div key={row.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#355f7b] bg-[#061f34] px-4 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-black">{row.title}</p><p className="mt-1 text-xs text-[#afd2ea]">{row.kind==='content'?'Media':'Show ops'} · {offsetLabel(row.day_offset)} · {row.owner_label||'Unassigned'}</p></div>
            <span className={'shrink-0 text-xs font-black '+(row.status==='blocked'?'text-rose-300':'text-[#ffbf85]')}>{row.status==='blocked'?'Blocked':row.priority==='critical'?'Critical':'Due'}</span>
          </div>)}</div>:<p className="mt-4 text-sm text-[#bfe0f1]">No overdue or due-today tasks. Review upcoming assignments below.</p>}
        </section>

        <div className="flex flex-wrap gap-2" aria-label="Filter assignments">{([
          ['all','All assignments'],['due','Due / overdue'],['blocked','Blocked only']
        ] as const).map(([key,label])=><button key={key} type="button" onClick={()=>setFilter(key)} aria-pressed={filter===key} className={'min-h-11 rounded-xl border px-4 text-xs font-black '+(filter===key?'border-[#ffb17d] bg-[#ff9f57] text-[#160b05]':'border-[#4d7999] bg-[#0b2b45] text-white')}>{label}</button>)}</div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-3" aria-label="Rehearsal and show operations assignments">
            <div className="flex items-center gap-2"><FaCalendarCheck className="text-[#a9dbff]"/><h3 className="text-xl font-black">Rehearsal & Show Operations</h3></div>
            {showItems('ops')}
            {filtered('ops').length===0&&<p className="rounded-xl border border-dashed border-[#487291] p-5 text-sm text-[#b8d8ed]">No operations items in this view.</p>}
          </section>
          <section className="space-y-3" aria-label="Royaltee editorial and media assignments">
            <div className="flex items-center gap-2"><FaCamera className="text-[#ffb17a]"/><h3 className="text-xl font-black">Cheerleading Content Studio</h3></div>
            {showItems('content')}
            {filtered('content').length===0&&<p className="rounded-xl border border-dashed border-[#487291] p-5 text-sm text-[#b8d8ed]">No content items in this view.</p>}
          </section>
        </div>

        <form onSubmit={e=>void addCustom(e)} className="rounded-2xl border border-[#45769a] bg-[#0c293f] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#ffc08a]"><FaPlus/><h3 className="text-xl font-black text-white">Pitch a custom content beat</h3></div>
          <p className="mt-2 text-sm text-[#c8dced]">Create a repeatable on-brand moment for this event: an adult performer spotlight, rehearsal segment, rivalry-free personality story or behind-the-scenes clip.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-black text-[#deedf8]">Content title<input required minLength={3} maxLength={160} value={customTitle} onChange={e=>setCustomTitle(e.target.value)} className={formClass}/></label>
            <label className="text-xs font-black text-[#deedf8]">Assigned owner<input maxLength={120} value={customOwner} onChange={e=>setCustomOwner(e.target.value)} className={formClass}/></label>
            <label className="text-xs font-black text-[#deedf8]">Target day<select value={customDue} onChange={e=>setCustomDue(Number(e.target.value))} className={formClass}>{[-14,-10,-7,-5,-3,-2,-1,0,1,2].map(day=><option key={day} value={day}>{offsetLabel(day)}</option>)}</select></label>
            <label className="text-xs font-black text-[#deedf8]">Shot instructions<input maxLength={1200} value={customBrief} onChange={e=>setCustomBrief(e.target.value)} className={formClass}/></label>
          </div>
          <button type="submit" disabled={busy!==null||customTitle.trim().length<3} className="mt-4 min-h-11 rounded-xl bg-[#ff9d52] px-5 text-sm font-black text-[#1c0f05] disabled:opacity-50">Add content assignment</button>
        </form>
        <p className="flex items-start gap-2 text-xs leading-6 text-[#bad9eb]"><FaLock className="mt-1 shrink-0"/><span>Internal manager workspace. Record only adult (18+) performer content with permission. Editorial approval and “record published” are manual tracking steps; no video is posted automatically, and no private youth roster, contacts or medical details belong in notes.</span></p>
      </>}
    </div>}
  </div>;
}

function Metric({icon,title,value,note}:{icon:React.ReactNode;title:string;value:string;note:string}) {
  return <div className="rounded-2xl border border-[#336588] bg-[linear-gradient(145deg,#123956,#071b2f)] p-5">
    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#a4d7f8]">{icon}{title}</div>
    <p className="mt-4 text-3xl font-black tabular-nums">{value}</p><p className="mt-2 text-xs leading-5 text-[#c3dcea]">{note}</p>
  </div>;
}

function WorkItemCard({row,startsAt,saving,disabled,onSave}:{row:RoyalteeWorkItem;startsAt:string;saving:boolean;disabled:boolean;onSave:(changes:Change)=>void}) {
  const [owner,setOwner]=useState(row.owner_label);
  const [notes,setNotes]=useState(row.notes);
  const [url,setUrl]=useState(row.asset_url);
  const [localError,setLocalError]=useState('');
  const left=daysUntilDue(startsAt,row.day_offset);
  const complete=workIsComplete(row);
  const deadline=dueDateForEvent(startsAt,row.day_offset);
  const applyStatus=(status:RoyalteeStatus)=>{
    if(status==='not_applicable'&&notes.trim().length<4){setLocalError('Add a reason (at least four characters) in the notes, then choose Not applicable.');return;}
    setLocalError('');
    onSave(status==='not_applicable'?{status,notes}:{status});
  };
  const saveDetails=()=>{
    const trimmed=url.trim();
    if(trimmed&&!/^https:\/\/[^\s]+$/.test(trimmed)){setLocalError('Use an https:// asset or published URL.');return;}
    setLocalError('');onSave({owner_label:owner.trim(),notes:notes.trim(),asset_url:trimmed});
  };
  const content=row.kind==='content';
  return <article className={'rounded-xl border bg-[#0a243a] p-4 shadow-sm '+(row.status==='blocked'?'border-[#c76c69]':'border-[#345f82]')}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[11px] font-black uppercase tracking-wider text-[#ffc08f]">{offsetLabel(row.day_offset)} · {deadline?dt(deadline):''}</span>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide">
        {row.priority==='critical'&&<span className="rounded-lg border border-[#f8a56c]/60 px-2 py-1 text-[#ffbd8d]">Critical</span>}
        <span className={'rounded-lg px-2 py-1 '+(complete?'bg-emerald-900/50 text-emerald-200':left<0?'bg-rose-900/40 text-rose-200':'bg-[#1d4a6a] text-[#c7e9fc]')}>{complete?'Done':left<0?'Overdue':left===0?'Due today':left+'d left'}</span>
      </div>
    </div>
    <h4 className="mt-3 text-base font-black text-white">{row.title}</h4>
    <p className="mt-2 text-xs leading-6 text-[#c4dbea]">{row.instructions}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-black text-[#cde7f8]">Owner<input value={owner} onChange={e=>setOwner(e.target.value)} maxLength={120} className={formClass}/></label>
      <label className="text-xs font-black text-[#cde7f8]">Progress<select value={row.status} disabled={disabled} onChange={e=>applyStatus(e.target.value as RoyalteeStatus)} className={formClass}>{ROYALTEE_STATUSES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      <label className="text-xs font-black text-[#cde7f8] sm:col-span-2">Notes / blockers<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={2000} rows={2} className={formClass}/></label>
      {content&&<label className="text-xs font-black text-[#cde7f8] sm:col-span-2">Shared clip / asset / published URL<input type="url" value={url} onChange={e=>setUrl(e.target.value)} maxLength={1200} placeholder="https://..." className={formClass}/></label>}
    </div>
    {content&&<div className="mt-4 space-y-3 rounded-xl border border-[#47718e] bg-[#081b2c] p-3">
      <label className="flex items-start gap-3 text-xs font-semibold leading-5 text-[#d5e8f6]"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#ffb06f]" checked={row.rights_verified} disabled={disabled} onChange={e=>onSave(e.target.checked?{rights_verified:true}:{rights_verified:false,editorial_approved:false,posted_at:null})}/>
        <span>Verified 18+ performer consent, footage/music rights and safe-to-share imagery.</span></label>
      <label className="flex items-start gap-3 text-xs font-semibold leading-5 text-[#d5e8f6]"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#ffb06f]" checked={row.editorial_approved} disabled={disabled||!row.rights_verified} onChange={e=>onSave(e.target.checked?{editorial_approved:true}:{editorial_approved:false,posted_at:null})}/>
        <span>Royaltee editorial approval confirmed. No automatic publishing.</span></label>
      {row.posted_at?<button disabled={disabled} onClick={()=>onSave({posted_at:null})} type="button" className="min-h-10 rounded-lg border border-emerald-500/50 px-3 text-xs font-bold text-emerald-200">Published recorded · Undo</button>
        :<button disabled={disabled||!row.rights_verified||!row.editorial_approved||!row.asset_url} onClick={()=>onSave({posted_at:new Date().toISOString()})} type="button" className="min-h-10 rounded-lg border border-[#f9a56e] px-3 text-xs font-black text-[#ffbf90] disabled:opacity-50">Record as published (manual)</button>}
      {row.asset_url?.startsWith('https://')&&<a href={row.asset_url} target="_blank" rel="noopener noreferrer" className="ml-3 inline-flex min-h-10 items-center text-xs font-bold text-[#a9dfff] underline">Open asset <FaArrowRight className="ml-1"/></a>}
      <p className="text-[11px] leading-5 text-[#a8cbdf]">Content must be reviewed separately before any external posting. Recording a release here does not transmit media to the social timeline.</p>
    </div>}
    {localError&&<p role="alert" className="mt-3 flex items-center gap-2 text-xs text-rose-200"><FaTriangleExclamation/>{localError}</p>}
    <div className="mt-3 flex items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-[11px] text-[#96bdd7]"><FaClock/>{saving?'Saving…':'Event plan saved in RCH'}</p>
      <button type="button" disabled={disabled} onClick={saveDetails} className="min-h-10 rounded-lg border border-[#7cb7dd] bg-[#154d73] px-4 text-xs font-black text-white disabled:opacity-50">Save details</button>
    </div>
  </article>;
}
