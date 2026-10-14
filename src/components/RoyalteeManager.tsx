'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowLeft, FaArrowRight, FaCalendarDays, FaCircleCheck, FaShieldHalved } from 'react-icons/fa6';

type Program={
  slug:string;headline:string;about:string;registration_note:string;
  contact_email:string;contact_phone:string;registration_open:boolean
};
type Application={
  profile_id:string;headline:string;discipline:string;status:string;published:boolean;
  created_at:string;profile?:{display_name:string|null;username:string|null}|null
};
type RoyalteeEvent={id:string;title:string;description:string;event_type:string;starts_at:string;location:string;status:string};
const emptyProgram:Program={
  slug:'royaltee-steppas',headline:'',about:'',registration_note:'',
  contact_email:'royalteesteppas@gmail.com',contact_phone:'804-613-9199',registration_open:false
};
const emptyEvent={title:'',description:'',event_type:'performance',starts_at:'',location:'',status:'draft'};
const field='mt-2 min-h-11 w-full rounded-xl border border-[#36668e] bg-[#061a2d] px-3 py-2 text-sm text-white outline-none focus:border-[#fca46c]';
export function RoyalteeManager(){
  const {user,loading:authLoading}=useAuth();
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const [allowed,setAllowed]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [program,setProgram]=useState<Program>(emptyProgram);
  const [applications,setApplications]=useState<Application[]>([]);
  const [events,setEvents]=useState<RoyalteeEvent[]>([]);
  const [newEvent,setNewEvent]=useState(emptyEvent);
  const refresh=useCallback(async()=>{
    if(!db)return;
    const [programResult,applicationsResult,eventsResult]=await Promise.all([
      db.from('rcl_royaltee_program').select('*').eq('slug','royaltee-steppas').maybeSingle(),
      db.from('rcl_royaltee_cheer_profiles').select('profile_id,headline,discipline,status,published,created_at,profile:profiles!rcl_royaltee_cheer_profiles_profile_id_fkey!inner(display_name,username)').order('created_at',{ascending:false}).limit(100),
      db.from('rcl_royaltee_events').select('id,title,description,event_type,starts_at,location,status').order('starts_at',{ascending:false}).limit(100)
    ]);
    if(programResult.data)setProgram({...emptyProgram,...programResult.data});
    if(applicationsResult.data)setApplications((applicationsResult.data as any[]).map(a=>({...a,profile:Array.isArray(a.profile)?a.profile[0]:a.profile})));
    if(eventsResult.data)setEvents(eventsResult.data);
    if(programResult.error||applicationsResult.error||eventsResult.error)setError('Some Royaltee data could not be loaded. Check the database migration.');
  },[db]);
  useEffect(()=>{
    if(authLoading)return;
    if(!db||!user){setLoading(false);return;}
    let active=true;
    void db.rpc('can_manage_royaltee').then(async({data,error:accessError}:any)=>{
      if(!active)return;
      const hasAccess=!accessError&&data===true;
      setAllowed(hasAccess);
      if(hasAccess)await refresh();
      if(active)setLoading(false);
    }).catch(()=>{if(active){setLoading(false);setError('Could not verify Royaltee permissions.');}});
    return()=>{active=false;};
  },[authLoading,user,db,refresh]);
  async function act(run:()=>Promise<{error:any}>,success:string){
    if(busy)return;setBusy(true);setError('');setMessage('');
    try{const result=await run();if(result.error)setError(result.error.message||'Action failed.');else{setMessage(success);await refresh();}}
    catch{setError('Action failed. Please try again.');}
    setBusy(false);
  }
  const saveProgram=async(event:FormEvent)=>{event.preventDefault();await act(()=>db.from('rcl_royaltee_program').update({
    headline:program.headline,about:program.about,registration_note:program.registration_note,
    contact_email:program.contact_email,contact_phone:program.contact_phone,
    registration_open:program.registration_open,updated_at:new Date().toISOString()
  }).eq('slug','royaltee-steppas'),'Royaltee program details updated.');};
  const publishEvent=async(event:FormEvent)=>{
    event.preventDefault();
    if(!newEvent.starts_at){setError('Add an event date before saving.');return;}
    const starts=new Date(newEvent.starts_at);
    if(Number.isNaN(starts.getTime())){setError('Enter a valid event date.');return;}
    await act(()=>db.from('rcl_royaltee_events').insert({
      ...newEvent,starts_at:starts.toISOString(),min_age:18,created_by:user?.id
    }),'Adult-only event created.');
    setNewEvent(emptyEvent);
  };
  return <main className="min-h-screen bg-[#050c16] pb-24 text-white">
    <section className="border-b border-[#365f87] bg-[linear-gradient(135deg,#092744,#070d18)]"><Container maxWidth="xl" className="py-11"><Link href="/league/royaltee" className="inline-flex gap-2 text-xs font-black uppercase tracking-widest text-[#afdfff]"><FaArrowLeft/> Royaltee Home</Link><p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-[#ffa66d]">Rich City League · Partner Administration</p><h1 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Royaltee Organization HQ</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#bed7e9]">Independent partner control for adult cheer and step profiles, recruitment and performances. No access is granted to league-wide administration.</p></Container></section>
    <Container maxWidth="xl" className="py-9">
      {authLoading||loading?<p className="text-sm text-[#bdd7ea]">Verifying organization access…</p>:
      !user?<section className="rounded-2xl border border-[#315d85] bg-[#0c243a] p-7"><h2 className="text-2xl font-black">Sign in first.</h2><p className="mt-3 text-sm text-[#c2daea]">Royaltee HQ is restricted to approved organization owners and managers and RCH administrators.</p><Link href="/auth/sign-in?next=/league/royaltee/manage" className="mt-5 inline-flex rounded-xl bg-[#ff913f] px-5 py-3 text-sm font-black text-black">Sign in</Link></section>:
      !allowed?<section className="rounded-2xl border border-[#845a34] bg-[#291d14] p-7"><FaShieldHalved className="text-3xl text-[#ffc08f]"/><h2 className="mt-3 text-2xl font-black">Approval required.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[#f2cfb5]">Only verified Royaltee leadership can update this page. Request access through the organization claim process; an RCH administrator must approve your membership first.</p><Link href="/organizations/royaltee-steppas/claim" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#f1af80] px-5 text-sm font-black">Request organization access <FaArrowRight/></Link></section>
      :<div className="space-y-8">
        {error&&<p role="alert" className="rounded-xl border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-100">{error}</p>}
        {message&&<p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm text-emerald-100"><FaCircleCheck/>{message}</p>}
        <form onSubmit={saveProgram} className="rounded-2xl border border-[#31658e] bg-[#0a2137] p-6">
          <p className="text-xs font-black uppercase tracking-[.17em] text-[#ffac70]">01 / Partner website content</p><h2 className="mt-2 text-2xl font-black">Manage the public Royaltee section</h2><div className="mt-6 grid gap-5 lg:grid-cols-2">
            <label className="text-xs font-black uppercase tracking-wide text-[#b8d6ed]">Hero headline<input className={field} maxLength={160} value={program.headline} onChange={e=>setProgram({...program,headline:e.target.value})}/></label>
            <label className="text-xs font-black uppercase tracking-wide text-[#b8d6ed]">Contact email<input className={field} type="email" maxLength={320} value={program.contact_email} onChange={e=>setProgram({...program,contact_email:e.target.value})}/></label>
            <label className="text-xs font-black uppercase tracking-wide text-[#b8d6ed]">Contact phone<input className={field} maxLength={40} value={program.contact_phone} onChange={e=>setProgram({...program,contact_phone:e.target.value})}/></label>
            <label className="flex items-center gap-3 self-end rounded-xl border border-[#32678d] bg-[#071728] p-4 text-sm font-bold"><input type="checkbox" checked={program.registration_open} onChange={e=>setProgram({...program,registration_open:e.target.checked})} className="h-5 w-5 accent-[#ff9a58]"/>Adult recruitment inquiries are currently open</label>
          </div>
          <label className="mt-5 block text-xs font-black uppercase tracking-wide text-[#b8d6ed]">About Royaltee<textarea className={field+' min-h-32'} maxLength={2000} value={program.about} onChange={e=>setProgram({...program,about:e.target.value})}/></label>
          <label className="mt-5 block text-xs font-black uppercase tracking-wide text-[#b8d6ed]">Adult registration details<textarea className={field+' min-h-28'} maxLength={1500} value={program.registration_note} onChange={e=>setProgram({...program,registration_note:e.target.value})}/></label>
          <p className="mt-4 text-xs leading-6 text-[#c4d7e8]">Only describe adult (18+) opportunities. Youth registrations, photos, rosters, and events must stay outside Rich City Hoops.</p>
          <div className="mt-5 flex flex-wrap gap-3"><button disabled={busy} className="min-h-11 rounded-xl bg-[#ff934f] px-5 text-sm font-black text-black disabled:opacity-50">Save website content</button><Link href="/network/dashboard/profile" className="inline-flex min-h-11 items-center rounded-xl border border-[#80b8dd] px-5 text-sm font-bold">Organization logo &amp; social links</Link></div>
        </form>
        <section className="rounded-2xl border border-[#31658e] bg-[#0a2137] p-6"><p className="text-xs font-black uppercase tracking-[.17em] text-[#ffac70]">02 / Adult performer approval</p><h2 className="mt-2 text-2xl font-black">Membership requests</h2><p className="mt-3 text-sm text-[#b7d2e7]">Only adult age-eligible applicants appear here. Approval confirms a Royaltee affiliation, not a league administrative role.</p>
          <div className="mt-5 space-y-3">{applications.length?applications.map(application=><article key={application.profile_id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#346083] bg-[#061a2b] p-4"><div><h3 className="font-black">{application.profile?.display_name||application.profile?.username||application.headline||'Adult applicant'}</h3><p className="mt-1 text-xs text-[#b3d6e9]">{application.discipline} · {application.status} · {application.published?'Directory opted in':'Private listing'}</p><Link href={'/social/profile/'+application.profile_id} className="mt-2 inline-block text-xs font-bold text-[#92d5ff]">RCH profile →</Link></div><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>void act(()=>db.rpc('review_royaltee_cheer_profile',{p_profile_id:application.profile_id,p_status:'approved'}),'Performer affiliation approved.')} className="rounded-lg bg-[#2c8c82] px-3 py-2 text-xs font-black">Approve</button><button type="button" disabled={busy} onClick={()=>void act(()=>db.rpc('review_royaltee_cheer_profile',{p_profile_id:application.profile_id,p_status:'rejected'}),'Request rejected.')} className="rounded-lg border border-[#ac6659] px-3 py-2 text-xs font-black">Reject</button></div></article>):<p className="rounded-xl border border-dashed border-[#39678d] p-5 text-sm text-[#bfd4e5]">No applications are available yet.</p>}</div>
        </section>
        <section className="rounded-2xl border border-[#31658e] bg-[#0a2137] p-6"><p className="text-xs font-black uppercase tracking-[.17em] text-[#ffac70]">03 / Performance calendar</p><h2 className="mt-2 text-2xl font-black">Adult-only events</h2><p className="mt-3 text-sm text-[#b7d2e7]">Draft privately; publish only events with an adult-only audience and participants. This calendar does not import Royaltee youth programs.</p>
          <form onSubmit={publishEvent} className="mt-6 grid gap-4 rounded-xl border border-[#315c80] bg-[#061a2b] p-5 md:grid-cols-2">
            <label className="text-xs font-black uppercase text-[#b7d6e8]">Event title<input required minLength={3} maxLength={160} className={field} value={newEvent.title} onChange={e=>setNewEvent({...newEvent,title:e.target.value})}/></label>
            <label className="text-xs font-black uppercase text-[#b7d6e8]">Type<select className={field} value={newEvent.event_type} onChange={e=>setNewEvent({...newEvent,event_type:e.target.value})}><option value="tryout">Adult tryout</option><option value="rehearsal">Rehearsal</option><option value="game_day">RCL game day</option><option value="performance">Performance</option><option value="community">Community appearance</option></select></label>
            <label className="text-xs font-black uppercase text-[#b7d6e8]">Date and time<input required type="datetime-local" className={field} value={newEvent.starts_at} onChange={e=>setNewEvent({...newEvent,starts_at:e.target.value})}/></label>
            <label className="text-xs font-black uppercase text-[#b7d6e8]">Location<input maxLength={180} className={field} value={newEvent.location} onChange={e=>setNewEvent({...newEvent,location:e.target.value})}/></label>
            <label className="text-xs font-black uppercase text-[#b7d6e8] md:col-span-2">Details<textarea maxLength={1500} className={field+' min-h-28'} value={newEvent.description} onChange={e=>setNewEvent({...newEvent,description:e.target.value})}/></label>
            <label className="text-xs font-black uppercase text-[#b7d6e8]">Visibility<select className={field} value={newEvent.status} onChange={e=>setNewEvent({...newEvent,status:e.target.value})}><option value="draft">Draft</option><option value="published">Publish publicly (18+)</option></select></label>
            <div className="flex items-end"><button disabled={busy} className="min-h-11 w-full rounded-xl bg-[#ff934f] px-5 text-sm font-black text-black disabled:opacity-50">Add event <FaCalendarDays className="ml-2 inline"/></button></div>
          </form>
          <div className="mt-5 space-y-3">{events.map(event=><div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#315d82] p-4"><div><p className="text-sm font-black">{event.title}</p><p className="mt-1 text-xs text-[#b6d4e7]">{new Date(event.starts_at).toLocaleString()} · {event.status} · 18+</p></div><button type="button" disabled={busy} onClick={()=>void act(()=>db.from('rcl_royaltee_events').update({status:event.status==='published'?'draft':'published',updated_at:new Date().toISOString()}).eq('id',event.id),'Event status updated.')} className="rounded-lg border border-[#85bee5] px-3 py-2 text-xs font-black">{event.status==='published'?'Unpublish':'Publish'}</button></div>)}{!events.length&&<p className="text-sm text-[#bdd7e9]">No adult events have been entered.</p>}</div>
        </section>
      </div>}
    </Container>
  </main>;
}
