'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaClipboardCheck,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type Review={id:string;owner_id:string;name:string;city:string;description:string;instagram_url:string|null;status:string;review_note:string|null;created_at:string;reward_multiplier:number};
export default function RunsPartnerReviewPage(){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [allowed,setAllowed]=useState(false);
 const [loading,setLoading]=useState(true);
 const [partners,setPartners]=useState<Review[]>([]);
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [multipliers,setMultipliers]=useState<Record<string,1|2|3>>({});
 const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  if(!db||!user?.id){setLoading(false);return;}
  const {data}=await db.rpc('is_staff_or_admin');
  if(!data){setAllowed(false);setLoading(false);return;}
  setAllowed(true);
  const {data:rows,error:failure}=await db.from('rch_runs_partners').select('id,owner_id,name,city,description,instagram_url,status,review_note,created_at,reward_multiplier')
   .in('status',['pending','approved','declined','suspended']).order('created_at',{ascending:false}).limit(150);
  if(failure)setError(failure.message);
  setPartners((rows??[]) as Review[]);
  setMultipliers(current=>Object.fromEntries((rows??[]).map((x:Review)=>[x.id,current[x.id]??(x.reward_multiplier===3?3:x.reward_multiplier===2?2:1)])) as Record<string,1|2|3>);
  setLoading(false);
 },[db,user?.id]);
 useEffect(()=>{void load();},[load]);
 async function review(p:Review,decision:'approved'|'declined'|'suspended'){
  if(!db||busy)return;
  setBusy(p.id);setError('');setNotice('');
  const {error:failure}=await db.rpc('rch_review_runs_partner',{p_partner:p.id,p_decision:decision,p_note:(notes[p.id]||'').trim(),p_reward_multiplier:multipliers[p.id]??1});
  if(failure)setError(failure.message);
  else{setNotice(p.name+' — '+decision+'.');await load();}
  setBusy('');
 }
 if(!user)return <main className="min-h-screen bg-[#151515] p-8 text-white">RCH operations access requires sign-in.</main>;
 if(loading)return <main className="min-h-screen bg-[#151515] p-8 text-white">Verifying operations access…</main>;
 if(!allowed)return <main className="min-h-screen bg-[#151515] p-8 text-white"><p role="alert">You do not have RCH operations permission for partner approvals.</p><Link href="/runs/partners" className="text-[#c5c5c5]">Partner directory</Link></main>;
 return <main className="min-h-screen bg-[#151515] px-4 pb-28 pt-8 text-white sm:px-8"><div className="mx-auto max-w-5xl">
  <Link href="/runs/partners" className="text-xs font-bold text-[#bebebe]">← Partner network</Link>
  <header className="mt-5 rounded-2xl border border-[#676767] bg-[#252525] p-6"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#c0c0c0]"><FaClipboardCheck/> RCH Operations · Restricted</p><h1 className="mt-3 text-3xl font-black uppercase">Partner application review</h1><p className="mt-3 max-w-2xl text-sm text-[#d2d2d2]">Confirm the organization and its authorized RCH account before approval. Organization approval publishes the partner page; it does not certify a host, venue, event, score or result. Choose whether its approved Runs receive 1×, 2× or 3× eligible event rewards.</p></header>
  {error&&<p role="alert" className="mt-5 rounded-xl border border-gray-400/40 p-4 text-sm text-gray-200">{error}</p>}
  {notice&&<p role="status" className="mt-5 rounded-xl border border-gray-500/40 p-4 text-sm text-gray-200">{notice}</p>}
  <div className="mt-6 space-y-4">{partners.map(p=><article key={p.id} className="rounded-2xl border border-[#5b5b5b] bg-[#212121] p-5">
   <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">{p.name}</h2><p className="mt-1 text-xs text-[#c5c5c5]">{p.city}, VA · Applied {new Date(p.created_at).toLocaleDateString()}</p></div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-[#868686] px-3 py-1 text-xs font-black">{p.status.toUpperCase()}</span><span className="inline-flex items-center gap-1 rounded-full bg-gray-800/45 px-3 py-1 text-xs font-black text-gray-200"><FaShieldHalved/>Organization review</span></div></div>
   <p className="mt-4 text-sm leading-6 text-[#d6d6d6]">{p.description||'No organization description submitted.'}</p>
   {p.instagram_url&&<a target="_blank" rel="noopener noreferrer" href={p.instagram_url} className="mt-2 inline-block text-xs font-bold text-[#c5c5c5]">Review public Instagram ↗</a>}
   <p className="mt-2 text-xs text-[#c1c1c1]">Owner profile: {p.owner_id}</p>
   {p.review_note&&<p className="mt-3 text-xs text-[#bebebe]">Previous review: {p.review_note}</p>}
   <label className="mt-4 block text-xs font-bold">Independent review evidence / decision note<textarea rows={2} minLength={8} maxLength={500} className="mt-2 w-full rounded-xl border border-[#6f6f6f] bg-[#171717] px-3 py-3 text-sm" value={notes[p.id]??''} onChange={e=>setNotes({...notes,[p.id]:e.target.value})} placeholder="Describe verified organizer identity, facilities, terms and evidence…"/></label>
   <label className="mt-4 block max-w-sm text-xs font-bold">Eligible event rewards<select className="mt-2 w-full rounded-xl border border-[#6f6f6f] bg-[#171717] px-3 py-3 text-sm" value={multipliers[p.id]??1} onChange={e=>setMultipliers({...multipliers,[p.id]:Number(e.target.value) as 1|2|3})}><option value={1}>1× standard rewards</option><option value={2}>2× event XP / REP</option><option value={3}>3× event XP / REP</option></select><span className="mt-2 block text-[11px] font-normal leading-5 text-[#b8b8b8]">Eligible event rewards include code-verified attendance, independently verified game/stat results, and event Run Tape highlights. RCH’s result review remains in place.</span></label>
   <div className="mt-4 flex flex-wrap gap-2"><button disabled={Boolean(busy)||(notes[p.id]||'').trim().length<8} onClick={()=>void review(p,'approved')} className="min-h-10 rounded-lg bg-[#818181] px-4 text-xs font-black disabled:opacity-40">{p.status==='approved'?'Save approval':'Approve organization'}</button><button disabled={Boolean(busy)||(notes[p.id]||'').trim().length<8} onClick={()=>void review(p,'declined')} className="min-h-10 rounded-lg border border-[#808080] px-4 text-xs font-bold text-[#cccccc] disabled:opacity-40">Decline</button><button disabled={Boolean(busy)||(notes[p.id]||'').trim().length<8} onClick={()=>void review(p,'suspended')} className="min-h-10 rounded-lg border border-[#878787] px-4 text-xs font-bold text-[#dcdcdc] disabled:opacity-40">Suspend</button></div>
  </article>)}{!partners.length&&<p className="rounded-xl border border-dashed border-[#606060] p-8 text-sm text-[#cbcbcb]">No partner applications yet.</p>}</div>
 </div></main>;
}
