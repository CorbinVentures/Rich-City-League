'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {FaArrowRight,FaCheck,FaClock,FaLock,FaShieldHalved,FaXmark} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';
import {roleInfo,RCL_STAFF_ROLES} from '@/lib/rcl-staff-roles';
type Application={id:string;profile_id:string;role_code:string;team_id:string|null;status:string;motivation:string;created_at:string;review_note:string};
type Assignment={id:string;profile_id:string;role_code:string;team_id:string|null;active:boolean;assigned_at:string};
type Person={id:string;display_name:string|null;username:string|null;email?:string};
type Team={id:string;name:string;city:string|null};

export function StaffApprovalsDesk(){
 const {user,profile,loading:authLoading}=useAuth();
 const isAdmin=Boolean(user&&profile?.role==='admin');
 const db=useMemo(()=>getSupabaseClient() as unknown as SupabaseClient<any>|null,[]);
 const [applications,setApplications]=useState<Application[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [people,setPeople]=useState<Person[]>([]);
 const [teams,setTeams]=useState<Team[]>([]);
 const [note,setNote]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState('');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 const [filter,setFilter]=useState('pending');
 const load=useCallback(async()=>{
  if(!db||!isAdmin){setLoading(false);return;}
  const [apps,grants,clubs]=await Promise.all([
   db.from('rcl_staff_applications').select('id,profile_id,role_code,team_id,status,motivation,created_at,review_note').order('created_at',{ascending:false}).limit(300),
   db.from('rcl_staff_assignments').select('id,profile_id,role_code,team_id,active,assigned_at').eq('active',true).order('assigned_at',{ascending:false}).limit(300),
   db.from('teams').select('id,name,city').order('name').limit(300),
  ]);
  const firstError=[apps.error,grants.error,clubs.error].find(Boolean);
  if(firstError){setError(firstError.message);setLoading(false);return;}
  const rows=apps.data??[];
  const grantsRows=grants.data??[];
  const ids=[...new Set([...rows.map((a:Application)=>a.profile_id),...grantsRows.map((a:Assignment)=>a.profile_id)])];
  let profiles:Person[]=[];
  if(ids.length){
   const peopleResult=await db.from('profiles').select('id,display_name,username').in('id',ids).limit(300);
   if(peopleResult.error){setError(peopleResult.error.message);setLoading(false);return;}
   profiles=peopleResult.data??[];
  }
  setApplications(rows);setAssignments(grantsRows);setTeams(clubs.data??[]);setPeople(profiles);setError('');setLoading(false);
 },[db,isAdmin]);
 useEffect(()=>{void load();},[load]);
 const name=(id:string)=>{const p=people.find(p=>p.id===id);return p?.display_name||p?.username||'RCH member'};
 const team=(id:string|null)=>teams.find(t=>t.id===id)?.name??(id?'Team unavailable':'League-wide');
 const act=async(application:Application,decision:'approved'|'rejected')=>{
  if(!db||!isAdmin||busy)return;
  const prompt=decision==='approved'
   ?'Approve this member for the requested RCL role'+(application.team_id?' and team':'')+'? Franchise ownership is activated immediately upon approval.'
   :'Reject this staff application?';
  if(!window.confirm(prompt))return;
  setBusy(application.id);setError('');setSuccess('');
  const {error}=await db.rpc('rcl_review_staff_application',{p_application_id:application.id,p_decision:decision,p_note:(note[application.id]??'').slice(0,800)});
  if(error)setError(error.message);
  else{setSuccess(decision==='approved'?'Assignment approved and activated.':'Application rejected.');await load();}
  setBusy('');
 };
 const revoke=async(assignment:Assignment)=>{
  if(!db||!isAdmin||busy)return;
  if(!window.confirm('Revoke '+roleInfo(assignment.role_code)?.title+' for '+name(assignment.profile_id)+'? This immediately disables that staff assignment and franchise rights if applicable.'))return;
  setBusy(assignment.id);setError('');setSuccess('');
  const {error}=await db.rpc('rcl_revoke_staff_assignment',{p_assignment_id:assignment.id});
  if(error)setError(error.message);
  else{setSuccess('Staff assignment revoked.');await load();}
  setBusy('');
 };
 const filtered=applications.filter(a=>filter==='all'||a.status===filter);
 const pending=applications.filter(a=>a.status==='pending');
 const owners=assignments.filter(a=>a.role_code==='franchise_owner');
 if(authLoading||loading)return <main className="min-h-screen bg-[#08192b] p-7 text-sm text-white">Loading secure staff approvals…</main>;
 if(!isAdmin)return <main className="min-h-screen bg-[#08192b] p-7 text-white"><h1 className="text-2xl font-black">Administrator access required</h1><p className="mt-3 text-sm text-[#bad3e8]">Staff assignments are reviewed by RCL administrators. Applying for a position does not unlock this office.</p><Link href="/staff" className="mt-5 inline-block rounded-xl bg-[#226ca3] px-5 py-3 text-white">My staff requests</Link></main>;
 return <main className="min-h-screen bg-[#071b2e] px-4 py-7 text-white sm:px-8">
  <div className="mx-auto max-w-6xl space-y-6">
   <div><p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#8bc7f4]"><FaShieldHalved/> RCL GOVERNANCE · SECURE</p>
    <h1 className="mt-2 text-3xl font-black">Staff roles and approvals</h1>
    <Link href="/admin/staff/workspaces" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#95cdeb] bg-[#215b84] px-4 text-xs font-black text-white">Open all role workspaces <FaArrowRight/></Link>
    <p className="mt-2 text-sm leading-6 text-[#c5dbec]">Review applicants, approve official league appointments and revoke access. Members cannot approve themselves or grant themselves franchise ownership.</p>
   </div>
   <div className="grid gap-3 sm:grid-cols-3">{[
    ['Waiting for review',pending.length],['Active roles',assignments.length],['Approved franchise owners',owners.length]
   ].map(([label,count])=><div className="rounded-2xl border border-[#426f92] bg-[#102e49] p-4" key={label}><p className="text-xs font-black uppercase tracking-wider text-[#c1dbf0]">{label}</p><strong className="mt-2 block text-3xl font-black">{count}</strong></div>)}</div>
   {(error||success)&&<div role={error?'alert':'status'} className={'rounded-xl border p-4 text-sm '+(error?'border-[#b56975] bg-[#402632] text-[#ffe0e5]':'border-[#589782] bg-[#163d32] text-[#b9f4d7]')}>{error||success}</div>}
   <section className="rounded-2xl border border-[#456d90] bg-[#0d2842] p-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-black">Applications</h2>
     <div className="flex flex-wrap items-center gap-2">
      <select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Application status filter" className="min-h-11 rounded-lg border border-[#5080a3] bg-[#092239] px-4 text-sm text-white"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All applications</option></select>
      <button type="button" onClick={()=>void load()} className="min-h-11 rounded-lg border border-[#5080a3] px-4 text-xs font-bold">Refresh</button>
     </div>
    </div>
    {filtered.length?<div className="mt-5 space-y-3">{filtered.map(a=><article key={a.id} className="rounded-xl border border-[#466f8e] bg-[#0a2136] p-4 sm:p-5">
     <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-[10px] font-black uppercase tracking-wider text-[#a6d4f6]">{roleInfo(a.role_code)?.department}</p>
       <h3 className="mt-1 text-lg font-black">{roleInfo(a.role_code)?.title??a.role_code}</h3>
       <p className="mt-2 text-sm text-[#d0e2f1]"><Link href={'/social/profile/'+a.profile_id} className="underline underline-offset-4">{name(a.profile_id)}</Link> · {team(a.team_id)}</p>
       <p className="mt-1 text-xs text-[#bbd0e3]">Applied {new Date(a.created_at).toLocaleDateString()}</p>
      </div>
      <span className={'rounded-lg border px-3 py-2 text-xs font-black uppercase '+(a.status==='pending'?'border-[#987644] text-[#f4d198]':a.status==='approved'?'border-[#418f71] text-[#b5f7da]':'border-[#9e5262] text-[#f7bec9]')}>{a.status}</span>
     </div>
     {a.motivation&&<p className="mt-3 whitespace-pre-wrap rounded-lg border border-[#2f5475] bg-[#07192a] p-3 text-sm leading-6 text-[#d6e6f0]">{a.motivation}</p>}
     {a.role_code==='franchise_owner'&&<p className="mt-3 flex items-start gap-2 rounded-lg border border-[#a77d41] bg-[#382912] p-3 text-xs leading-5 text-[#f5d59e]"><FaLock className="shrink-0"/> Franchise ownership is not active until you approve this specific team assignment. Approval never grants global administrative access.</p>}
     {a.status==='pending'?<div className="mt-4 flex flex-col gap-3 border-t border-[#335b78] pt-4">
      <label className="text-xs font-black text-[#c5e3f4]">Private review note (optional)<input maxLength={800} value={note[a.id]??''} onChange={e=>setNote(x=>({...x,[a.id]:e.target.value}))} className="mt-2 h-11 w-full rounded-lg border border-[#4f7696] bg-[#071a2c] px-3 text-sm font-normal text-white" placeholder="Reason or next steps for the applicant"/></label>
      <div className="flex flex-wrap gap-2"><button disabled={Boolean(busy)} onClick={()=>void act(a,'approved')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#8cdbbc] bg-[#1e6a50] px-5 text-xs font-black text-white disabled:opacity-50"><FaCheck/> Approve & activate</button>
       <button disabled={Boolean(busy)} onClick={()=>void act(a,'rejected')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#cf9a9a] bg-[#773b48] px-5 text-xs font-black text-white disabled:opacity-50"><FaXmark/> Reject</button></div>
     </div>:a.review_note&&<p className="mt-3 text-xs text-[#d4c6c8]">Review note: {a.review_note}</p>}
    </article>)}</div>:<div className="mt-5 rounded-xl border border-dashed border-[#4a7493] p-8 text-center text-sm text-[#bed4e5]">No {filter==='all'?'':'matching '}applications.</div>}
   </section>
   <section className="rounded-2xl border border-[#456d90] bg-[#0d2842] p-5">
    <h2 className="text-xl font-black">Approved staff assignments</h2><p className="mt-2 text-xs text-[#c2dbed]">Revoking an assignment immediately removes its privileges. Existing RCH social accounts remain intact.</p>
    {assignments.length?<div className="mt-4 space-y-2">{assignments.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#436b8c] bg-[#091f32] p-4">
     <div><strong className="text-sm">{name(a.profile_id)}</strong><p className="mt-1 text-xs text-[#c6ddec]">{roleInfo(a.role_code)?.title??a.role_code} · {team(a.team_id)}</p></div>
     <button type="button" disabled={Boolean(busy)} onClick={()=>void revoke(a)} className="min-h-10 rounded-lg border border-[#b4767c] px-4 text-xs font-black text-[#ffd4d7] hover:bg-[#43242d] disabled:opacity-50">Revoke role</button>
    </div>)}</div>:<p className="mt-4 text-sm text-[#a9c6d8]">No active assignments.</p>}
   </section>
   <div className="flex flex-wrap gap-2">{RCL_STAFF_ROLES.map(r=><span key={r.id} className="rounded-full border border-[#436c8b] bg-[#102f49] px-3 py-2 text-[10px] font-bold text-[#c4e0f2]">{r.title}</span>)}</div>
   <Link href="/staff" className="inline-flex items-center gap-2 text-sm font-bold text-[#9ad4fc]">View member staff portal <FaArrowRight/></Link>
  </div>
 </main>;
}
