'use client';

import {useEffect,useMemo,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {FaArrowRight,FaCheck,FaMagnifyingGlass,FaUserGear} from 'react-icons/fa6';
import {RCL_STAFF_ROLES,type RCLStaffRole} from '@/lib/rcl-staff-roles';

type Member={id:string;display_name:string|null;username:string|null;first_name:string|null;last_name:string|null;role:string};
type Team={id:string;name:string;city:string|null};
type Existing={id:string;profile_id:string;role_code:string;team_id:string|null;active:boolean};
type Props={
 db:SupabaseClient<any>;
 teams:Team[];
 assignments:Existing[];
 adminId:string;
 onAssigned:()=>Promise<void>;
};
const field='mt-2 min-h-12 w-full min-w-0 rounded-xl border border-[#5d87a6] bg-[#091d31] px-4 text-sm text-white outline-none focus:border-[#acdcff]';
const displayName=(person:Member)=>person.display_name?.trim()||[person.first_name,person.last_name].filter(Boolean).join(' ')||person.username||'RCH member';

export function StaffDirectAssign({db,teams,assignments,adminId,onAssigned}:Props){
 const [search,setSearch]=useState('');
 const [matches,setMatches]=useState<Member[]>([]);
 const [selected,setSelected]=useState<Member|null>(null);
 const [searching,setSearching]=useState(false);
 const [role,setRole]=useState<RCLStaffRole>('accountant');
 const [teamId,setTeamId]=useState('');
 const [working,setWorking]=useState(false);
 const [feedback,setFeedback]=useState('');
 const [error,setError]=useState(false);
 const chosen=useMemo(()=>RCL_STAFF_ROLES.find(r=>r.id===role)!,[role]);
 const term=search.trim().replace(/[^\w\s-]/g,'').slice(0,65);
 useEffect(()=>{
  if(selected||term.length<2){setMatches([]);setSearching(false);return;}
  let active=true;
  const t=setTimeout(async()=>{
   setSearching(true);
   const {data,error:queryError}=await db.from('profiles')
    .select('id,display_name,username,first_name,last_name,role')
    .eq('is_active',true).eq('is_system_account',false)
    .or('display_name.ilike.%'+term+'%,username.ilike.%'+term+'%,first_name.ilike.%'+term+'%,last_name.ilike.%'+term+'%')
    .order('display_name',{ascending:true}).limit(12);
   if(!active)return;
   if(queryError){setFeedback('Member search failed: '+queryError.message);setError(true);setMatches([]);}
   else setMatches((data??[]).filter((m:Member)=>m.id!==adminId));
   setSearching(false);
  },250);
  return()=>{active=false;clearTimeout(t);};
 },[db,term,selected,adminId]);
 const currentRoles=selected?assignments.filter(a=>a.active&&a.profile_id===selected.id):[];
 const duplicate=currentRoles.some(a=>a.role_code===role&&a.team_id===(teamId||null));
 const removeExisting=async(assignment:Existing)=>{
  if(!selected||working)return;
  const name=displayName(selected);
  const title=RCL_STAFF_ROLES.find(r=>r.id===assignment.role_code)?.title??assignment.role_code;
  if(!window.confirm('Remove '+title+' from '+name+'? Staff access for this role will stop immediately.'))return;
  setWorking(true);setFeedback('');setError(false);
  const {error:revokeError}=await db.rpc('rcl_revoke_staff_assignment',{p_assignment_id:assignment.id});
  if(revokeError){setFeedback(revokeError.message);setError(true);}
  else{await onAssigned();setFeedback(title+' was removed from '+name+'.');}
  setWorking(false);
 };
 const teamMissing=chosen.teamRequired&&!teamId;
 const assign=async(e:FormEvent)=>{
  e.preventDefault();
  if(!selected||working||teamMissing||duplicate)return;
  const teamName=teams.find(t=>t.id===teamId)?.name??'league-wide';
  if(!window.confirm('Assign '+displayName(selected)+' as '+chosen.title+' ('+teamName+')? This activates the official staff role immediately.'))return;
  setWorking(true);setError(false);setFeedback('');
  const {error:assignmentError}=await db.rpc('rcl_admin_assign_staff_role',{
   p_profile_id:selected.id,p_role_code:role,p_team_id:teamId||null
  });
  if(assignmentError){setError(true);setFeedback(assignmentError.message);setWorking(false);return;}
  const assignedName=displayName(selected);
  setSelected(null);setSearch('');setMatches([]);setRole('accountant');setTeamId('');
  await onAssigned();
  setFeedback(assignedName+' now has the '+chosen.title+' assignment. You can revoke it below at any time.');
  setError(false);setWorking(false);
 };
 return <section id="assign-member-role" aria-label="Assign an RCL staff role to an existing member" className="rounded-2xl border border-[#648eb0] bg-[linear-gradient(130deg,#103552,#0b253c)] p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.17em] text-[#a3d5fb]"><FaUserGear/> DIRECT MEMBER ASSIGNMENT</p>
    <h2 className="mt-2 text-2xl font-black text-white">Assign member role</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c8e0ef]">Already have a member? Search for their RCH profile and assign an official league staff role without waiting for an application.</p>
   </div>
   <span className="rounded-lg border border-[#77afcf] bg-[#153d5e] px-3 py-2 text-xs font-bold text-[#d9efff]">Admin only</span>
  </div>
  <form onSubmit={e=>void assign(e)} className="mt-5 space-y-4">
   <div className="grid gap-4 md:grid-cols-2">
    <div className="min-w-0">
     <label htmlFor="staff-member-search" className="text-xs font-black text-[#e2f3ff]">1. Find the existing member</label>
     {selected?<div className="mt-2 flex min-h-14 items-center justify-between gap-3 rounded-xl border border-[#83bba4] bg-[#11372f] p-3">
      <div className="min-w-0"><span className="flex items-center gap-2 text-sm font-black text-white"><FaCheck className="text-[#95ebc2]"/>{displayName(selected)}</span><span className="block text-xs text-[#bbe3d2]">{selected.username?'@'+selected.username+' · ':''}RCH member</span></div>
      <button type="button" className="min-h-9 rounded-lg border border-[#619f90] px-3 text-xs font-bold text-white" onClick={()=>{setSelected(null);setSearch('');setFeedback('');}}>Change</button>
     </div>:<div className="relative">
      <div className={'flex items-center gap-3 '+field}><FaMagnifyingGlass className="shrink-0 text-[#a9d4f3]"/><input id="staff-member-search" type="search" autoComplete="off" value={search} onChange={e=>{setSearch(e.target.value);setFeedback('');}} placeholder="Search name or username" aria-describedby="member-search-help" className="w-full min-w-0 bg-transparent py-3 text-sm text-white outline-none placeholder:text-[#b8cfe0]"/></div>
      <p id="member-search-help" className="mt-2 text-xs text-[#bdd5e7]">{term.length<2?'Enter at least two characters.':searching?'Finding members…':matches.length?'Select the correct member below.':'Search active RCH members by name or username.'}</p>
      {matches.length>0&&<div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-xl border border-[#5987a7] bg-[#081b2c] p-1" role="group" aria-label="Matching RCH members">
       {matches.map(person=><button key={person.id} type="button" onClick={()=>{setSelected(person);setSearch('');setMatches([]);setFeedback('');}} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg p-3 text-left hover:bg-[#204a6c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#98d9ff]">
        <span className="min-w-0"><strong className="block truncate text-sm text-white">{displayName(person)}</strong><small className="block truncate text-xs text-[#c1d7ea]">{person.username?'@'+person.username:'RCH member'} · {person.role}</small></span><FaArrowRight className="shrink-0 text-[#9acbef]"/></button>)}
      </div>}
     </div>}
    </div>
    <div><label htmlFor="staff-direct-role" className="text-xs font-black text-[#e2f3ff]">2. Choose staff role</label>
     <select id="staff-direct-role" value={role} onChange={e=>{setRole(e.target.value as RCLStaffRole);setTeamId('');setFeedback('');}} className={field}>
      {RCL_STAFF_ROLES.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
     </select>
     <p className="mt-2 text-xs leading-5 text-[#bad1e3]">{chosen.description}</p>
    </div>
   </div>
   <div><label htmlFor="staff-direct-team" className="text-xs font-black text-[#e2f3ff]">3. {chosen.teamRequired?'Select the specific team (required)':'Select team (optional)'}</label>
    <select id="staff-direct-team" value={teamId} required={chosen.teamRequired} onChange={e=>{setTeamId(e.target.value);setFeedback('');}} className={field}>
     <option value="">{chosen.teamRequired?'Select an active RCL team':'League-wide assignment'}</option>
     {teams.map(t=><option key={t.id} value={t.id}>{t.name}{t.city?' · '+t.city:''}</option>)}
    </select>
   </div>
   {selected&&<div className="rounded-xl border border-[#4d7795] bg-[#0a2136] p-4">
    <h3 className="text-xs font-black uppercase tracking-wider text-[#b8dafa]">Current RCL staff roles for {displayName(selected)}</h3>
    {currentRoles.length?<div className="mt-3 space-y-2">{currentRoles.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#436e88] bg-[#102e47] p-3">
     <span className="text-xs font-bold text-[#e4f2fc]">{RCL_STAFF_ROLES.find(r=>r.id===a.role_code)?.title??a.role_code} · {a.team_id?teams.find(t=>t.id===a.team_id)?.name??'Assigned team':'League-wide'}</span>
     <button type="button" disabled={working} onClick={()=>void removeExisting(a)} className="min-h-9 rounded-lg border border-[#a8737e] px-3 text-xs font-bold text-[#ffd7de] disabled:opacity-50">Remove role</button>
    </div>)}</div>:<p className="mt-2 text-xs text-[#bacfe0]">No assigned staff roles yet. Select a role above to activate one.</p>}
   </div>}
   {duplicate&&<p className="rounded-lg border border-[#9c8456] bg-[#3b3020] p-3 text-xs text-[#f6dfac]">This member already holds that active role for the selected team. To change it, revoke their assignment below.</p>}
   {feedback&&<p role={error?'alert':'status'} className={'rounded-xl border p-3 text-sm '+(error?'border-[#bd7380] bg-[#48242d] text-[#ffe3e7]':'border-[#6aab89] bg-[#113e35] text-[#c6ffe0]')}>{feedback}</p>}
   <button type="submit" disabled={!selected||teamMissing||duplicate||working} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#a8d9fb] bg-[#2776b0] px-6 text-sm font-black text-white hover:bg-[#3588c2] disabled:cursor-not-allowed disabled:opacity-45">
    {working?'Assigning member…':'Assign '+chosen.title}<FaArrowRight/>
   </button>
   <p className="text-xs leading-5 text-[#b9cfdf]">Assignment is recorded with your administrator account and can be revoked below. Their existing member profile, followers, and posts are unchanged. Franchise Owner and RCL Coach require an exact team.</p>
  </form>
 </section>;
}
