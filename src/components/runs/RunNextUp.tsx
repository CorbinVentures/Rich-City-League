'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaBasketball,FaClock,FaRotate} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type QueueEntry={
 id:string;profile_id:string;status:'waiting'|'called'|'playing'|'completed'|'left'|'no_show';
 joined_at:string;called_at:string|null;
};
const nextAction:Record<string,{label:string,action:string}|undefined>={
 waiting:{label:'Call next',action:'called'},
 called:{label:'Start game',action:'playing'},
 playing:{label:'Finish game',action:'completed'},
};
export function RunNextUp({runId,hostId}:{runId:string;hostId:string}) {
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [items,setItems]=useState<QueueEntry[]>([]);
 const [names,setNames]=useState<Record<string,string>>({});
 const [role,setRole]=useState('');
 const [manager,setManager]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [enabled,setEnabled]=useState(true);
 const [revision,setRevision]=useState(0);

 const load=useCallback(async()=>{
  if(!db||!runId||!user?.id)return;
  const [queue,operator,host]=await Promise.all([
   db.from('rch_run_queue').select('id,profile_id,status,joined_at,called_at')
     .eq('run_id',runId).in('status',['waiting','called','playing'])
     .order('joined_at',{ascending:true}).limit(100),
   db.from('rch_run_operators').select('role').eq('run_id',runId).eq('profile_id',user.id).maybeSingle(),
   db.rpc('can_manage_run',{target_run:runId}),
  ]);
  if(queue.error){setEnabled(false);return;}
  const entries=(queue.data??[]) as QueueEntry[];
  setItems(entries);setEnabled(true);
  setRole(operator.data?.role??'');
  setManager(Boolean(host.data)||user.id===hostId||['cohost','scorekeeper'].includes(operator.data?.role??''));
  if(entries.length) {
   const ids=[...new Set(entries.map(e=>e.profile_id))];
   const {data:profiles}=await db.from('profiles').select('id,display_name,username').in('id',ids).limit(100);
   setNames(Object.fromEntries((profiles??[]).map((p:any)=>[
    p.id,p.display_name||p.username||'RCH Player'
   ])));
  } else setNames({});
 },[db,hostId,runId,user?.id]);

 useEffect(()=>{void load();},[load,revision]);
 useEffect(()=>{
  if(!db||!user||!runId)return;
  const channel=db.channel('rch-run-next-up-'+runId)
   .on('postgres_changes',{event:'*',schema:'public',table:'rch_run_queue',filter:'run_id=eq.'+runId},()=>setRevision(v=>v+1))
   .subscribe();
  return()=>{void db.removeChannel(channel);};
 },[db,runId,user?.id]);

 const act=async(fn:string,args:Record<string,unknown>,success:string)=>{
  if(!db||busy)return;
  setBusy(true);setError('');setNotice('');
  const {error:failure}=await db.rpc(fn,args);
  if(failure)setError(failure.message);
  else{setNotice(success);setRevision(v=>v+1);}
  setBusy(false);
 };
 const active=items.find(i=>i.profile_id===user?.id);
 const waiting=items.filter(i=>i.status==='waiting');
 const current=items.filter(i=>i.status==='playing');
 const called=items.filter(i=>i.status==='called');
 if(!enabled)return null;
 return <section aria-label="Next Up basketball queue" className="mt-6 rounded-3xl border border-[#38678b] bg-[#081e32] p-5 text-white sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div>
    <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#8fceff]"><FaClock/> RCH Runs · Live Operations</p>
    <h2 className="mt-2 font-display text-2xl font-black uppercase sm:text-3xl">Next Up</h2>
    <p className="mt-2 max-w-xl text-sm text-[#aac6db]">Your place in line. No confusion over who has next. Hosts move players from waiting to called, then playing and finished.</p>
   </div>
   <button type="button" onClick={()=>void load()} className="flex min-h-10 items-center gap-2 rounded-xl border border-[#477695] px-3 text-xs font-bold"><FaRotate/> Refresh</button>
  </div>
  <div className="mt-4 grid grid-cols-3 gap-2">
   {[['Waiting',waiting.length],['Called',called.length],['On court',current.length]].map(([label,value])=>
    <div key={label} className="rounded-xl bg-[#102e48] px-3 py-3"><span className="block text-xl font-black">{value}</span><span className="text-[11px] text-[#9fc4dd]">{label}</span></div>
   )}
  </div>
  {error&&<p role="alert" className="mt-4 rounded-lg border border-rose-500/40 p-3 text-sm text-[#ffc2c2]">{error}</p>}
  {notice&&<p role="status" className="mt-4 rounded-lg border border-[#447a96] p-3 text-sm text-[#c7f4ff]">{notice}</p>}
  {user?<div className="mt-4 flex flex-wrap gap-2">
   {!active?<button disabled={busy} onClick={()=>void act('rch_join_run_queue',{p_run:runId},'You are now in the Next Up line.')} className="min-h-11 rounded-xl bg-[#318cf2] px-5 text-sm font-black disabled:opacity-50">Join Next Up</button>:
   <div className="flex items-center gap-3"><span className="text-xs font-bold text-[#afdcf8]">Your status: {active.status.toUpperCase()}</span>
    {active.status!=='playing'&&<button disabled={busy} onClick={()=>void act('rch_leave_run_queue',{p_entry:active.id},'You have left the queue.')} className="min-h-10 rounded-xl border border-[#7792a5] px-3 text-xs font-bold disabled:opacity-50">Leave queue</button>}</div>}
  </div>:<p className="mt-3 text-xs text-[#acd0eb]">Sign in and join this Run to enter Next Up.</p>}
  <div className="mt-5 space-y-2">
   {items.map((item,index)=>{
    const action=nextAction[item.status];
    return <div key={item.id} className="flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#365775] bg-[#0b2842] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
       <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#183d5e] text-sm font-black">{index+1}</span>
       <div><p className="truncate text-sm font-bold">{names[item.profile_id]||'RCH Player'}{item.profile_id===user?.id?' · You':''}</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-[#9bc8e5]"><FaBasketball/> {item.status==='playing'?'On court':item.status==='called'?'On deck':'Waiting for next game'}</p></div>
      </div>
      {manager&&action&&<button disabled={busy} onClick={()=>void act('rch_manage_run_queue',{p_entry:item.id,p_action:action.action},action.label+' recorded.')} className="flex min-h-10 items-center gap-1 rounded-lg bg-[#255f93] px-3 text-xs font-bold disabled:opacity-50">{action.label}<FaArrowRight/></button>}
    </div>;
   })}
   {!items.length&&<p className="rounded-xl border border-dashed border-[#4c7492] px-4 py-6 text-center text-sm text-[#b7d3e8]">Nobody is in the queue yet. Claim the first spot.</p>}
  </div>
  <p className="mt-4 text-[11px] text-[#91b6d1]">Queue position reflects entry order, not basketball rating. The host is responsible for fair game rotation and local court rules.</p>
 </section>;
}
