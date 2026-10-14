import type {Metadata} from 'next';
import Link from 'next/link';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {createServerClient} from '@supabase/ssr';
import {FaArrowRight,FaBriefcase,FaCheck,FaClock,FaLock,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseConfig} from '@/lib/supabase-config';
import {RCL_STAFF_ROLES} from '@/lib/rcl-staff-roles';
import {ADMIN_STAFF_TOOLS,staffDeskHref} from '@/lib/rcl-staff-admin-tools';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'RCL Staff Role Workspaces | Administration',robots:{index:false,follow:false}};

export default async function AdminStaffWorkspacesPage(){
 const config=getSupabaseConfig();
 if(config.status!=='configured')return <main className="min-h-screen bg-[#071725] p-8 text-white">Administrator database temporarily unavailable.</main>;
 const cookieStore=await cookies();
 const db=createServerClient(config.url!,config.anonKey!,{cookies:{getAll(){return cookieStore.getAll()},setAll(){}}});
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect('/member-access?next='+encodeURIComponent('/admin/staff/workspaces'));
 const {data:profile}=await db.from('profiles').select('role,is_active').eq('id',user.id).maybeSingle();
 if(profile?.role!=='admin'||!profile.is_active)return <main className="min-h-screen bg-[#071725] p-8 text-white"><h1 className="text-2xl font-black">Administrator access required</h1><p className="mt-2 text-sm text-[#c3d8ea]">Only platform administrators can inspect every RCL department workspace.</p><Link href="/staff" className="mt-5 inline-block rounded-xl border border-[#7aaccd] px-4 py-3 text-white">Back to Staff HQ</Link></main>;
 const [grants,requests,teams]=await Promise.all([
  db.from('rcl_staff_assignments').select('role_code,team_id,active').eq('active',true).limit(500),
  db.from('rcl_staff_applications').select('role_code,status').eq('status','pending').limit(500),
  db.from('teams').select('id,name').eq('is_active',true).order('name').limit(250)
 ]);
 const anyError=[grants.error,requests.error,teams.error].find(Boolean);
 const live=grants.data??[];
 const pending=requests.data??[];
 return <main className="min-h-screen bg-[#071725] px-4 py-7 text-white sm:px-8">
  <div className="mx-auto max-w-6xl space-y-6">
   <div className="rounded-2xl border border-[#4a7a9e] bg-[linear-gradient(115deg,#133b5d,#0c263e)] p-6 sm:p-8">
    <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.17em] text-[#a3d9fd]"><FaShieldHalved/> RCL ADMINISTRATOR COMMAND</p>
    <h1 className="mt-3 text-3xl font-black sm:text-4xl">Every staff role. One admin account.</h1>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-[#cce1f0]">Enter any of the six RCL departments instantly, select a franchise or coaching team, and open the real operational tools already available to administrators. No applications, duplicate profiles, or fabricated owner assignments.</p>
    <div className="mt-5 flex flex-wrap gap-3"><Link href="/admin/staff" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#97c7e6] bg-[#235f8e] px-5 text-xs font-black text-white">Review staff applications <FaArrowRight/></Link>
     <Link href="/command" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#628da9] bg-[#102e4a] px-5 text-xs font-black text-white">Command Center <FaArrowRight/></Link></div>
   </div>
   {anyError&&<p role="alert" className="rounded-xl border border-[#a36e79] bg-[#342332] p-4 text-sm text-[#ffe0e5]">Could not load live staff counts: {anyError.message}. Role navigation is still available.</p>}
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {RCL_STAFF_ROLES.map(r=>{
     const approved=live.filter(x=>x.role_code===r.id).length;
     const waiting=pending.filter(x=>x.role_code===r.id).length;
     const href=staffDeskHref(r.id);
     return <section key={r.id} className="flex min-h-72 flex-col justify-between rounded-2xl border border-[#486f90] bg-[#0e2c45] p-5">
      <div>
       <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#a4d7f7]">{r.department}</p>
       <h2 className="mt-2 text-xl font-black">{r.title}</h2>
       <p className="mt-2 text-xs leading-5 text-[#c7dcea]">{r.description}</p>
       <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-lg border border-[#4a866f] bg-[#113b35] px-2.5 py-2 text-[11px] font-bold text-[#b7edd7]"><FaCheck/> {approved} approved</span>
        <span className="inline-flex items-center gap-2 rounded-lg border border-[#8e7849] bg-[#382d1d] px-2.5 py-2 text-[11px] font-bold text-[#f4d8a6]"><FaClock/> {waiting} pending</span>
        {r.teamRequired&&<span className="inline-flex items-center gap-2 rounded-lg border border-[#66829e] bg-[#122e47] px-2.5 py-2 text-[11px] font-bold text-[#c7e6fb]"><FaLock/> Team-scoped</span>}
       </div>
       <p className="mt-4 text-[11px] text-[#afc8db]">Connected tools: {ADMIN_STAFF_TOOLS[r.id].map(x=>x.title).join(' · ')}</p>
      </div>
      <Link href={href} className="mt-5 inline-flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[#8cc7ed] bg-[#256d9f] px-4 text-sm font-black text-white hover:bg-[#3581b4]">Open {r.id==='franchise_owner'?'Franchise':'Role'} Workspace <FaArrowRight/></Link>
     </section>;
    })}
   </div>
   <section className="rounded-2xl border border-[#436e8d] bg-[#0a273e] p-5">
    <h2 className="text-base font-black">Franchise inspection</h2>
    <p className="mt-2 text-xs leading-6 text-[#c6ddea]">Your administrator account can inspect any of the {teams.data?.length??0} active franchises, including unassigned teams. This is administrative access—not ownership; staff members still need individual approval.</p>
    <Link href="/staff/franchise" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#8cc8ef] bg-[#1c5c89] px-4 text-xs font-black text-white">Open franchise office <FaArrowRight/></Link>
   </section>
   <p className="text-xs leading-6 text-[#bed2e3]">Department entry never impersonates another account, changes assignment records, or weakens row-level security. Publishing, finances, payroll, scorekeeping, and other writes still use existing administrator authorization.</p>
  </div>
 </main>;
}
