'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaClipboardCheck,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type Review={id:string;owner_id:string;name:string;city:string;description:string;instagram_url:string|null;status:string;review_note:string|null;created_at:string};
export default function RunsPartnerReviewPage(){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [allowed,setAllowed]=useState(false);
 const [loading,setLoading]=useState(true);
 const [partners,setPartners]=useState<Review[]>([]);
 const [credentials,setCredentials]=useState<Set<string>>(new Set());
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  if(!db||!user?.id){setLoading(false);return;}
  const {data}=await db.rpc('is_staff_or_admin');
  if(!data){setAllowed(false);setLoading(false);return;}
  setAllowed(true);
  const [{data:rows,error:failure},{data:hosts}]=await Promise.all([
   db.from('rch_runs_partners').select('id,owner_id,name,city,description,instagram_url,status,review_note,created_at')
    .in('status',['pending','approved','declined','suspended']).order('created_at',{ascending:false}).limit(150),
   db.from('rch_verified_run_hosts').select('profile_id').eq('verification_status','approved').gt('expires_at',new Date().toISOString())
  ]);
  if(failure)setError(failure.message);
  setPartners((rows??[]) as Review[]);
  setCredentials(new Set((hosts??[]).map((x:{profile_id:string})=>x.profile_id)));
  setLoading(false);
 },[db,user?.id]);
 useEffect(()=>{void load();},[load]);
 async function review(p:Review,decision:'approved'|'declined'|'suspended'){
  if(!db||busy)return;
  setBusy(p.id);setError('');setNotice('');
  const {error:failure}=await db.rpc('rch_review_runs_partner',{p_partner:p.id,p_decision:decision,p_note:(notes[p.id]||'').trim()});
  if(failure)setError(failure.message);
  else{setNotice(p.name+' — '+decision+'.');await load();}
  setBusy('');
 }
 if(!user)return <main className="min-h-screen bg-[#061727] p-8 text-white">RCH operations access requires sign-in.</main>;
 if(loading)return <main className="min-h-screen bg-[#061727] p-8 text-white">Verifying operations access…</main>;
 if(!allowed)return <main className="min-h-screen bg-[#061727] p-8 text-white"><p role="alert">You do not have RCH operations permission for partner approvals.</p><Link href="/runs/partners" className="text-[#91cfff]">Partner directory</Link></main>;
 return <main className="min-h-screen bg-[#061727] px-4 pb-28 pt-8 text-white sm:px-8"><div className="mx-auto max-w-5xl">
  <Link href="/runs/partners" className="text-xs font-bold text-[#8cc7fc]">← Partner network</Link>
  <header className="mt-5 rounded-2xl border border-[#426e90] bg-[#0b2a45] p-6"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#8acafc]"><FaClipboardCheck/> RCH Operations · Restricted</p><h1 className="mt-3 text-3xl font-black uppercase">Partner application review</h1><p className="mt-3 max-w-2xl text-sm text-[#bfd5e8]">Approve only organizations you have independently confirmed. The applicant must already have an active human-approved Verified Host credential. Do not grant partner status based only on a claimed social profile.</p></header>
  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/40 p-4 text-sm text-red-200">{error}</p>}
  {notice&&<p role="status" className="mt-5 rounded-xl border border-emerald-500/40 p-4 text-sm text-emerald-200">{notice}</p>}
  <div className="mt-6 space-y-4">{partners.map(p=><article key={p.id} className="rounded-2xl border border-[#38627e] bg-[#0b253e] p-5">
   <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">{p.name}</h2><p className="mt-1 text-xs text-[#a5cbe4]">{p.city}, VA · Applied {new Date(p.created_at).toLocaleDateString()}</p></div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-[#6b8ba6] px-3 py-1 text-xs font-black">{p.status.toUpperCase()}</span><span className={'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black '+(credentials.has(p.owner_id)?'bg-emerald-800/45 text-emerald-200':'bg-amber-900/40 text-amber-200')}><FaShieldHalved/>{credentials.has(p.owner_id)?'Verified Host active':'Host not verified'}</span></div></div>
   <p className="mt-4 text-sm leading-6 text-[#c4d9e8]">{p.description||'No organization description submitted.'}</p>
   {p.instagram_url&&<a target="_blank" rel="noopener noreferrer" href={p.instagram_url} className="mt-2 inline-block text-xs font-bold text-[#91cfff]">Review public Instagram ↗</a>}
   <p className="mt-2 text-xs text-[#a6c7db]">Owner profile: {p.owner_id}</p>
   {p.review_note&&<p className="mt-3 text-xs text-[#a7c2d5]">Previous review: {p.review_note}</p>}
   <label className="mt-4 block text-xs font-bold">Independent review evidence / decision note<textarea rows={2} minLength={8} maxLength={500} className="mt-2 w-full rounded-xl border border-[#507594] bg-[#061a2d] px-3 py-3 text-sm" value={notes[p.id]??''} onChange={e=>setNotes({...notes,[p.id]:e.target.value})} placeholder="Describe verified organizer identity, facilities, terms and evidence…"/></label>
   <div className="mt-4 flex flex-wrap gap-2"><button disabled={Boolean(busy)||!credentials.has(p.owner_id)||(notes[p.id]||'').trim().length<8} onClick={()=>void review(p,'approved')} className="min-h-10 rounded-lg bg-[#348de7] px-4 text-xs font-black disabled:opacity-40">{p.status==='approved'?'Renew approval':'Approve organization'}</button><button disabled={Boolean(busy)||(notes[p.id]||'').trim().length<8} onClick={()=>void review(p,'declined')} className="min-h-10 rounded-lg border border-[#a7776d] px-4 text-xs font-bold text-[#f6c2b6] disabled:opacity-40">Decline</button><button disabled={Boolean(busy)||(notes[p.id]||'').trim().length<8} onClick={()=>void review(p,'suspended')} className="min-h-10 rounded-lg border border-[#9d8555] px-4 text-xs font-bold text-[#f0dbaa] disabled:opacity-40">Suspend</button></div>
  </article>)}{!partners.length&&<p className="rounded-xl border border-dashed border-[#3d6786] p-8 text-sm text-[#b8cfe0]">No partner applications yet.</p>}</div>
 </div></main>;
}
