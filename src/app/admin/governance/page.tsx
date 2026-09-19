'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminWorkspace } from '@/components/AdminWorkspace';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { FaShieldHalved, FaUsersGear, FaClipboardList } from 'react-icons/fa6';

const roles = ['fan','player','coach','staff','admin'] as const;

type Profile = { id:string; display_name:string|null; first_name:string|null; last_name:string|null; role:string; is_active:boolean };
type Staff = { id:string; profile_id:string; title:string; permissions:Record<string,boolean> };
type League = { id:string; name:string };
type Team = { id:string; name:string };
type Commissioner = { id:string; league_id:string; profile_id:string; title:string; permissions:Record<string,unknown> };
type Coach = { id:string; team_id:string; profile_id:string; title:string };

export default function AdminGovernancePage() {
  const { profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const isAdmin = profile?.role === 'admin';
  const [profiles,setProfiles]=useState<Profile[]>([]);
  const [staff,setStaff]=useState<Staff[]>([]);
  const [leagues,setLeagues]=useState<League[]>([]);
  const [teams,setTeams]=useState<Team[]>([]);
  const [commissioners,setCommissioners]=useState<Commissioner[]>([]);
  const [coaches,setCoaches]=useState<Coach[]>([]);
  const [logs,setLogs]=useState<any[]>([]);
  const [staffProfile,setStaffProfile]=useState('');
  const [staffTitle,setStaffTitle]=useState('League Staff');
  const [teamId,setTeamId]=useState('');
  const [coachProfile,setCoachProfile]=useState('');
  const [coachTitle,setCoachTitle]=useState('Coach');
  const [leagueId,setLeagueId]=useState('');
  const [commissionerProfile,setCommissionerProfile]=useState('');
  const [commissionerTitle,setCommissionerTitle]=useState('Commissioner');
  const [message,setMessage]=useState('');

  async function load(){
    if(!supabase || !isAdmin) return;
    const [p,s,l,t,c,tc,a]=await Promise.all([
      supabase.from('profiles').select('id,display_name,first_name,last_name,role,is_active').order('created_at',{ascending:false}),
      supabase.from('staff').select('*').order('created_at',{ascending:false}),
      supabase.from('leagues').select('id,name').order('name'),
      supabase.from('teams').select('id,name').order('name'),
      supabase.from('commissioners').select('*').order('created_at',{ascending:false}),
      supabase.from('team_coaches').select('*').order('created_at',{ascending:false}),
      supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(50),
    ]);
    if(p.data) setProfiles(p.data as Profile[]);
    if(s.data) setStaff(s.data as Staff[]);
    if(l.data) setLeagues(l.data as League[]);
    if(t.data) setTeams(t.data as Team[]);
    if(c.data) setCommissioners(c.data as Commissioner[]);
    if(tc.data) setCoaches(tc.data as Coach[]);
    if(a.data) setLogs(a.data);
  }

  useEffect(()=>{void load()},[supabase,isAdmin]);

  async function audit(action:string,details:string){
    if(!supabase || !profile) return;
    await supabase.from('audit_logs').insert({user_id:profile.id,action,details} as never);
  }

  async function updateProfile(id:string,patch:Partial<Profile>){
    if(!supabase || id===profile?.id && patch.role) return;
    const {error}=await supabase.from('profiles').update(patch as never).eq('id',id);
    setMessage(error?.message || 'Account updated.');
    if(!error){await audit('ADMIN_UPDATE_PROFILE',`Updated profile ${id}`);await load();}
  }

  async function addStaff(e:React.FormEvent){
    e.preventDefault();
    if(!supabase||!staffProfile) return;
    const {error}=await supabase.from('staff').insert({profile_id:staffProfile,title:staffTitle,permissions:{league:true,content:true,moderation:true,analytics:true,commerce:true}} as never);
    setMessage(error?.message||'Staff access granted.');
    if(!error){await audit('ADMIN_GRANT_STAFF_ACCESS',`Granted staff access to ${staffProfile}`);setStaffProfile('');await load();}
  }

  async function removeStaff(id:string){
    if(!supabase) return;
    const {error}=await supabase.from('staff').delete().eq('id',id);
    setMessage(error?.message||'Staff assignment removed.');
    if(!error){await audit('ADMIN_REMOVE_STAFF_ACCESS',`Removed staff assignment ${id}`);await load();}
  }

  async function addCoach(e:React.FormEvent){
    e.preventDefault();
    if(!supabase||!teamId||!coachProfile) return;
    const {error}=await supabase.from('team_coaches').insert({team_id:teamId,profile_id:coachProfile,title:coachTitle} as never);
    setMessage(error?.message||'Coach assigned.');
    if(!error){await audit('ADMIN_ASSIGN_COACH',`Assigned ${coachProfile} to team ${teamId}`);await load();}
  }

  async function removeCoach(id:string){
    if(!supabase) return;
    const {error}=await supabase.from('team_coaches').delete().eq('id',id);
    setMessage(error?.message||'Coach assignment removed.');
    if(!error){await audit('ADMIN_REMOVE_COACH',`Removed coach assignment ${id}`);await load();}
  }

  async function addCommissioner(e:React.FormEvent){
    e.preventDefault();
    if(!supabase||!leagueId||!commissionerProfile) return;
    const {error}=await supabase.from('commissioners').insert({league_id:leagueId,profile_id:commissionerProfile,title:commissionerTitle,permissions:{league:true,operations:true,discipline:true}} as never);
    setMessage(error?.message||'Commissioner assigned.');
    if(!error){await audit('ADMIN_ASSIGN_COMMISSIONER',`Assigned ${commissionerProfile} to league ${leagueId}`);await load();}
  }

  async function removeCommissioner(id:string){
    if(!supabase) return;
    const {error}=await supabase.from('commissioners').delete().eq('id',id);
    setMessage(error?.message||'Commissioner assignment removed.');
    if(!error){await audit('ADMIN_REMOVE_COMMISSIONER',`Removed commissioner assignment ${id}`);await load();}
  }

  const label=(p?:Profile)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'RCL User';
  const staffProfiles=profiles.filter(p=>['staff','admin'].includes(p.role));
  const coachProfiles=profiles.filter(p=>['coach','staff','admin'].includes(p.role));

  if(authLoading) return <main><AdminWorkspace/><Container maxWidth="xl" className="py-16">Checking administrator access…</Container></main>;
  if(!isAdmin) return <main><AdminWorkspace/><Container maxWidth="lg" className="py-16"><h1 className="rcl-display text-4xl uppercase">Admin access required</h1><Link href="/admin" className="rcl-link mt-5">Return to command center</Link></Container></main>;

  return <main className="min-h-screen pb-24 text-white">
    <AdminWorkspace/>
    <Container maxWidth="xl" className="py-10">
      <Link href="/admin" className="rcl-link">← Command center</Link>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
        <div><p className="rcl-kicker">RCL SECURITY · GOVERNANCE</p><h1 className="rcl-display mt-2 text-5xl uppercase">Admin governance.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Manage platform roles, staff assignments, commissioners, team coaches and the administrative audit trail. Database RLS remains the final authority.</p></div>
        <FaShieldHalved className="text-5xl text-rcl-orange"/>
      </div>
      {message&&<p className="mt-6 rounded-xl border border-rcl-orange/20 bg-rcl-orange/5 p-3 text-xs text-rcl-orange">{message}</p>}

      <section className="mt-8 rcl-platform-panel">
        <div className="rcl-panel-heading"><span><FaUsersGear className="mr-2 inline"/> Account & role control</span><b>{profiles.length} USERS</b></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead><tr><th className="p-4">User</th><th>Role</th><th>Status</th><th className="text-right pr-4">Controls</th></tr></thead><tbody>
          {profiles.map(p=><tr key={p.id} className="border-t border-white/5"><td className="p-4 font-bold">{label(p)}</td><td><select value={p.role} disabled={p.id===profile?.id} onChange={e=>void updateProfile(p.id,{role:e.target.value})} className="rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white">{roles.map(r=><option key={r}>{r}</option>)}</select></td><td><button disabled={p.id===profile?.id} onClick={()=>void updateProfile(p.id,{is_active:!p.is_active})} className={`rounded-lg px-3 py-2 text-[9px] font-black uppercase ${p.is_active?'bg-emerald-400/10 text-emerald-300':'bg-red-400/10 text-red-300'}`}>{p.is_active?'ACTIVE · DISABLE':'DISABLED · ACTIVATE'}</button></td><td className="pr-4 text-right text-[9px] text-white/30">{p.id===profile?.id?'CURRENT ADMIN':''}</td></tr>)}
        </tbody></table></div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="rcl-platform-panel p-6">
          <p className="rcl-kicker">STAFF ACCESS</p><h2 className="rcl-display mt-2 text-2xl uppercase">Staff assignments</h2>
          <form onSubmit={addStaff} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><select required value={staffProfile} onChange={e=>setStaffProfile(e.target.value)} className="rcl-admin-field"><option value="">Staff/admin profile</option>{staffProfiles.map(p=><option key={p.id} value={p.id}>{label(p)}</option>)}</select><input value={staffTitle} onChange={e=>setStaffTitle(e.target.value)} className="rcl-admin-field" placeholder="Title"/><button className="rcl-button">Grant</button></form>
          <div className="mt-5 space-y-2">{staff.map(s=><div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 p-3 text-xs"><span>{label(profiles.find(p=>p.id===s.profile_id))} · {s.title}</span><button onClick={()=>void removeStaff(s.id)} className="text-red-300">REMOVE</button></div>)}</div>
        </section>

        <section className="rcl-platform-panel p-6">
          <p className="rcl-kicker">TEAM AUTHORITY</p><h2 className="rcl-display mt-2 text-2xl uppercase">Coach assignments</h2>
          <form onSubmit={addCoach} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><select required value={teamId} onChange={e=>setTeamId(e.target.value)} className="rcl-admin-field"><option value="">Team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select required value={coachProfile} onChange={e=>setCoachProfile(e.target.value)} className="rcl-admin-field"><option value="">Coach profile</option>{coachProfiles.map(p=><option key={p.id} value={p.id}>{label(p)}</option>)}</select><input value={coachTitle} onChange={e=>setCoachTitle(e.target.value)} className="rcl-admin-field" placeholder="Title"/><button className="rcl-button">Assign</button></form>
          <div className="mt-5 space-y-2">{coaches.map(c=><div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 p-3 text-xs"><span>{teams.find(t=>t.id===c.team_id)?.name||'Team'} · {label(profiles.find(p=>p.id===c.profile_id))} · {c.title}</span><button onClick={()=>void removeCoach(c.id)} className="text-red-300">REMOVE</button></div>)}</div>
        </section>

        <section className="rcl-platform-panel p-6">
          <p className="rcl-kicker">LEAGUE AUTHORITY</p><h2 className="rcl-display mt-2 text-2xl uppercase">Commissioners</h2>
          <form onSubmit={addCommissioner} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><select required value={leagueId} onChange={e=>setLeagueId(e.target.value)} className="rcl-admin-field"><option value="">League</option>{leagues.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select><select required value={commissionerProfile} onChange={e=>setCommissionerProfile(e.target.value)} className="rcl-admin-field"><option value="">Profile</option>{staffProfiles.map(p=><option key={p.id} value={p.id}>{label(p)}</option>)}</select><input value={commissionerTitle} onChange={e=>setCommissionerTitle(e.target.value)} className="rcl-admin-field" placeholder="Title"/><button className="rcl-button">Assign</button></form>
          <div className="mt-5 space-y-2">{commissioners.map(c=><div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 p-3 text-xs"><span>{leagues.find(l=>l.id===c.league_id)?.name||'League'} · {label(profiles.find(p=>p.id===c.profile_id) as Profile)} · {c.title}</span><button onClick={()=>void removeCommissioner(c.id)} className="text-red-300">REMOVE</button></div>)}</div>
        </section>

        <section className="rcl-platform-panel p-6">
          <div className="flex items-center justify-between"><div><p className="rcl-kicker">AUDIT TRAIL</p><h2 className="rcl-display mt-2 text-2xl uppercase">Administrative activity</h2></div><FaClipboardList className="text-2xl text-rcl-blue"/></div>
          <div className="mt-5 max-h-80 space-y-2 overflow-auto">{logs.map(log=><div key={log.id} className="rounded-xl border border-white/5 p-3 text-xs"><b>{log.action}</b><p className="mt-1 text-white/40">{log.details||'No details'} · {new Date(log.created_at).toLocaleString()}</p></div>)}</div>
        </section>
      </div>
    </Container>
  </main>;
}
