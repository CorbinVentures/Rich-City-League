'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {Container} from '@/components/Container';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type Interest={id:string;full_name:string;email:string;phone:string|null;city:string|null;status:string;created_at:string};
const statuses=['interest','invited','waitlist','withdrawn'] as const;

export default function BmfInterestAdminPage(){
  const {user,profile,loading:authLoading}=useAuth(); const db=useMemo(()=>getSupabaseClient() as any,[]);
  const [rows,setRows]=useState<Interest[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [saving,setSaving]=useState('');
  const allowed=(profile as any)?.role==='admin';
  const load=useCallback(async()=>{if(!user||!allowed){setLoading(false);return;}const {data,error:queryError}=await db.from('rch_bmf_championship_interests').select('id,full_name,email,phone,city,status,created_at').order('created_at',{ascending:false}).limit(500);if(queryError)setError('Could not load the list. Confirm the migration is active.');else{setError('');setRows(data??[]);}setLoading(false);},[allowed,db,user]);
  useEffect(()=>{void load();},[load]);
  async function setStatus(id:string,status:string){setSaving(id);const {error:updateError}=await db.from('rch_bmf_championship_interests').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(updateError)setError('Could not update that registration status.');else setRows(current=>current.map(row=>row.id===id?{...row,status}:row));setSaving('');}
  return <main className="min-h-screen bg-[#07110b] pb-24 text-white"><Container maxWidth="xl" className="py-8 sm:py-12"><p className="text-xs font-black uppercase tracking-[.2em] text-[#c9a64b]">Runs operations</p><h1 className="mt-2 font-display text-4xl font-black uppercase sm:text-6xl">BMF Interest Desk</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#d6e4d9]">Manage participant contact requests for the January 2027 1v1 event. Interest is not paid entry or a confirmed slot.</p>
    {authLoading||loading?<p role="status" className="mt-6 rounded-xl border border-[#52735a] p-5">Loading registrations…</p>:!user||!allowed?<p role="alert" className="mt-6 rounded-xl border border-red-300/30 bg-red-950/40 p-5">Administrator access is required to view participant contact details.</p>:<>
      {error&&<p role="alert" className="mt-5 rounded-xl border border-red-300/30 bg-red-950/40 p-4 text-sm">{error}</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-3"><Stat label="Interest records" value={rows.length}/><Stat label="Invited" value={rows.filter(row=>row.status==='invited').length}/><Stat label="Waitlist" value={rows.filter(row=>row.status==='waitlist').length}/></div>
      <div className="mt-6 space-y-3">{rows.length?rows.map(row=><article key={row.id} className="rounded-2xl border border-[#52735a] bg-[#0d1a11] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-display text-xl font-black uppercase">{row.full_name}</h2><a href={'mailto:'+row.email} className="mt-1 inline-block min-h-11 py-2 text-sm font-semibold text-[#f1d983] underline underline-offset-2">{row.email}</a><p className="text-xs text-[#d6e4d9]">{[row.city,row.phone].filter(Boolean).join(' · ')||'No city or phone'} · {new Date(row.created_at).toLocaleDateString()}</p></div><label className="text-xs font-bold">Status<select aria-label={'Set status for '+row.full_name} value={row.status} disabled={saving===row.id} onChange={e=>void setStatus(row.id,e.target.value)} className="mt-1 block min-h-11 rounded-xl border border-[#52735a] bg-[#07110b] px-3 text-sm">{statuses.map(status=><option key={status} value={status}>{status}</option>)}</select></label></div></article>):<p className="rounded-xl border border-dashed border-[#58705d] p-7 text-sm">No interest registrations yet.</p>}</div>
    </>}
  </Container></main>;
}
function Stat({label,value}:{label:string;value:number}){return <div className="rounded-xl border border-[#47634e] bg-[#0d1a11] p-4"><p className="text-xs font-black uppercase text-[#d6e4d9]">{label}</p><strong className="mt-2 block font-display text-3xl font-black">{value}</strong></div>;}
