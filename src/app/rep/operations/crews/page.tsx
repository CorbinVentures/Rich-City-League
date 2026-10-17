'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {FaShieldHalved,FaPeopleGroup} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';

type Order={id:string;crew_id:string;reward_code:string;cost:number;requested_by:string;created_at:string};
export default function CrewRepOperationsPage(){
 const {user,loading}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [staff,setStaff]=useState(false);
 const [orders,setOrders]=useState<Order[]>([]);
 const [names,setNames]=useState<Record<string,string>>({});
 const [rewards,setRewards]=useState<Record<string,string>>({});
 const [selected,setSelected]=useState('');
 const [note,setNote]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [loaded,setLoaded]=useState(false);
 const [version,setVersion]=useState(0);
 useEffect(()=>{
  if(!db||!user?.id)return;
  let alive=true;
  void(async()=>{
   const {data:allowed}=await db.rpc('is_staff_or_admin');
   if(!alive)return;
   if(!allowed){setStaff(false);setLoaded(true);return;}
   setStaff(true);
   const [a,b]=await Promise.all([
    db.from('rch_crew_rep_orders').select('id,crew_id,reward_code,cost,requested_by,created_at')
      .eq('status','pending_review').order('created_at',{ascending:true}).limit(80),
    db.from('rch_crew_rep_rewards').select('code,title').eq('available',true)
   ]);
   if(!alive)return;
   const orderList=(a.data??[]) as Order[];
   setOrders(orderList);
   setRewards(Object.fromEntries((b.data??[]).map((r:{code:string;title:string})=>[r.code,r.title])));
   const ids=[...new Set(orderList.map(x=>x.crew_id))];
   if(ids.length){
    const {data:crews}=await db.from('commonwealth_crews').select('id,name').in('id',ids).limit(80);
    if(alive)setNames(Object.fromEntries((crews??[]).map((r:{id:string;name:string})=>[r.id,r.name])));
   }
   setLoaded(true);
  })();
  return()=>{alive=false;};
 },[db,user?.id,version]);
 const review=async(approve:boolean)=>{
  if(!db||!selected||busy||note.trim().length<8)return;
  setBusy(true);setMessage('');
  const {error}=await db.rpc('rch_decide_crew_rep_order',{p_order:selected,p_approve:approve,p_note:note.trim()});
  setMessage(error?error.message:(approve?'Crew reward approved and marked fulfilled.':'Crew reward declined with automatic treasury refund.'));
  if(!error){setSelected('');setNote('');setVersion(v=>v+1);}
  setBusy(false);
 };
 return <main className="min-h-screen bg-[#061626] px-4 pb-24 pt-12 text-white sm:px-8">
  <div className="mx-auto max-w-5xl">
   <Link href="/rep/operations" className="text-xs font-bold text-[#a3d8ff]">← REP Operations</Link>
   <p className="mt-7 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#e5d3ac]"><FaShieldHalved/> Independent crew fulfillment</p>
   <h1 className="mt-3 text-3xl font-black uppercase sm:text-5xl">Crew REP Review Desk</h1>
   <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b8cede]">Only authorized staff may fulfill crew rewards. Crew members cannot approve their own orders, and denied promotions automatically refund the treasury.</p>
   {message&&<p role="status" className="mt-5 rounded-xl border border-[#6883a0] p-4 text-sm">{message}</p>}
   {!loading&&loaded&&!staff&&<p role="alert" className="mt-5 rounded-xl border border-amber-400/40 p-4">Only RCH staff can review crew treasury rewards.</p>}
   {staff&&<section className="mt-7 space-y-3">
    <h2 className="flex items-center gap-2 text-xl font-black"><FaPeopleGroup/> Requests · {orders.length}</h2>
    {orders.map(order=><article key={order.id} className="rounded-xl border border-[#49708d] bg-[#102b43] p-5">
     <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="font-bold">{names[order.crew_id]??'RCH Crew'} · {rewards[order.reward_code]??order.reward_code}</p>
       <p className="mt-1 text-xs text-[#a8c8df]">{new Date(order.created_at).toLocaleDateString()} · Requester {order.requested_by.slice(0,8)}</p></div>
      <strong className="text-[#ffe1a5]">{order.cost} Crew REP</strong>
     </div>
     {selected===order.id?<div className="mt-4">
      <textarea aria-label="Review note" placeholder="Describe the fulfillment or rejection evidence" rows={3} maxLength={500} value={note} onChange={e=>setNote(e.target.value)} className="w-full rounded-lg border border-[#7690a4] bg-[#081a2b] p-3 text-sm"/>
      <div className="mt-3 flex flex-wrap gap-2">
       <button disabled={busy||note.trim().length<8} onClick={()=>void review(true)} className="min-h-10 rounded-lg bg-[#8cdbb7] px-4 text-xs font-black text-[#173128] disabled:opacity-40">Approve &amp; fulfill</button>
       <button disabled={busy||note.trim().length<8} onClick={()=>void review(false)} className="min-h-10 rounded-lg bg-[#8f454b] px-4 text-xs font-black disabled:opacity-40">Decline &amp; refund</button>
       <button onClick={()=>setSelected('')} className="min-h-10 rounded-lg border border-[#8495a4] px-4 text-xs font-bold">Cancel</button>
      </div>
     </div>:<button onClick={()=>{setSelected(order.id);setNote('');}} className="mt-4 min-h-10 rounded-lg border border-[#7895af] px-4 text-xs font-bold">Review</button>}
    </article>)}
    {!orders.length&&<p className="rounded-xl border border-dashed border-[#49708d] p-7 text-sm text-[#bad1e1]">No pending crew requests.</p>}
   </section>}
  </div>
 </main>;
}