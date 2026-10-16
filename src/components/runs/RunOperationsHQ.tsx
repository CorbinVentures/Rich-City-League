'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaCircleCheck, FaClipboardCheck, FaPeopleGroup, FaShieldHalved } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Operator = { profile_id: string; role: 'cohost' | 'scorekeeper' | 'official' };
type Task = { task_code: string; completed: boolean; note: string };
type Match = { id: string; status: string; home_score: number; away_score: number; home_roster: string[]; away_roster: string[] };
type Attestation = { match_id: string; official_id: string };
const tasks = [
  {code:'venue_confirmed',label:'Court, access and time confirmed'},
  {code:'rules_briefed',label:'Game rules and scoring explained'},
  {code:'teams_assigned',label:'Both squads assigned to the roster'},
  {code:'official_assigned',label:'Independent title official appointed'},
  {code:'safety_reviewed',label:'Safety, weather and venue restrictions checked'},
  {code:'scores_reconciled',label:'Scores and disputes reconciled'},
  {code:'postgame_complete',label:'Postgame results and media reviewed'},
] as const;

export function RunOperationsHQ({runId,hostId}:{runId:string;hostId:string}) {
  const {user} = useAuth();
  const db = useMemo(() => getSupabaseClient(true) as any, []);
  const [isManager,setIsManager] = useState(false);
  const [ownRole,setOwnRole] = useState('');
  const [operators,setOperators] = useState<Operator[]>([]);
  const [taskRows,setTaskRows] = useState<Task[]>([]);
  const [takeoverCount,setTakeoverCount] = useState(0);
  const [matches,setMatches] = useState<Match[]>([]);
  const [attested,setAttested] = useState<Attestation[]>([]);
  const [handles,setHandles] = useState<Record<string,string>>({});
  const [username,setUsername] = useState('');
  const [role,setRole] = useState<Operator['role']>('official');
  const [busy,setBusy] = useState('');
  const [feedback,setFeedback] = useState('');
  const [revision,setRevision] = useState(0);
  const [loaded,setLoaded] = useState(false);
  const [available,setAvailable] = useState(true);
  const canAccess = isManager || Boolean(ownRole);
  const canCertify = isManager || ownRole==='official';

  useEffect(() => {
    if (!db || !user?.id || !runId) {setLoaded(true);return;}
    let active=true;
    const load=async()=>{
      const [managerResult,myRoleResult]=await Promise.all([
        db.rpc('can_manage_run',{target_run:runId}),
        db.from('rch_run_operators').select('profile_id,role').eq('run_id',runId).eq('profile_id',user.id).maybeSingle(),
      ]);
      if(!active)return;
      const manage=Boolean(managerResult.data)||user.id===hostId;
      const assigned=myRoleResult.data?.role ?? '';
      setIsManager(manage);
      setOwnRole(assigned);
      if(myRoleResult.error){setAvailable(false);setLoaded(true);return;}
      if(!manage&&!assigned){setLoaded(true);return;}
      const [operatorRes,taskRes,takeoverRes,matchRes]=await Promise.all([
        db.from('rch_run_operators').select('profile_id,role').eq('run_id',runId),
        db.from('rch_run_operations').select('task_code,completed,note').eq('run_id',runId),
        db.from('rch_court_takeovers').select('id').eq('run_id',runId).eq('status','accepted'),
        db.from('run_ranked_matches').select('id,status,home_score,away_score,home_roster,away_roster').eq('run_id',runId).eq('status','pending').limit(30)
      ]);
      if(!active)return;
      if(operatorRes.error||taskRes.error){setAvailable(false);setLoaded(true);return;}
      const ops=(operatorRes.data??[]) as Operator[];
      setOperators(ops);
      setTaskRows((taskRes.data??[]) as Task[]);
      setTakeoverCount((takeoverRes.data??[]).length);
      setMatches((matchRes.data??[]) as Match[]);
      const ids=ops.map(o=>o.profile_id);
      if(ids.length){
        const {data:names}=await db.from('profiles').select('id,display_name,username').in('id',ids).limit(35);
        if(active)setHandles(Object.fromEntries((names??[]).map((p:any)=>[p.id,p.display_name||p.username||'RCH member'])));
      }
      const gameIds=(matchRes.data??[]).map((m:Match)=>m.id);
      if(gameIds.length) {
        const {data:certs}=await db.from('rch_run_title_attestations').select('match_id,official_id').in('match_id',gameIds);
        if(active)setAttested((certs??[]) as Attestation[]);
      } else setAttested([]);
      if(active){setLoaded(true);setAvailable(true);}
    };
    void load();
    return ()=>{active=false;};
  },[db,hostId,runId,user?.id,revision]);

  const act=async (label:string,fn:string,args:Record<string,unknown>,success:string)=>{
    if(!db||!user)return;
    setBusy(label);setFeedback('');
    const {error}=await db.rpc(fn,args);
    setBusy('');
    setFeedback(error?error.message:success);
    if(!error)setRevision(v=>v+1);
  };

  const addOperator=async()=>{
    if(!db||!username.trim()||busy)return;
    setBusy('lookup');setFeedback('');
    const handle=username.trim().replace(/^@/,'');
    const {data,error}=await db.from('profiles').select('id').eq('username',handle).limit(1).maybeSingle();
    if(error||!data){setFeedback(error?.message||'No member with that exact username. Ask them to create an RCH profile.');setBusy('');return;}
    setBusy('');
    await act('operator','rch_manage_run_operator',{
      p_run:runId,p_profile:data.id,p_role:role,p_enable:true
    },'Operator appointed. Their scoped Run Room access is active.');
    setUsername('');
  };

  if(!user||!loaded||!canAccess)return null;
  return <section aria-labelledby="rch-runs-ops-title" className="mt-6 rounded-3xl border border-[#376a89] bg-[#071f34] p-5 text-white sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.18em] text-[#94d2ff]"><FaClipboardCheck/> RCH Runs · Organizer OS</p>
        <h2 id="rch-runs-ops-title" className="mt-2 text-2xl font-black uppercase">Run Operations HQ</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#a9c7da]">Scoped officials, accountable preparation and championship review. Every change is recorded in an administrative audit trail.</p>
      </div>
      <span className="rounded-full border border-[#4d7898] px-3 py-1 text-xs font-bold">{isManager?'Run manager':ownRole}</span>
    </div>
    {!available&&<p role="alert" className="mt-4 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-sm">The new Organizer OS database migration is not active yet. Existing run tools remain available.</p>}
    {feedback&&<p role="status" className="mt-4 rounded-lg border border-[#4b7ea2] bg-[#0d3552] p-3 text-sm">{feedback}</p>}
    {available&&<div className="mt-6 grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-[#345571] bg-[#0c2b44] p-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase"><FaCircleCheck/> Game Day Readiness</h3>
        <p className="mt-1 text-xs text-[#98bcd4]">{taskRows.filter(t=>t.completed).length} of {tasks.length} checks completed</p>
        <div className="mt-4 space-y-2">{tasks.map(task=>{
          const record=taskRows.find(t=>t.task_code===task.code);
          return <button type="button" key={task.code} disabled={Boolean(busy)}
            onClick={()=>void act(task.code,'rch_set_run_operation',{p_run:runId,p_task:task.code,p_complete:!record?.completed,p_note:record?.note??''},task.label+' updated.')}
            aria-pressed={Boolean(record?.completed)}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-[#42617a] bg-[#082033] px-3 py-2 text-left text-xs font-semibold disabled:opacity-50">
            <span className={'grid h-5 w-5 shrink-0 place-items-center rounded border '+(record?.completed?'border-emerald-400 bg-emerald-500/20 text-emerald-300':'border-[#7896aa] text-[#c1d6e4]')}>{record?.completed?'✓':''}</span>
            {task.label}
          </button>;
        })}</div>
      </div>
      <div className="rounded-2xl border border-[#345571] bg-[#0c2b44] p-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase"><FaPeopleGroup/> Run Staff</h3>
        <p className="mt-1 text-xs text-[#98bcd4]">Officials certify title matches; cohosts and scorekeepers manage assigned preparation tasks. Only the host can edit game records.</p>
        <div className="mt-4 space-y-2">{operators.map(o=><div key={o.profile_id} className="flex items-center justify-between gap-2 rounded-lg border border-[#42617a] p-3 text-xs">
          <span className="min-w-0 truncate"><strong>{handles[o.profile_id]||o.profile_id.slice(0,8)}</strong> <span className="ml-1 text-[#8fbbdb]">· {o.role}</span></span>
          {isManager&&<button disabled={Boolean(busy)} onClick={()=>void act(o.profile_id,'rch_manage_run_operator',{p_run:runId,p_profile:o.profile_id,p_role:o.role,p_enable:false},'Operator access removed.')} className="rounded-md border border-[#658097] px-2 py-1 disabled:opacity-50">Remove</button>}
        </div>)}
        {!operators.length&&<p className="rounded-lg border border-dashed border-[#42617a] p-3 text-xs text-[#a6c9e2]">No additional officials appointed.</p>}
        </div>
        {isManager&&<div className="mt-4 space-y-3 border-t border-[#345571] pt-4">
          <label className="block text-xs font-bold text-[#a7c9e1]">RCH member username
            <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="@username" maxLength={60} className="mt-2 min-h-11 w-full rounded-lg border border-[#51738e] bg-[#061827] px-3 text-sm text-white"/>
          </label>
          <select value={role} onChange={e=>setRole(e.target.value as Operator['role'])} aria-label="Assign run role" className="min-h-11 w-full rounded-lg border border-[#51738e] bg-[#061827] px-3 text-sm text-white">
            <option value="official">Independent official</option><option value="cohost">Cohost</option><option value="scorekeeper">Scorekeeper</option>
          </select>
          <button disabled={Boolean(busy)||!username.trim()} onClick={()=>void addOperator()} className="min-h-11 rounded-lg bg-[#4cacf3] px-4 text-xs font-black text-[#041e32] disabled:opacity-50">Appoint member</button>
        </div>}
      </div>
    </div>}
    {available&&takeoverCount>0&&<div className="mt-5 rounded-2xl border border-[#997741] bg-[#262a28] p-4">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase text-[#ffe0a3]"><FaShieldHalved/> Independent Takeover Certification</h3>
      <p className="mt-2 text-xs leading-5 text-[#e6d5b5]">An accepted Crew Takeover must have an official who is neither a player, score submitter nor member of either crew. The official certifies the match before the final opponent confirmation activates ratings and transfers territory.</p>
      {canCertify&&<div className="mt-4 space-y-3">{matches.map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#7b6951] p-3">
        <span className="text-sm font-bold">Pending result · {m.home_score} – {m.away_score}</span>
        {attested.some(a=>a.match_id===m.id)?<span className="text-xs font-bold text-emerald-200">Official proof recorded</span>:
          <button disabled={Boolean(busy)} onClick={()=>void act(m.id,'rch_certify_ranked_title_match',{p_match:m.id,p_note:''},'Official certification recorded. Competitors can now finalize the verified result.')} className="min-h-10 rounded-lg bg-[#efd49a] px-4 text-xs font-black text-[#241706] disabled:opacity-50">Certify Takeover Result</button>}
      </div>)}
      {!matches.length&&<p className="text-xs text-[#d9c7a7]">No pending ranked result to certify yet.</p>}
      </div>}
      {!canCertify&&<p className="mt-3 text-xs text-[#d9c7a7]">Only an appointed independent official or authorized RCH staff can certify a title result.</p>}
    </div>}
  </section>;
}
