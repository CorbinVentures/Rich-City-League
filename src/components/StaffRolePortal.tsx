'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {FaArrowRight,FaBasketball,FaBriefcase,FaCheck,FaClock,FaLock,FaPeopleGroup,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';
import {RCL_STAFF_ROLES,roleInfo,type RCLStaffRole} from '@/lib/rcl-staff-roles';
import {staffDeskHref} from '@/lib/rcl-staff-admin-tools';

type Team={id:string;name:string;city:string|null;is_active:boolean};
type Application={id:string;profile_id:string;role_code:string;team_id:string|null;motivation:string;status:string;review_note:string;created_at:string};
type Assignment={id:string;profile_id:string;role_code:string;team_id:string|null;active:boolean;assigned_at:string};
const inputClass='w-full min-h-12 rounded-xl border border-[#507b9d] bg-[#091e31] px-4 py-3 text-sm text-white outline-none focus:border-[#9ad3ff]';
export function StaffRolePortal(){
 const {user,profile,loading:authLoading}=useAuth();
 const isAdmin=Boolean(user&&profile?.role==='admin');
 const db=useMemo(()=>getSupabaseClient() as unknown as SupabaseClient<any>|null,[]);
 const [applications,setApplications]=useState<Application[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [teams,setTeams]=useState<Team[]>([]);
 const [role,setRole]=useState<RCLStaffRole>('league_coach');
 const [teamId,setTeamId]=useState('');
 const [motivation,setMotivation]=useState('');
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const [isError,setIsError]=useState(false);
 const selected=roleInfo(role)!;
 const load=useCallback(async()=>{
  if(!db||!user){setLoading(false);return;}
  const [apps,grants,clubs]=await Promise.all([
   db.from('rcl_staff_applications').select('id,profile_id,role_code,team_id,motivation,status,review_note,created_at').eq('profile_id',user.id).order('created_at',{ascending:false}).limit(100),
   db.from('rcl_staff_assignments').select('id,profile_id,role_code,team_id,active,assigned_at').eq('profile_id',user.id).eq('active',true),
   db.from('teams').select('id,name,city,is_active').eq('is_active',true).order('name').limit(250),
  ]);
  const error=[apps.error,grants.error,clubs.error].find(Boolean);
  if(error){setMessage(error.message);setIsError(true);}
  else{setApplications(apps.data??[]);setAssignments(grants.data??[]);setTeams(clubs.data??[]);}
  setLoading(false);
 },[db,user]);
 useEffect(()=>{void load();},[load]);
 const teamName=(id:string|null)=>teams.find(t=>t.id===id)?.name??(id?'Assigned team':'League-wide');
 const request=async(event:FormEvent)=>{
  event.preventDefault();
  if(!db||!user||saving)return;
  if(selected.teamRequired&&!teamId){setMessage('Choose a team before requesting this role.');setIsError(true);return;}
  const chosenTeam=selected.teamRequired?teamId:(teamId||null);
  if(applications.some(a=>a.status==='pending'&&a.role_code===role&&a.team_id===chosenTeam)){
   setMessage('You already have a pending request for that role and team.');setIsError(true);return;
  }
  setSaving(true);setMessage('');setIsError(false);
  const {error}=await db.from('rcl_staff_applications').insert({
   profile_id:user.id,role_code:role,team_id:chosenTeam,motivation:motivation.trim().slice(0,1000),status:'pending'
  });
  if(error){setMessage(error.code==='23505'?'This application is already pending.':error.message);setIsError(true);}
  else{setMessage('Application submitted. RCL administration must approve an assignment before staff or franchise access is active.');setTeamId('');setMotivation('');await load();}
  setSaving(false);
 };
 return <main className="min-h-screen bg-[#071725] pb-28 text-white">
  <section className="border-b border-[#375f81] bg-[radial-gradient(ellipse_at_90%_0%,#194977,transparent_55%),linear-gradient(120deg,#081b2e,#0d2b46)] px-4 py-9 sm:px-8 sm:py-12">
   <div className="mx-auto max-w-6xl">
    <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#a6d9ff]"><FaShieldHalved/> RICH CITY LEAGUE · STAFF HQ</p>
    <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Be part of <span className="text-[#a2d7ff]">the organization.</span></h1>
    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#d5e7f5]">Coaches, game officials, accountants, production teams and franchise leadership—all coordinated through your existing RCH member account.</p>
    <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#537f9f] bg-[#102e4a] px-3 py-2 text-xs font-bold text-[#cee8fc]"><FaLock aria-hidden="true"/> Roles do not grant admin access. Franchise ownership always requires RCL approval.</div>
   </div>
  </section>
  <div className="mx-auto max-w-6xl space-y-7 px-4 py-7 sm:px-8">
   {authLoading||loading?<div className="rounded-2xl border border-[#476f91] bg-[#0b2841] p-8 text-sm">Loading your staff workspace…</div>:
    !user?<div className="rounded-2xl border border-[#476f91] bg-[#0b2841] p-8">
     <h2 className="text-2xl font-black">Sign in to RCH to apply.</h2>
     <p className="mt-2 text-sm text-[#c7deed]">Every staff application is linked to your regular RCH profile; you do not need a second account.</p>
     <div className="mt-5 flex flex-wrap gap-3"><Link className="rounded-xl bg-[#2775b2] px-5 py-3 text-sm font-bold text-white" href="/auth/sign-in?next=/staff">Sign in</Link><Link className="rounded-xl border border-[#5b8bb0] px-5 py-3 text-sm font-bold text-white" href="/auth/sign-up?next=/staff">Join RCH free</Link></div>
    </div>:<>
    <section aria-label="Your approved staff roles" className="rounded-2xl border border-[#416a8b] bg-[#0c263f] p-5 sm:p-7">
     <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">My active assignments</h2><span className="rounded-full border border-[#4d7d9f] px-3 py-1 text-xs text-[#c8dff2]">{assignments.length} approved</span></div>
     {assignments.length?<div className="mt-4 grid gap-3 md:grid-cols-2">
      {assignments.map(a=>{const info=roleInfo(a.role_code);return <div key={a.id} className="rounded-xl border border-[#45876f] bg-[#103632] p-4">
       <div className="flex gap-2 text-xs font-black uppercase tracking-wider text-[#a4f6d1]"><FaCheck aria-hidden="true"/> Approved assignment</div>
       <h3 className="mt-2 text-lg font-black">{info?.title??a.role_code}</h3><Link href={staffDeskHref(a.role_code as RCLStaffRole,a.team_id)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#72bda9] bg-[#184d42] px-3 py-2.5 text-xs font-black text-white">Open my role workspace <FaArrowRight/></Link><p className="mt-1 text-xs text-[#c4e6dc]">{teamName(a.team_id)} · Assigned {new Date(a.assigned_at).toLocaleDateString()}</p>
       {a.role_code==='franchise_owner'&&<p className="mt-3 rounded-lg border border-[#4a8a83] bg-[#092b2b] p-3 text-xs leading-5 text-[#ccede7]">Franchise assignment confirmed for <strong>{teamName(a.team_id)}</strong>. This does not unlock the league-wide financial command center or any other franchise.</p>}
       <div className="mt-4 flex flex-wrap gap-2">{(info?.actions??[]).map(action=><Link key={action.href} href={action.href} title={action.note} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#4f8f90] bg-[#164b4a] px-3 text-xs font-bold text-white">{action.title}<FaArrowRight aria-hidden="true"/></Link>)}</div>
      </div>})}
     </div>:<p className="mt-4 rounded-xl border border-dashed border-[#466f91] p-5 text-sm text-[#bfd5e9]">No approved staff assignments yet. Apply below to start the review process.</p>}
    </section>
    {applications.length>0&&<section className="rounded-2xl border border-[#436b8e] bg-[#0d2942] p-5 sm:p-7" aria-label="My applications">
     <h2 className="text-xl font-black">My applications</h2>
     <div className="mt-4 space-y-2">{applications.map(a=><div key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#3d6689] bg-[#081e31] p-4">
      <div className="min-w-0"><strong className="text-sm">{roleInfo(a.role_code)?.title??a.role_code}</strong><p className="mt-1 text-xs text-[#bcd4e8]">{teamName(a.team_id)} · {new Date(a.created_at).toLocaleDateString()}</p>{a.status==='rejected'&&a.review_note&&<p className="mt-2 text-xs text-[#e7c6c8]">Review note: {a.review_note}</p>}</div>
      <span className={'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-black uppercase '+(a.status==='approved'?'border-[#43856e] text-[#9af0c5]':a.status==='rejected'?'border-[#965363] text-[#f4b2bd]':'border-[#a98648] text-[#f3d38e]')}>{a.status==='pending'&&<FaClock/>}{a.status}</span>
     </div>)}</div>
    </section>}
    {isAdmin&&<section className="rounded-2xl border border-[#5490b0] bg-[linear-gradient(130deg,#0d3355,#09223a)] p-5 sm:p-7" aria-label="Administrator staff role switcher">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#a6d8fc]">ADMINISTRATOR ROLE ACCESS</p>
       <h2 className="mt-2 text-2xl font-black">Open any RCL role workspace</h2>
       <p className="mt-2 max-w-xl text-sm leading-6 text-[#c7deef]">You already have administrative authority. Inspect each position without requesting approval or making yourself a franchise owner.</p></div>
       <Link href="/admin/staff" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#9dd0f4] bg-[#215b85] px-4 text-xs font-black text-white">Manage staff approvals <FaArrowRight/></Link></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{RCL_STAFF_ROLES.map(item=><Link href={staffDeskHref(item.id)} key={item.id} className="group flex min-h-36 flex-col justify-between gap-3 rounded-xl border border-[#4c82a5] bg-[#0a2942] p-4 text-white hover:border-[#a7dcff] hover:bg-[#1b496c]">
        <span><small className="text-[10px] font-black uppercase tracking-[.12em] text-[#add8f7]">{item.department}</small><strong className="mt-2 block text-base font-black">{item.title}</strong><span className="mt-2 block text-xs leading-5 text-[#c5ddef]">{item.description}</span></span>
        <span className="inline-flex items-center justify-between text-xs font-black text-[#a8dafe]">Open workspace <FaArrowRight className="group-hover:translate-x-1"/></span>
       </Link>)}</div>
      <p className="mt-4 text-xs leading-5 text-[#b7d3e7]">Viewing a role as an administrator never grants or fabricates employee approvals. Franchise owner approval for ordinary member accounts is still mandatory.</p>
     </section>}
    {!isAdmin&&(    <section className="rounded-2xl border border-[#416b8d] bg-[#0c2942] p-5 sm:p-7">
     <div className="mb-5"><h2 className="text-2xl font-black">Request a staff role</h2><p className="mt-2 text-sm leading-6 text-[#c6deef]">Choose your position and tell us a little about your experience. Requests are reviewed by RCL administration; submission alone does not grant a position.</p></div>
     <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Select staff position">{RCL_STAFF_ROLES.map(item=><button key={item.id} type="button" aria-pressed={role===item.id} onClick={()=>{setRole(item.id);setTeamId('');setMessage('');}} className={'min-h-32 rounded-xl border p-4 text-left transition '+(role===item.id?'border-[#a8deff] bg-[#235781] shadow-[inset_0_2px_0_#b6e4ff]':'border-[#487397] bg-[#0b233a] hover:border-[#a1cced]')}>
      <small className="text-[10px] font-black uppercase tracking-wider text-[#9ccffa]">{item.department}</small>
      <strong className="mt-2 block text-base font-black leading-5 text-white">{item.title}</strong>
      <span className="mt-2 block text-xs leading-5 text-[#c8dcec]">{item.description}</span>
      {item.id==='franchise_owner'&&<span className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#e1ba70] px-2 py-1 text-[10px] font-black uppercase text-[#f6d49a]"><FaLock/> Approval required</span>}
     </button>)}</div>
     <form className="mt-6 space-y-4 border-t border-[#345b7b] pt-5" onSubmit={e=>void request(e)}>
      <p className="text-sm font-black">{selected.title}</p>
      <div className="grid gap-4 sm:grid-cols-2">
       <label className="text-xs font-bold text-[#e2f0fc]">{selected.teamRequired?'Preferred team · required':'Preferred team · optional'}
        <select className={'mt-2 '+inputClass} required={selected.teamRequired} value={teamId} onChange={e=>setTeamId(e.target.value)}>
         <option value="">{selected.teamRequired?'Select a team':'League-wide / not assigned to a team'}</option>
         {teams.map(t=><option key={t.id} value={t.id}>{t.name}{t.city?' · '+t.city:''}</option>)}
        </select>
       </label>
       <div className="rounded-xl border border-[#3c6a8b] bg-[#0a2136] p-4 text-xs leading-5 text-[#c9ddec]">
        <FaBriefcase className="mb-2 text-[#9ed4fc]"/>{selected.id==='franchise_owner'?'Franchise owners must be approved for a specific team by an RCL administrator. Until approval, you remain a regular member without franchise access.':'An administrator will review this request. A team preference does not create a coaching appointment or other position.'}
       </div>
      </div>
      <label className="block text-xs font-bold text-[#e2f0fc]">Experience / reason for applying
       <textarea className={'mt-2 min-h-28 '+inputClass} maxLength={1000} value={motivation} onChange={e=>setMotivation(e.target.value)} placeholder="Tell RCL about your experience, availability and interest…" />
      </label>
      {message&&<div role={isError?'alert':'status'} className={'rounded-xl border p-3 text-sm '+(isError?'border-[#a65c68] bg-[#3f202c] text-[#ffd9dd]':'border-[#468a70] bg-[#113c31] text-[#b9f1dc]')}>{message}</div>}
      <button type="submit" disabled={saving||(selected.teamRequired&&!teamId)} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#a1d7fc] bg-[#2676b3] px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45">{saving?'Submitting…':'Submit request'}<FaArrowRight aria-hidden="true"/></button>
     </form>
    </section>)}
   </>}
  </div>
 </main>;
}
