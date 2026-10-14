import Link from 'next/link';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {redirect} from 'next/navigation';
import {FaArrowRight,FaBasketball,FaBriefcase,FaCalendarDays,FaCircleCheck,FaLock,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseConfig} from '@/lib/supabase-config';
import {isRCLStaffRole,roleInfo,RCL_STAFF_ROLES,type RCLStaffRole} from '@/lib/rcl-staff-roles';
import {ADMIN_STAFF_TOOLS,staffDeskHref} from '@/lib/rcl-staff-admin-tools';
export const dynamic='force-dynamic';
type Props={params:Promise<{role:string}>;searchParams:Promise<{team?:string}>};
export default async function RCLRoleDeskPage({params,searchParams}:Props){
 const {role}=await params;
 if(!isRCLStaffRole(role))return <main className="min-h-screen bg-[#071725] p-8 text-white"><h1 className="text-2xl font-black">Unknown staff role</h1><Link href="/staff" className="mt-4 inline-block text-[#aad9ff] underline">Return to Staff HQ</Link></main>;
 const config=getSupabaseConfig();
 if(config.status!=='configured')return <main className="min-h-screen bg-[#071725] p-8 text-white">Staff access is temporarily unavailable.</main>;
 const cookieStore=await cookies();
 const db=createServerClient(config.url!,config.anonKey!,{cookies:{getAll(){return cookieStore.getAll()},setAll(){}}});
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect('/member-access?next='+encodeURIComponent(staffDeskHref(role)));
 const {data:profile,error:profileError}=await db.from('profiles').select('role,is_active').eq('id',user.id).maybeSingle();
 if(profileError||!profile||!profile.is_active)return <main className="min-h-screen bg-[#071725] p-8 text-white">Account is not authorized for staff access.</main>;
 const admin=profile.role==='admin';
 const {data:assignments,error:assignmentError}=await db.from('rcl_staff_assignments')
  .select('id,team_id,role_code,active').eq('profile_id',user.id).eq('role_code',role).eq('active',true);
 if(assignmentError)return <main className="min-h-screen bg-[#071725] p-8 text-white">Unable to verify staff assignments. Try again later.</main>;
 if(!admin&&!(assignments?.length))return <main className="min-h-screen bg-[#071725] p-8 text-white"><h1 className="text-2xl font-black">Role approval required</h1><p className="mt-3 max-w-lg text-sm text-[#d1e1ed]">This is an official RCL staff workspace. Apply for the role and wait for administrator approval before accessing it.</p><Link href="/staff" className="mt-5 inline-flex rounded-xl bg-[#256da5] px-5 py-3 text-sm font-bold text-white">Go to Staff HQ</Link></main>;
 const details=roleInfo(role)!;
 const {data:allTeams,error:teamsError}=await db.from('teams').select('id,name,city,slug,is_active').eq('is_active',true).order('name').limit(250);
 if(teamsError)return <main className="min-h-screen bg-[#071725] p-8 text-white">Team directory is temporarily unavailable.</main>;
 const availableTeams=admin?(allTeams??[]):(allTeams??[]).filter(t=>assignments?.some(a=>a.team_id===t.id));
 const search=await searchParams;
 const requested=typeof search.team==='string'?search.team:'';
 const team=availableTeams.find(t=>t.id===requested)??availableTeams[0]??null;
 if(!admin&&details.teamRequired&&!team)return <main className="min-h-screen bg-[#071725] p-8 text-white"><h1 className="text-2xl font-black">Team assignment required</h1><Link href="/staff" className="mt-4 inline-block text-[#aedaff]">Review my approvals</Link></main>;
 // Member access is granted only by an approved role assignment; never by URL parameters.
 const teamRequired=details.teamRequired;
 const shownTeams=teamRequired?availableTeams:admin?availableTeams:[];
 const {data:upcoming,error:gameError}=await db.from('games')
  .select('id,home_team_id,away_team_id,scheduled_at,status')
  .gte('scheduled_at',new Date().toISOString())
  .order('scheduled_at',{ascending:true}).limit(30);
 const nameMap=new Map((allTeams??[]).map(t=>[t.id,t.name]));
 const games=(upcoming??[]).filter(g=>!teamRequired||!team||g.home_team_id===team.id||g.away_team_id===team.id).slice(0,5);
 return <main className="min-h-screen bg-[#071725] pb-28 text-white">
  <div className="border-b border-[#37658a] bg-[radial-gradient(ellipse_at_85%_0%,#174876,transparent_57%),linear-gradient(140deg,#081b2d,#0d2b48)]">
   <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-11">
    <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.15em] text-[#a5d3f5]"><FaBriefcase/> RICH CITY LEAGUE · {details.department}</p>
    <h1 className="mt-3 text-3xl font-black sm:text-5xl">{details.title}</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d0e1ee]">{details.description}</p>
    <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#5883a5] bg-[#102d48] px-4 py-2.5 text-xs font-black text-[#cfe7fa]">{admin?<><FaShieldHalved/> Administrator access · no staff assignment created</>:<><FaCircleCheck/> Approved RCL role</>}</div>
    {admin&&<div className="mt-5 flex flex-wrap gap-2">
     <Link href="/admin/staff" className="rounded-lg border border-[#507c9c] bg-[#0b2b44] px-3 py-2.5 text-xs font-bold text-white">Staff approvals</Link>
     <Link href="/staff" className="rounded-lg border border-[#507c9c] bg-[#0b2b44] px-3 py-2.5 text-xs font-bold text-white">Staff HQ</Link>
    </div>}
   </div>
  </div>
  <div className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-8">
   {admin&&<section aria-label="Switch staff workspace" className="rounded-2xl border border-[#416f91] bg-[#0c2942] p-5">
    <h2 className="text-sm font-black uppercase tracking-wider text-[#c0e0f4]">Switch staff role</h2>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{RCL_STAFF_ROLES.map(item=><Link key={item.id} href={staffDeskHref(item.id)} aria-current={item.id===role?'page':undefined} className={'flex min-h-14 items-center justify-center rounded-xl border px-2 py-3 text-center text-xs font-black '+(item.id===role?'border-[#a8dcfd] bg-[#256da5] text-white':'border-[#426c8c] bg-[#10253b] text-[#c6e1f4] hover:border-[#9ac9e8]')}>{item.title}</Link>)}</div>
    <p className="mt-3 text-xs leading-5 text-[#b8d3e8]">Administrative inspection does not impersonate an employee, create a staff assignment, or count as franchise ownership.</p>
   </section>}
   {teamRequired&&<section className="rounded-2xl border border-[#436f90] bg-[#0c2942] p-5">
    <div className="flex items-start gap-3"><FaBasketball className="mt-1 text-[#a2cfee]"/><div><h2 className="text-lg font-black">Team context</h2><p className="mt-1 text-xs text-[#c7ddec]">{admin?'Select the RCL franchise/team to inspect.':'Your approved team assignments are shown here.'}</p></div></div>
    {shownTeams.length?<form action={staffDeskHref(role)} method="get" className="mt-4 flex flex-wrap items-end gap-2">
     <label className="min-w-[220px] flex-1 text-xs font-bold text-[#cce6f7]">RCL team
      <select name="team" defaultValue={team?.id??''} className="mt-2 min-h-12 w-full rounded-xl border border-[#6587a4] bg-[#081e31] px-4 text-sm text-white">{shownTeams.map(t=><option value={t.id} key={t.id}>{t.name}{t.city?' · '+t.city:''}</option>)}</select>
     </label><button type="submit" className="min-h-12 rounded-xl border border-[#9dcded] bg-[#276fa7] px-5 text-sm font-black text-white">Open team</button>
    </form>:<p className="mt-4 text-sm text-[#d1e3ef]">No eligible team is available yet.</p>}
    {team&&<p className="mt-3 text-sm font-bold text-white">Viewing: {team.name}{team.city?' · '+team.city:''}</p>}
   </section>}
   <section className="rounded-2xl border border-[#426d8e] bg-[#0b263e] p-5 sm:p-7">
    <h2 className="text-xl font-black">{admin?'Role operations':'My role resources'}</h2>
    <p className="mt-2 text-xs leading-5 text-[#c4d9ea]">{admin?'Open the existing department workspaces using your administrator permissions.':'These are the currently available team and league resources for this role. Protected departmental editing tools remain restricted until separately authorized.'}</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
     {(admin?ADMIN_STAFF_TOOLS[role]:details.actions).map(item=><Link href={item.href} key={item.href} className="group flex min-h-28 flex-col justify-between gap-3 rounded-xl border border-[#4a7899] bg-[#0f3553] p-4 text-white hover:border-[#a2d6f8] hover:bg-[#16466e]">
      <span><strong className="block text-sm font-black">{item.title}</strong><small className="mt-2 block text-xs leading-5 text-[#c5e0f1]">{'detail' in item?item.detail:item.note}</small></span>
      <FaArrowRight className="self-end text-[#a9d7f6] group-hover:translate-x-1"/>
     </Link>)}
    </div>
   </section>
   {role==='franchise_owner'&&admin&&<section className="rounded-2xl border border-[#466d8c] bg-[#0c2942] p-5">
    <p className="text-xs font-black uppercase tracking-wider text-[#a5d4f1]">Franchise owner experience</p>
    <p className="mt-2 text-sm text-[#c7ddea]">Open the actual franchise workspace as an administrator, without creating or approving an owner record.</p>
    {team&&<Link href={'/staff/franchise?team='+encodeURIComponent(team.id)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#aad7f5] bg-[#256a9f] px-4 text-sm font-black text-white">Inspect {team.name} <FaArrowRight/></Link>}
   </section>}
   {games.length>0&&<section className="rounded-2xl border border-[#3f6b8c] bg-[#0b253c] p-5 sm:p-7">
    <h2 className="flex items-center gap-2 text-lg font-black"><FaCalendarDays className="text-[#a6d5f5]"/> Upcoming games</h2>
    {gameError?<p className="mt-3 text-xs text-[#ffced4]">Unable to load upcoming games.</p>:<div className="mt-3 space-y-2">{games.map(g=><Link key={g.id} href={'/games/'+g.id} className="flex items-center justify-between gap-4 rounded-lg border border-[#3d6382] bg-[#081f34] p-3 text-sm text-white">
     <span><strong className="block">{nameMap.get(g.home_team_id)??'Home'} vs {nameMap.get(g.away_team_id)??'Away'}</strong><small className="mt-1 block text-[#c4d7e6]">{new Date(g.scheduled_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</small></span><FaArrowRight/></Link>)}</div>}
   </section>}
   <p className="flex items-start gap-2 text-xs leading-5 text-[#c1d5e5]"><FaLock className="mt-0.5 shrink-0"/> This workspace does not grant or modify franchise ownership, staff certification or underlying database permissions. All sensitive operations remain protected by their existing access rules.</p>
  </div>
 </main>;
}
