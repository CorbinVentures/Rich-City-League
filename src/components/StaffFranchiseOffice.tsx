'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {FaArrowRight,FaBasketball,FaBuilding,FaCalendarDays,FaLock} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';
import {CommandGrowthHQ} from '@/components/command/CommandGrowthHQ';
type Assignment={id:string;team_id:string|null;role_code:string;active:boolean};
type Team={id:string;name:string;city:string|null;slug:string|null;logo_url:string|null;description:string|null};
type Game={id:string;home_team_id:string;away_team_id:string;scheduled_at:string;status:string};

export function StaffFranchiseOffice({initialTeamId=''}:{initialTeamId?:string}){
 const {user,profile,loading:authLoading}=useAuth();
 const isAdmin=Boolean(user&&profile?.role==='admin');
 const db=useMemo(()=>getSupabaseClient() as unknown as SupabaseClient<any>|null,[]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [adminTeams,setAdminTeams]=useState<{id:string;name:string}[]>([]);
 const [selected,setSelected]=useState('');
 const [team,setTeam]=useState<Team|null>(null);
 const [games,setGames]=useState<Game[]>([]);
 const [names,setNames]=useState<Record<string,string>>({});
 const [verified,setVerified]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  if(!db||!user){setLoading(false);return;}
  setLoading(true);setError('');
  if(isAdmin){
   // Real server-side authorization; a client-side admin label never suffices.
   const {data:allowed,error:adminError}=await db.rpc('is_admin');
   if(adminError||allowed!==true){setError('Administrator access could not be verified.');setAdminTeams([]);setLoading(false);return;}
   const {data:clubs,error:clubsError}=await db.from('teams').select('id,name').eq('is_active',true).order('name').limit(250);
   if(clubsError){setError(clubsError.message);setLoading(false);return;}
   setAdminTeams(clubs??[]);
   setNames(Object.fromEntries((clubs??[]).map((t:{id:string;name:string})=>[t.id,t.name])));
   setSelected(previous=>(clubs??[]).some((t:{id:string})=>t.id===previous)?previous:((clubs??[]).find((t:{id:string})=>t.id===initialTeamId)?.id??clubs?.[0]?.id??''));
   setLoading(false);return;
  }
  const {data:roles,error:rolesError}=await db.from('rcl_staff_assignments')
   .select('id,team_id,role_code,active').eq('profile_id',user.id).eq('role_code','franchise_owner').eq('active',true);
  if(rolesError){setError(rolesError.message);setLoading(false);return;}
  const valid=(roles??[]).filter((r:Assignment)=>r.team_id);
  setAssignments(valid);
  setSelected(prev=>valid.some((a:Assignment)=>a.team_id===prev)?prev:(valid[0]?.team_id??''));
  setLoading(false);
 },[db,user,isAdmin,initialTeamId]);
 useEffect(()=>{void load()},[load]);
 const selectionOptions=isAdmin?adminTeams:assignments.filter(a=>a.team_id).map(a=>({id:a.team_id!,name:names[a.team_id!]||'Approved franchise'}));
 useEffect(()=>{
  if(!db||!user||!selected){setTeam(null);setGames([]);setVerified(false);return;}
  let active=true;setVerified(false);
  const run=async()=>{
   // Never infer rights from a URL or client-controlled team selection.
   const {data:access,error:permissionError}=isAdmin?await db.rpc('is_admin'):await db.rpc('rcl_has_staff_assignment',{p_role_code:'franchise_owner',p_team_id:selected});
   if(!active)return;
   if(permissionError||access!==true){setError(permissionError?.message||(isAdmin?'Administrator verification failed.':'Franchise approval is not active for this team.'));setTeam(null);setVerified(false);return;}
   const [teamResult,gamesResult,teamsResult]=await Promise.all([
    db.from('teams').select('id,name,city,slug,logo_url,description').eq('id',selected).eq('is_active',true).maybeSingle(),
    db.from('games').select('id,home_team_id,away_team_id,scheduled_at,status')
      .or('home_team_id.eq.'+selected+',away_team_id.eq.'+selected)
      .gte('scheduled_at',new Date().toISOString()).order('scheduled_at').limit(15),
    db.from('teams').select('id,name').eq('is_active',true).limit(250),
   ]);
   if(!active)return;
   const e=[teamResult.error,gamesResult.error,teamsResult.error].find(Boolean);
   if(e){setError(e.message);setVerified(false);return;}
   setTeam(teamResult.data??null);setGames(gamesResult.data??[]);
   setNames(Object.fromEntries((teamsResult.data??[]).map((r:{id:string;name:string})=>[r.id,r.name])));
   setVerified(Boolean(teamResult.data));setError('');
  };
  void run();
  return()=>{active=false};
 },[db,user,selected,isAdmin]);
 const gameName=(g:Game)=>[names[g.home_team_id]??'Home',names[g.away_team_id]??'Away'].join(' vs ');
 if(authLoading||loading)return <main className="min-h-screen bg-[#071c30] p-7 text-white">Checking franchise approval…</main>;
 return <main className="min-h-screen bg-[#071b2c] px-4 py-9 text-white sm:px-8">
  <div className="mx-auto max-w-5xl">
   <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#9ed0f7]"><FaBuilding/> RCL FRANCHISE OFFICE</p>
   <h1 className="mt-3 text-3xl font-black sm:text-4xl">My franchise</h1>
   <p className="mt-3 max-w-2xl text-sm leading-7 text-[#c5ddec]">{isAdmin?'Inspect any RCL franchise using your existing administrator access, without taking ownership.':'Your league-authorized franchise identity, team and upcoming games. Ownership permission is specific to the approved team.'}</p>
   {error&&<p role="alert" className="mt-5 rounded-xl border border-[#b96e7c] bg-[#402533] p-4 text-sm text-[#ffe0e6]">{error}</p>}
   {selectionOptions.length===0?<div className="mt-7 rounded-2xl border border-[#5b7290] bg-[#102a42] p-7">
    <FaLock className="text-3xl text-[#9ed3ff]"/><h2 className="mt-4 text-xl font-black">Franchise approval required</h2>
    <p className="mt-2 text-sm leading-6 text-[#c9dfef]">There is no active franchise-owner assignment on this account. Apply and wait for an administrator to approve your specific team before this workspace opens.</p>
    <Link href="/staff" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#236ca5] px-5 text-sm font-bold text-white">Go to RCL Staff HQ <FaArrowRight/></Link>
   </div>:<>
    {selectionOptions.length>1&&<label className="mt-6 block max-w-md text-xs font-black uppercase tracking-wider text-[#c8e5f8]">{isAdmin?'Inspect team':'Approved team'}
      <select value={selected} onChange={e=>setSelected(e.target.value)} className="mt-2 w-full min-h-12 rounded-xl border border-[#5982a4] bg-[#0d2942] px-4 text-white">
       {selectionOptions.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}
      </select>
     </label>}
    {verified&&team?<div className="mt-7 space-y-5">
     <section className="rounded-2xl border border-[#568c79] bg-[linear-gradient(135deg,#16443a,#0e2c3b)] p-6">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#a7f1d2]">{isAdmin?'ADMINISTRATOR INSPECTION':'✓ APPROVED FRANCHISE OWNER'} · {team.city||'Virginia'}</p>
      <h2 className="mt-2 text-3xl font-black">{team.name}</h2>
      {team.description&&<p className="mt-3 max-w-2xl text-sm leading-6 text-[#d4eadd]">{team.description}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
       <Link href={'/teams/'+(team.slug||team.id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#6aa698] bg-[#1c574b] px-4 text-sm font-bold text-white">View franchise profile <FaArrowRight/></Link>
       <Link href={isAdmin?'/admin/staff':'/staff'} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#6aa698] bg-[#163b3d] px-4 text-sm font-bold text-white">{isAdmin?'Staff approvals':'My staff roles'}</Link>
      </div>
     </section>
     <section className="rounded-2xl border border-[#446e8f] bg-[#0d2942] p-5 sm:p-7">
      <h2 className="flex items-center gap-2 text-lg font-black"><FaCalendarDays className="text-[#9ccef2]"/> Upcoming franchise games</h2>
      {games.length?<div className="mt-4 space-y-2">{games.map(g=><Link key={g.id} href={'/games/'+g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#456d8c] bg-[#0a2035] p-4 text-white">
       <span><strong className="block text-sm">{gameName(g)}</strong><small className="mt-1 block text-xs text-[#c0d7e9]">{new Date(g.scheduled_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</small></span><FaArrowRight className="text-[#a8d8fa]"/>
      </Link>)}</div>:<p className="mt-4 text-sm text-[#c0d3e5]">No scheduled upcoming games are published for this team yet.</p>}
     </section>
     <CommandGrowthHQ teamId={team.id} teamName={team.name} isAdmin={isAdmin}/>
     <section className="rounded-xl border border-[#456785] bg-[#0b253b] p-5">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#a1d5ff]"><FaLock/> Financial controls</p>
      <p className="mt-2 text-sm leading-6 text-[#caddeb]">{isAdmin?'Your administrator account can access verified franchise financial information in the Command Center. This inspection does not create an owner assignment.':'Financial statements, valuation assumptions and sensitive operations remain in the administrator-controlled Command Center until separate team-scoped permissions are implemented. Approval does not grant global accounting or admin access.'}</p>
      {isAdmin&&<Link href="/command#franchises" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#678fac] bg-[#1d4d72] px-4 text-xs font-black text-white">Open Franchise HQ <FaArrowRight/></Link>}
     </section>
    </div>:<p className="mt-6 rounded-xl border border-[#456f90] p-5 text-sm text-[#c1d8ea]">Checking your team-specific approval and franchise information…</p>}
   </>}
  </div>
 </main>;
}
