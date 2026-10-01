'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowRight, FaCircleCheck, FaNewspaper, FaPhotoFilm } from 'react-icons/fa6';

type Membership={organization_id:string;organization:{id:string;name:string}|null};
type Submission={id:string;organization_id:string;submission_type:string;title:string;summary:string;source_url:string|null;media_url:string|null;status:string;review_notes:string|null;created_at:string};
const types=[['announcement','Announcement'],['tryout','Tryout'],['tournament','Tournament'],['championship','Championship / result'],['player-spotlight','Player spotlight'],['highlight','Highlight / video'],['news-tip','News tip'],['community','Community story']] as const;
const input='min-h-11 w-full rounded-xl border border-white/10 bg-[#050b12] px-3 text-sm text-white outline-none focus:border-rcl-blue/55';

export default function NetworkEditorialDeskPage(){
  const {user,loading:authLoading}=useAuth(); const supabase=useMemo(()=>getSupabaseClient(),[]); const db=supabase as any;
  const [memberships,setMemberships]=useState<Membership[]>([]); const [organizationId,setOrganizationId]=useState(''); const [submissions,setSubmissions]=useState<Submission[]>([]);
  const [form,setForm]=useState({type:'announcement',title:'',summary:'',sourceUrl:'',mediaUrl:''}); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  useEffect(()=>{if(!authLoading&&user)void loadOrganizations();},[authLoading,user]);
  useEffect(()=>{if(organizationId)void loadSubmissions(organizationId);},[organizationId]);

  async function loadOrganizations(){
    const {data}=await db.from('network_organization_members').select('organization_id,organization:network_organizations!organization_id(id,name)').eq('profile_id',user!.id).eq('status','active');
    const rows=(data??[]).map((row:any)=>({...row,organization:Array.isArray(row.organization)?row.organization[0]:row.organization}));setMemberships(rows);if(rows[0]?.organization_id)setOrganizationId(rows[0].organization_id);
  }
  async function loadSubmissions(orgId:string){
    const {data}=await db.from('network_editorial_submissions').select('id,organization_id,submission_type,title,summary,source_url,media_url,status,review_notes,created_at').eq('organization_id',orgId).order('created_at',{ascending:false}).limit(100);setSubmissions(data??[]);
  }
  async function submit(){
    setMessage('');if(!form.title.trim()||form.summary.trim().length<10){setMessage('Add a title and a useful summary of at least 10 characters.');return;}setBusy(true);
    const {error}=await db.from('network_editorial_submissions').insert({organization_id:organizationId,submitted_by:user!.id,submission_type:form.type,title:form.title.trim(),summary:form.summary.trim(),source_url:form.sourceUrl.trim()||null,media_url:form.mediaUrl.trim()||null});
    setBusy(false);if(error){setMessage(error.message);return;}setMessage('Submitted to the RCL editorial desk. You will receive an RCL notification when the review status changes.');setForm({type:'announcement',title:'',summary:'',sourceUrl:'',mediaUrl:''});await loadSubmissions(organizationId);
  }
  if(authLoading)return null;
  if(!user)return null;
  if(!memberships.length)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-16"><h1 className="font-display text-4xl font-black uppercase">Claim an organization first.</h1><p className="mt-4 text-white/45">The media desk is available to verified RCL Network organization operators.</p><Link href="/organizations" className="mt-6 inline-flex text-rcl-blue">Browse organizations</Link></Container></main>;

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white"><Container maxWidth="xl" className="py-10 sm:py-14">
    <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCL Media Desk</p><h1 className="mt-2 font-display text-5xl font-black uppercase">Pitch what matters in <span className="text-rcl-blue">Virginia basketball.</span></h1><p className="mt-4 max-w-3xl text-sm leading-6 text-white/45">Send RCL tournament news, tryouts, results, player stories, highlights and community updates. Editorial coverage is earned and selected by RCL; submitting does not guarantee publication and paid plans do not buy editorial conclusions.</p>
    {message&&<p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-sm text-amber-100">{message}</p>}
    <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_.9fr]"><div className="rounded-3xl border border-rcl-blue/15 bg-[#071522]/55 p-6"><div className="flex items-center gap-3"><FaNewspaper className="text-rcl-blue"/><h2 className="font-display text-2xl font-black uppercase">Submit a story or update</h2></div><select value={organizationId} onChange={e=>setOrganizationId(e.target.value)} className={`${input} mt-5`}>{memberships.map(m=><option key={m.organization_id} value={m.organization_id}>{m.organization?.name??'Organization'}</option>)}</select><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Submission type"><select className={input} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{types.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field><Field label="Headline / title"><input className={input} maxLength={160} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field><div className="sm:col-span-2"><Field label="Why this matters"><textarea className="min-h-36 w-full rounded-xl border border-white/10 bg-[#050b12] p-3 text-sm text-white outline-none focus:border-rcl-blue/55" maxLength={2000} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/></Field></div><Field label="Official/source URL"><input type="url" className={input} placeholder="https://..." value={form.sourceUrl} onChange={e=>setForm({...form,sourceUrl:e.target.value})}/></Field><Field label="Photo/video URL"><input type="url" className={input} placeholder="https://..." value={form.mediaUrl} onChange={e=>setForm({...form,mediaUrl:e.target.value})}/></Field></div><button onClick={()=>void submit()} disabled={busy} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black disabled:opacity-40"><FaCircleCheck/>{busy?'Submitting…':'Send to RCL Media'}</button><p className="mt-4 text-[11px] leading-5 text-white/30">RCL may independently edit, verify, decline or publish submitted material. Paid distribution remains clearly separated from organic editorial decisions.</p></div>
      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><div className="flex items-center gap-3"><FaPhotoFilm className="text-rcl-orange"/><h2 className="font-display text-2xl font-black uppercase">Submission history</h2></div><div className="mt-5 space-y-3">{submissions.length?submissions.map(item=><article key={item.id} className="rounded-2xl border border-white/8 bg-black/20 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">{item.title}</b><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${item.status==='published'?'bg-emerald-400/10 text-emerald-300':item.status==='declined'?'bg-red-400/10 text-red-200':'bg-white/[.06] text-white/45'}`}>{item.status}</span></div><p className="mt-2 line-clamp-3 text-xs leading-5 text-white/40">{item.summary}</p>{item.review_notes&&<p className="mt-3 rounded-lg border border-white/8 bg-white/[.03] p-3 text-xs text-white/45">RCL note: {item.review_notes}</p>}<p className="mt-3 text-[10px] uppercase text-white/25">{new Date(item.created_at).toLocaleString()}</p></article>):<p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/35">No editorial submissions yet.</p>}</div><Link href="/network/dashboard/reach" className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-blue">Open RCL Reach <FaArrowRight/></Link></div></section>
  </Container></main>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block text-[10px] font-black uppercase tracking-[.13em] text-white/35">{label}<div className="mt-2">{children}</div></label>}
