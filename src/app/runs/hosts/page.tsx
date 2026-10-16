'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaBasketball,FaClipboardCheck,FaLocationDot,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type Application={id:string;applicant_id:string;organization_name:string;locality:string;organizer_experience:string;public_website:string|null;status:string;review_note:string|null;created_at:string};
type Credential={profile_id:string;verification_status:string;expires_at:string};
type Run={id:string;title:string;run_type:string;starts_at:string;location:string};

export default function RunsHostNetworkPage(){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [staff,setStaff]=useState(false);
 const [applications,setApplications]=useState<Application[]>([]);
 const [credential,setCredential]=useState<Credential|null>(null);
 const [runs,setRuns]=useState<Run[]>([]);
 const [org,setOrg]=useState('');
 const [locality,setLocality]=useState('');
 const [experience,setExperience]=useState('');
 const [website,setWebsite]=useState('');
 const [selectedApp,setSelectedApp]=useState('');
 const [decision,setDecision]=useState<'approved'|'declined'|'needs_info'>('approved');
 const [reviewNote,setReviewNote]=useState('');
 const [selectedRun,setSelectedRun]=useState('');
 const [certifyNote,setCertifyNote]=useState('');
 const [court,setCourt]=useState('');
 const [courtNote,setCourtNote]=useState('');
 const [suspendHost,setSuspendHost]=useState('');
 const [suspendReason,setSuspendReason]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 const [revision,setRevision]=useState(0);

 const load=useCallback(async()=>{
  if(!db||!user?.id)return;
  const [admin,me]=await Promise.all([
   db.rpc('is_staff_or_admin'),
   db.from('rch_verified_run_hosts').select('profile_id,verification_status,expires_at')
     .eq('profile_id',user.id).maybeSingle()
  ]);
  const canReview=Boolean(admin.data);
  setStaff(canReview);
  setCredential((me.data??null) as Credential|null);
  const [pending,scheduled]=await Promise.all([
   db.from('rch_run_host_applications')
     .select('id,applicant_id,organization_name,locality,organizer_experience,public_website,status,review_note,created_at')
     .in('status',canReview?['pending','approved','declined','needs_info']:['pending','approved','declined','needs_info'])
     .eq(!canReview?'applicant_id':'status',!canReview?user.id:'pending')
     .order('created_at',{ascending:false}).limit(50),
   canReview?db.from('runs').select('id,title,run_type,starts_at,location')
     .in('status',['open','full']).gte('starts_at',new Date(Date.now()-7200000).toISOString())
     .lte('starts_at',new Date(Date.now()+30*86400000).toISOString()).order('starts_at').limit(80):
     Promise.resolve({data:[]})
  ]);
  setApplications((pending.data??[]) as Application[]);
  setRuns((scheduled.data??[]) as Run[]);
 },[db,user?.id]);

 useEffect(()=>{void load();},[load,revision]);
 const action=async(fn:string,args:Record<string,unknown>,success:string)=>{
  if(!db||busy)return;
  setBusy(true);setError('');setNotice('');
  const {error:failure}=await db.rpc(fn,args);
  if(failure)setError(failure.message);
  else{setNotice(success);setRevision(v=>v+1);}
  setBusy(false);
 };

 const apply=async()=>{
  await action('rch_apply_verified_run_host',{p_organization:org.trim(),p_locality:locality.trim(),
   p_experience:experience.trim(),p_website:website.trim()||null},'Application submitted for independent RCH operations review.');
  setOrg('');setLocality('');setExperience('');setWebsite('');
 };

 return <main className="min-h-screen bg-[#061625] px-4 pb-28 pt-12 text-white sm:px-8">
   <div className="mx-auto max-w-5xl">
    <Link href="/runs" className="text-xs font-bold text-[#95d3ff]">← RCH Runs</Link>
    <header className="mt-6 rounded-3xl border border-[#3c7294] bg-[linear-gradient(135deg,#123e5d,#092137)] p-6 sm:p-9">
     <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-[#b8e0ff]"><FaShieldHalved/> RCH · Network Standards</p>
     <h1 className="mt-3 font-display text-3xl font-black uppercase sm:text-5xl">Verified Runs Network</h1>
     <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c4dced]">Any basketball organizer can host a Run. Verified Hosts earn a separate RCH operations credential after human review; verified events must meet independent venue, preparation and official requirements.</p>
     <p className="mt-3 text-xs text-[#b1c6d8]">RCH verification means documented organizer and event checks. It does not guarantee personal safety, facility availability, participant conduct, or the accuracy of an unverified game score.</p>
    </header>
    {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-500/40 bg-[#3b1d29] p-4 text-sm text-[#ffc6d4]">{error}</p>}
    {notice&&<p role="status" className="mt-5 rounded-xl border border-[#5485a2] p-4 text-sm text-[#bce4fa]">{notice}</p>}
    {!user?<p className="mt-6 rounded-xl border border-[#416c8d] p-5 text-sm">Sign in to apply for organizer verification. <Link href="/auth/sign-in?next=%2Fruns%2Fhosts" className="font-bold text-[#7ac6ff] underline">Sign in</Link></p>:
    <section className="mt-7 grid gap-5 lg:grid-cols-2">
     <div className="rounded-2xl border border-[#416c8d] bg-[#0e2b43] p-5">
      <h2 className="flex items-center gap-2 text-xl font-black uppercase"><FaClipboardCheck/> Host Credential</h2>
      <p className="mt-2 text-xs text-[#b1cce1]">Approval is reviewed by RCH staff. Hosts must still meet event-by-event requirements for a Verified Run.</p>
      {credential&&<p className="mt-3 rounded-xl border border-[#5a956b] p-3 text-sm text-emerald-200">{credential.verification_status==='approved'?'Credential approved':'Credential suspended'} · {credential.verification_status==='approved'?'Renews by ':'Expired / review date '}{new Date(credential.expires_at).toLocaleDateString()}</p>}
      <h3 className="mt-5 text-xs font-black uppercase text-[#9cd6ff]">Apply as an organizer</h3>
      <div className="mt-3 space-y-3">
       <label className="block text-xs font-bold">Organization or host name
        <input maxLength={120} value={org} onChange={e=>setOrg(e.target.value)} placeholder="Your Run organization" className="mt-2 min-h-11 w-full rounded-xl border border-[#567b99] bg-[#071a2c] px-3 text-white"/></label>
       <label className="block text-xs font-bold">Virginia locality
        <input maxLength={120} value={locality} onChange={e=>setLocality(e.target.value)} placeholder="Richmond, VA" className="mt-2 min-h-11 w-full rounded-xl border border-[#567b99] bg-[#071a2c] px-3 text-white"/></label>
       <label className="block text-xs font-bold">Experience operating real basketball Runs
        <textarea maxLength={1600} rows={4} value={experience} onChange={e=>setExperience(e.target.value)} placeholder="Tell us how long you've hosted, where and how you handle safety, scheduling and conflicts." className="mt-2 w-full rounded-xl border border-[#567b99] bg-[#071a2c] p-3 text-sm"/></label>
       <label className="block text-xs font-bold">Public website (optional)
        <input maxLength={350} value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://" className="mt-2 min-h-11 w-full rounded-xl border border-[#567b99] bg-[#071a2c] px-3 text-white"/></label>
       <button type="button" disabled={busy||org.trim().length<2||locality.trim().length<2||experience.trim().length<40} onClick={()=>void apply()} className="min-h-11 rounded-xl bg-[#70c1ef] px-5 text-xs font-black text-[#092438] disabled:opacity-40">Submit for RCH Review</button>
      </div>
     </div>
     <div className="rounded-2xl border border-[#416c8d] bg-[#0e2b43] p-5">
      <h2 className="text-xl font-black uppercase">Your Applications</h2>
      <p className="mt-2 text-xs text-[#b1cce1]">Previous decisions and review notes remain visible to you.</p>
      <div className="mt-4 space-y-2">
       {applications.map(a=><div key={a.id} className="rounded-xl border border-[#3c6687] bg-[#0c2236] p-3 text-xs">
        <div className="flex flex-wrap justify-between gap-2"><strong>{a.organization_name}</strong><span className="font-black uppercase text-[#8bd3ff]">{a.status.replaceAll('_',' ')}</span></div>
        <p className="mt-1 text-[#9ebdd4]">{a.locality} · {new Date(a.created_at).toLocaleDateString()}</p>
        {a.review_note&&<p className="mt-2 text-[#c9deeb]">{a.review_note}</p>}
       </div>)}
       {!applications.length&&<p className="rounded-xl border border-dashed border-[#497392] p-4 text-xs text-[#b4cede]">No applications filed yet.</p>}
      </div>
     </div>
    </section>}

    {staff&&<section className="mt-8 rounded-3xl border border-[#9c7948] bg-[#242936] p-5 sm:p-7">
      <h2 className="text-xl font-black uppercase text-[#f1d5a2]">RCH Staff · Verification Desk</h2>
      <p className="mt-2 text-xs leading-5 text-[#cecccd]">No automatic approvals. Another staff member must review an organizer and their Run. Verify the venue and readiness checklist before issuing any public badge.</p>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
       <article className="rounded-xl border border-[#705f55] p-4">
        <h3 className="flex items-center gap-2 text-sm font-black"><FaClipboardCheck/> Pending Host Applications</h3>
        <div className="mt-3 space-y-2">{applications.filter(a=>a.status==='pending').map(a=><button type="button" key={a.id} onClick={()=>setSelectedApp(a.id)}
         className={'w-full rounded-lg border p-3 text-left text-xs '+(selectedApp===a.id?'border-[#f3d69a] bg-[#473a32]':'border-[#705f55]')}>
         <strong>{a.organization_name}</strong><span className="ml-2 text-[#b0d3ef]">{a.locality}</span>
         <p className="mt-2 text-[#d7cbd0]">{a.organizer_experience}</p>
         {a.public_website&&<span className="mt-1 block break-all text-[#abddff]">{a.public_website}</span>}
        </button>)}
        {!applications.some(a=>a.status==='pending')&&<p className="text-xs text-[#d7cbcb]">No pending applications.</p>}
        </div>
        {selectedApp&&<div className="mt-4 space-y-2">
         <select value={decision} onChange={e=>setDecision(e.target.value as typeof decision)} className="min-h-11 w-full rounded-lg border border-[#846b60] bg-[#10253a] px-3 text-sm">
          <option value="approved">Approve</option><option value="needs_info">Request more information</option><option value="declined">Decline</option>
         </select>
         <textarea value={reviewNote} onChange={e=>setReviewNote(e.target.value.slice(0,500))} rows={3} placeholder="Document evidence and reason (8+ characters)" className="w-full rounded-lg border border-[#846b60] bg-[#10253a] p-3 text-sm"/>
         <button disabled={busy||reviewNote.trim().length<8} onClick={()=>void action('rch_review_verified_run_host',{p_application:selectedApp,p_decision:decision,p_note:reviewNote.trim()},'Host application adjudicated.')} className="min-h-10 rounded-lg bg-[#eac98e] px-4 text-xs font-black text-[#291b12] disabled:opacity-40">Record Host Decision</button>
        </div>}
       </article>
       <article className="rounded-xl border border-[#705f55] p-4">
        <h3 className="flex items-center gap-2 text-sm font-black"><FaBasketball/> Certify a Scheduled Run</h3>
        <label className="mt-3 block text-xs font-bold">Run to review
         <select value={selectedRun} onChange={e=>setSelectedRun(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-[#846b60] bg-[#10253a] px-3 text-sm">
          <option value="">Choose a Run</option>{runs.map(r=><option key={r.id} value={r.id}>{r.title} · {r.location} · {new Date(r.starts_at).toLocaleDateString()}</option>)}
         </select></label>
        {selectedRun&&<Link href={'/runs/'+selectedRun} className="mt-2 inline-block text-xs text-[#9fdcff] underline">Open Run Operations HQ</Link>}
        <textarea rows={3} value={certifyNote} onChange={e=>setCertifyNote(e.target.value.slice(0,500))} placeholder="Venue, independent official and checklist evidence (8+ characters)" className="mt-3 w-full rounded-lg border border-[#846b60] bg-[#10253a] p-3 text-sm"/>
        <div className="mt-2 flex flex-wrap gap-2">
         <button disabled={busy||!selectedRun||certifyNote.trim().length<8} onClick={()=>void action('rch_certify_verified_run',{p_run:selectedRun,p_approve:true,p_note:certifyNote.trim()},'RCH Verified Run badge issued.')} className="min-h-10 rounded-lg bg-[#eac98e] px-4 text-xs font-black text-[#291b12] disabled:opacity-40">Verify Run</button>
         <button disabled={busy||!selectedRun||certifyNote.trim().length<8} onClick={()=>void action('rch_certify_verified_run',{p_run:selectedRun,p_approve:false,p_note:certifyNote.trim()},'Run verification revoked.')} className="min-h-10 rounded-lg border border-[#987965] px-4 text-xs font-bold disabled:opacity-40">Revoke</button>
        </div>
       </article>
       <article className="rounded-xl border border-[#705f55] p-4">
        <h3 className="flex items-center gap-2 text-sm font-black"><FaLocationDot/> Physical Court Review</h3>
        <input value={court} onChange={e=>setCourt(e.target.value)} placeholder="Exact court slug" className="mt-3 min-h-11 w-full rounded-lg border border-[#846b60] bg-[#10253a] px-3 text-sm"/>
        <textarea rows={2} value={courtNote} onChange={e=>setCourtNote(e.target.value.slice(0,600))} placeholder="Document a reviewed venue, access, lighting and conditions (12+ characters)" className="mt-3 w-full rounded-lg border border-[#846b60] bg-[#10253a] p-3 text-sm"/>
        <button disabled={busy||!court.trim()||courtNote.trim().length<12} onClick={()=>void action('rch_review_court_for_runs',{p_court:court.trim(),p_approved:true,p_note:courtNote.trim()},'Court review saved for 180 days.')} className="mt-3 min-h-10 rounded-lg bg-[#eac98e] px-4 text-xs font-black text-[#291b12] disabled:opacity-40">Approve Reviewed Court</button>
       </article>
       <article className="rounded-xl border border-[#705f55] p-4">
        <h3 className="flex items-center gap-2 text-sm font-black"><FaShieldHalved/> Credential Suspension</h3>
        <input value={suspendHost} onChange={e=>setSuspendHost(e.target.value)} placeholder="Member UUID" className="mt-3 min-h-11 w-full rounded-lg border border-[#846b60] bg-[#10253a] px-3 text-sm"/>
        <textarea value={suspendReason} onChange={e=>setSuspendReason(e.target.value.slice(0,500))} rows={2} placeholder="Document suspension reasons (12+ characters)" className="mt-3 w-full rounded-lg border border-[#846b60] bg-[#10253a] p-3 text-sm"/>
        <button disabled={busy||!suspendHost.trim()||suspendReason.trim().length<12} onClick={()=>void action('rch_suspend_verified_run_host',{p_host:suspendHost.trim(),p_reason:suspendReason.trim()},'Host credential suspended and associated Run badges revoked.')} className="mt-3 min-h-10 rounded-lg border border-rose-400/50 bg-[#743b3b] px-4 text-xs font-bold text-white disabled:opacity-40">Suspend Host</button>
       </article>
      </div>
     </section>}
   </div>
 </main>;
}
