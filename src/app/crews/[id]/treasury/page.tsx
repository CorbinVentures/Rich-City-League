'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {useParams} from 'next/navigation';
import {FaBolt,FaCoins,FaPeopleGroup,FaShieldHalved,FaTrophy} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';

type Crew={id:string;name:string;captain_id:string;city:string};
type Wallet={balance:number;lifetime_earned:number};
type Reward={code:string;title:string;description:string;price:number};
type Order={id:string;reward_code:string;cost:number;status:string;created_at:string;review_note:string|null};
type Tx={id:string;amount:number;kind:string;description:string;created_at:string};

export default function CrewTreasuryPage(){
 const params=useParams<{id:string}>();
 const id=params?.id||'';
 const {user,loading:authLoading}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [crew,setCrew]=useState<Crew|null>(null);
 const [wallet,setWallet]=useState<Wallet>({balance:0,lifetime_earned:0});
 const [member,setMember]=useState(false);
 const [personal,setPersonal]=useState(0);
 const [rewards,setRewards]=useState<Reward[]>([]);
 const [orders,setOrders]=useState<Order[]>([]);
 const [transactions,setTransactions]=useState<Tx[]>([]);
 const [amount,setAmount]=useState('100');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [loaded,setLoaded]=useState(false);
 const [version,setVersion]=useState(0);
 const captain=Boolean(user&&crew?.captain_id===user.id);
 const refresh=useCallback(async()=>{
  if(!db||!user?.id||!id)return;
  const [c,memberRes,w,r,o,t,p]=await Promise.all([
   db.from('commonwealth_crews').select('id,name,captain_id,city').eq('id',id).maybeSingle(),
   db.from('commonwealth_crew_members').select('profile_id').eq('crew_id',id).eq('profile_id',user.id).maybeSingle(),
   db.from('rch_crew_rep_wallets').select('balance,lifetime_earned').eq('crew_id',id).maybeSingle(),
   db.from('rch_crew_rep_rewards').select('code,title,description,price').eq('available',true).order('price'),
   db.from('rch_crew_rep_orders').select('id,reward_code,cost,status,created_at,review_note').eq('crew_id',id).order('created_at',{ascending:false}).limit(30),
   db.from('rch_crew_rep_transactions').select('id,amount,kind,description,created_at').eq('crew_id',id).order('created_at',{ascending:false}).limit(35),
   db.from('rch_rep_wallets').select('balance').eq('profile_id',user.id).maybeSingle()
  ]);
  const chosen=(c.data??null) as Crew|null;
  setCrew(chosen);
  setMember(Boolean(chosen&&((memberRes.data&&memberRes.data.profile_id===user.id)||chosen.captain_id===user.id)));
  setWallet((w.data??{balance:0,lifetime_earned:0}) as Wallet);
  setRewards((r.data??[]) as Reward[]);
  setOrders((o.data??[]) as Order[]);
  setTransactions((t.data??[]) as Tx[]);
  setPersonal(Number(p.data?.balance||0));
  setLoaded(true);
 },[db,id,user?.id]);
 useEffect(()=>{void refresh();},[refresh,version]);
 const act=async(fn:string,args:Record<string,unknown>,success:string)=>{
  if(!db||busy)return;
  setBusy(true);setError('');setNotice('');
  const {error:failure}=await db.rpc(fn,args);
  if(failure)setError(failure.message);
  else{setNotice(success);setVersion(v=>v+1);}
  setBusy(false);
 };
 const contribute=()=>void act('rch_contribute_crew_rep',{p_crew:id,p_amount:Number(amount)},'REP moved into your crew treasury. Every contribution is recorded.');
 const redeem=(code:string)=>void act('rch_redeem_crew_rep',{p_crew:id,p_code:code},'Crew redemption submitted for independent RCH staff review.');
 return <main className="min-h-screen bg-[#061626] px-4 pb-24 pt-12 text-white sm:px-8">
   <div className="mx-auto max-w-5xl">
    <Link href={'/crews?crew='+encodeURIComponent(id)} className="text-xs font-bold text-[#a4d8fb]">← Crew Headquarters</Link>
    <header className="mt-6 rounded-3xl border border-[#766b47] bg-[radial-gradient(ellipse_at_90%_0%,#644d2b65,transparent_65%),linear-gradient(130deg,#102b43,#111e30)] p-6 sm:p-9">
     <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-[#ffe0ab]"><FaPeopleGroup/> RCH Crews · Team REP</p>
     <h1 className="mt-3 font-display text-3xl font-black uppercase sm:text-5xl">{crew?.name??'Crew'} Treasury</h1>
     <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c1d0dd]">Build your crew’s influence together. Pool earned REP, unlock recruitment and media rewards, and show supporters how your crew invests in its growth. REP can never buy territory, athletic wins, or a crown.</p>
     <div className="mt-6 grid max-w-xl grid-cols-2 gap-3">
      <div className="rounded-xl border border-[#806c50] bg-[#1c2a36] p-4"><p className="flex items-center gap-2 text-xs text-[#dbcaa5]"><FaCoins/> Treasury balance</p><strong className="mt-2 block text-3xl">{Number(wallet.balance).toLocaleString()}</strong><p className="text-xs text-[#d6ccb9]">Crew REP available</p></div>
      <div className="rounded-xl border border-[#806c50] bg-[#1c2a36] p-4"><p className="flex items-center gap-2 text-xs text-[#dbcaa5]"><FaTrophy/> Crew earned REP</p><strong className="mt-2 block text-3xl">{Number(wallet.lifetime_earned).toLocaleString()}</strong><p className="text-xs text-[#d6ccb9]">From independently verified takeovers</p></div>
     </div>
    </header>
    {loaded&&!member&&<p className="mt-6 rounded-xl border border-amber-400/40 p-5 text-sm text-[#f0d3a2]">{!user&&!authLoading?'Sign in to view your Crew REP treasury.':'Treasury access is limited to this crew’s registered members and captain.'}</p>}
    {member&&<>
     {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-400/40 p-4 text-sm text-rose-200">{error}</p>}
     {notice&&<p role="status" className="mt-5 rounded-xl border border-emerald-400/40 p-4 text-sm text-emerald-200">{notice}</p>}
     <section className="mt-7 rounded-2xl border border-[#4b6889] bg-[#102b45] p-5">
      <h2 className="flex items-center gap-2 text-xl font-black uppercase"><FaBolt/> Contribute to Your Crew</h2>
      <p className="mt-2 text-sm text-[#b5cee1]">Your wallet: {personal.toLocaleString()} REP. Contributions are final and cannot be sent to other individual members. Maximum 1,500 REP per rolling 24 hours.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
       <label className="text-xs font-bold">Transfer from personal wallet
        <input inputMode="numeric" type="number" min={10} max={1000} step={10} value={amount} onChange={e=>setAmount(e.target.value)} className="mt-2 min-h-11 w-40 rounded-xl border border-[#537f9f] bg-[#061727] px-3 text-sm"/></label>
       <button type="button" disabled={busy||Number(amount)<10||Number(amount)>1000||Number(amount)>personal} onClick={contribute} className="min-h-11 rounded-xl bg-[#65bdec] px-5 text-xs font-black text-[#061827] disabled:opacity-40">Contribute REP</button>
      </div>
     </section>
     <section className="mt-8">
      <h2 className="text-2xl font-black uppercase">Crew Reward Locker</h2>
      <p className="mt-2 text-sm text-[#b5cee1]">Only the captain can submit treasury redemptions. Each request requires staff fulfillment and cannot affect match outcomes.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{rewards.map(reward=><article key={reward.code} className="rounded-2xl border border-[#4d6984] bg-[#112940] p-5">
       <p className="text-[11px] font-black uppercase text-[#e8d19f]">Crew-only reward</p><h3 className="mt-2 text-xl font-black">{reward.title}</h3>
       <p className="mt-2 text-sm leading-6 text-[#abc7dc]">{reward.description}</p>
       <div className="mt-4 flex items-center justify-between gap-3"><strong className="text-lg text-[#ffe2a0]">{reward.price} REP</strong>
        <button onClick={()=>redeem(reward.code)} disabled={busy||!captain||wallet.balance<reward.price} className="min-h-10 rounded-xl bg-[#f3c987] px-4 text-xs font-black text-[#281b11] disabled:opacity-40">{captain?'Request reward':'Captain only'}</button>
       </div>
      </article>)}</div>
     </section>
     <section className="mt-8 grid gap-6 lg:grid-cols-2">
      <div><h2 className="text-xl font-black uppercase">Reward Requests</h2><div className="mt-4 space-y-2">{orders.map(order=><div key={order.id} className="rounded-xl border border-[#4d6a83] bg-[#0b273f] p-4">
       <strong className="text-sm">{rewards.find(r=>r.code===order.reward_code)?.title??order.reward_code.replaceAll('_',' ')}</strong>
       <p className="mt-1 text-xs text-[#a2c6dc]">{order.status.replaceAll('_',' ')} · {order.cost} REP</p>
       {order.review_note&&<p className="mt-2 text-xs leading-5 text-[#cddbe6]">RCH staff: {order.review_note}</p>}
      </div>)}{!orders.length&&<p className="text-sm text-[#adc5d6]">No crew rewards redeemed yet.</p>}</div></div>
      <div><h2 className="text-xl font-black uppercase">Crew REP Ledger</h2><div className="mt-4 space-y-2">{transactions.map(tx=><div key={tx.id} className="flex justify-between gap-3 rounded-xl border border-[#4d6a83] bg-[#0b273f] p-4">
       <div><p className="text-sm font-semibold">{tx.description}</p><p className="mt-1 text-xs text-[#a2c6dc]">{new Date(tx.created_at).toLocaleDateString()}</p></div>
       <strong className={tx.amount>0?'text-emerald-300':'text-amber-200'}>{tx.amount>0?'+':''}{tx.amount}</strong>
      </div>)}{!transactions.length&&<p className="text-sm text-[#adc5d6]">Every verified Takeover and personal contribution will appear here.</p>}</div></div>
     </section>
     <p className="mt-7 flex items-center gap-2 text-xs text-[#b8cfdd]"><FaShieldHalved/> Crew treasury funds cannot be withdrawn as cash or transferred between members. All rewards are promotional or creative, never competitive advantages.</p>
    </>}
   </div>
 </main>;
}