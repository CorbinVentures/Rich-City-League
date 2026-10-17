'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaClipboardCheck,FaShieldHalved} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';

type Order={
 id:string;profile_id:string;reward_code:string;price_paid:number;
 post_id:string|null;region:string;status:string;purchased_at:string
};
type Post={id:string;body:string};
type Reward={code:string;title:string};

export default function RepOperationsPage(){
 const {user,loading:authLoading}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [staff,setStaff]=useState(false);
 const [orders,setOrders]=useState<Order[]>([]);
 const [posts,setPosts]=useState<Record<string,Post>>({});
 const [rewards,setRewards]=useState<Reward[]>([]);
 const [reviewing,setReviewing]=useState('');
 const [note,setNote]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 const [loaded,setLoaded]=useState(false);
 const [revision,setRevision]=useState(0);
 const load=useCallback(async()=>{
  if(!db||!user?.id){setLoaded(true);return;}
  const {data:allowed,error:denial}=await db.rpc('is_staff_or_admin');
  if(denial||!allowed){setStaff(false);setLoaded(true);return;}
  setStaff(true);
  const [ordersResult,catalogResult]=await Promise.all([
   db.from('rch_rep_orders').select('id,profile_id,reward_code,price_paid,post_id,region,status,purchased_at')
    .eq('status','pending_review').order('purchased_at',{ascending:true}).limit(80),
   db.from('rch_rep_rewards').select('code,title')
  ]);
  const pending=(ordersResult.data??[]) as Order[];
  setOrders(pending);setRewards((catalogResult.data??[]) as Reward[]);
  const ids=pending.map(o=>o.post_id).filter((id):id is string=>Boolean(id));
  if(ids.length){
   const {data:rows}=await db.from('posts').select('id,body').in('id',ids).limit(80);
   setPosts(Object.fromEntries(((rows??[]) as Post[]).map(x=>[x.id,x])));
  }else setPosts({});
  setLoaded(true);
 },[db,user?.id,revision]);
 useEffect(()=>{void load();},[load]);
 async function review(id:string,approve:boolean){
  if(!db||busy||note.trim().length<8)return;
  setBusy(true);setError('');setNotice('');
  const {error:failure}=await db.rpc('rch_review_rep_reward',{
   p_order:id,p_approve:approve,p_note:note.trim()
  });
  if(failure)setError(failure.message);
  else {setNotice(approve?'Review recorded. The purchased placement or fulfillment is now active.':'Declined. The member received a full REP refund.');setReviewing('');setNote('');setRevision(x=>x+1);}
  setBusy(false);
 }
 return <main className="min-h-screen bg-[#061627] px-4 pb-24 pt-12 text-white sm:px-8">
  <div className="mx-auto max-w-5xl">
   <Link href="/rep" className="text-xs font-bold text-[#9bdcff]">← REP Exchange</Link>
   <p className="mt-7 flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-[#95d6fe]"><FaShieldHalved/> RCH Command Operations</p>
   <h1 className="mt-3 text-3xl font-black uppercase sm:text-5xl">REP Fulfillment Desk</h1>
   <p className="mt-3 max-w-2xl text-sm text-[#bad0de]">RCH staff must approve promotions before they become visible. Declined rewards automatically refund the original REP amount. Member purchases never affect competitive rankings.</p>
   {!authLoading&&(!user||!staff)&&loaded&&<p role="alert" className="mt-7 rounded-xl border border-[#b58c57] p-5 text-sm text-[#e5ceaa]">Only authorized RCH administrators and staff can review REP redemption requests.</p>}
   {staff&&<div className="mt-7">
    <h2 className="flex items-center gap-2 text-xl font-black"><FaClipboardCheck/> Pending Review · {orders.length}</h2>
    {error&&<p role="alert" className="mt-4 rounded-xl border border-rose-400/40 p-3 text-sm text-rose-200">{error}</p>}
    {notice&&<p role="status" className="mt-4 rounded-xl border border-emerald-400/40 p-3 text-sm text-emerald-200">{notice}</p>}
    <div className="mt-5 space-y-3">
      {orders.map(order=><article key={order.id} className="rounded-2xl border border-[#466d8a] bg-[#0b2b44] p-5">
       <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-black">{rewards.find(x=>x.code===order.reward_code)?.title??order.reward_code.replaceAll('_',' ')}</p>
         <p className="mt-1 text-xs text-[#b0cddd]">Member {order.profile_id.slice(0,8)} · {order.region.replaceAll('-',' ')} · {new Date(order.purchased_at).toLocaleString()}</p></div>
        <strong className="text-[#f6dfa6]">{order.price_paid} REP</strong>
       </div>
       {order.post_id&&<div className="mt-4 rounded-xl border border-[#355975] p-3 text-sm text-[#c9dce7]">
         {posts[order.post_id]?.body??'Post requires eligibility re-check before approval.'}
         <Link href={'/social?post='+encodeURIComponent(order.post_id)} className="mt-2 block text-xs font-bold text-[#8bd3ff]">Inspect source post</Link>
       </div>}
       {reviewing===order.id?<div className="mt-4 space-y-3">
        <label className="block text-xs font-bold">Fulfillment evidence / reason
         <textarea value={note} maxLength={500} onChange={e=>setNote(e.target.value)} rows={3}
          placeholder="Record where the placement will appear or why it cannot be fulfilled…"
          className="mt-2 w-full rounded-xl border border-[#698aa2] bg-[#081a2b] p-3 text-sm"/>
        </label>
        <div className="flex flex-wrap gap-2">
         <button type="button" disabled={busy||note.trim().length<8} onClick={()=>void review(order.id,true)} className="min-h-11 rounded-lg bg-[#8fddbf] px-4 text-xs font-black text-[#082c28] disabled:opacity-40">Approve &amp; fulfill</button>
         <button type="button" disabled={busy||note.trim().length<8} onClick={()=>void review(order.id,false)} className="min-h-11 rounded-lg border border-rose-400/50 bg-[#482c37] px-4 text-xs font-black disabled:opacity-40">Decline &amp; refund</button>
         <button type="button" onClick={()=>{setReviewing('');setNote('');}} className="min-h-11 rounded-lg border border-[#6d899b] px-4 text-xs">Cancel</button>
        </div>
       </div>:<button type="button" onClick={()=>{setReviewing(order.id);setNote('');}} className="mt-4 min-h-10 rounded-lg border border-[#7399b2] px-4 text-xs font-bold">Review request</button>}
      </article>)}
      {!orders.length&&<p className="rounded-xl border border-dashed border-[#466d8a] p-7 text-center text-sm text-[#b8d2e3]">No pending REP redemptions.</p>}
    </div>
   </div>}
  </div>
 </main>;
}