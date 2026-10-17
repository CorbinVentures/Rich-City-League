'use client';

import Link from 'next/link';
import '../../app/rch-identity.css';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaArrowTrendUp,FaBolt,FaCheck,FaCoins,FaClockRotateLeft,FaGift,FaShieldHalved,FaXmark} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';

type Reward={code:string;title:string;description:string;category:string;price:number;requires_post:boolean;delivery:string;duration_hours:number|null};
type Wallet={balance:number;lifetime_earned:number};
type Transaction={id:string;amount:number;kind:string;detail:string;created_at:string};
type Order={id:string;reward_code:string;price_paid:number;status:string;region:string;purchased_at:string;expires_at:string|null;review_note:string|null};
type MyPost={id:string;body:string;created_at:string};
const regionChoices=[
 {value:'virginia',label:'Across Virginia'},{value:'richmond',label:'Richmond'},
 {value:'central-virginia',label:'Central Virginia'},{value:'tri-cities',label:'Tri-Cities'},
 {value:'hampton-roads',label:'Hampton Roads'},{value:'northern-virginia',label:'Northern Virginia'},
 {value:'shenandoah',label:'Shenandoah'},{value:'southwest-virginia',label:'Southwest Virginia'}
];
const costs=(n:number)=>Number(n).toLocaleString()+' REP';

export default function RepExchangeClient(){
 const {user,loading:authLoading}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [wallet,setWallet]=useState<Wallet>({balance:0,lifetime_earned:0});
 const [rewards,setRewards]=useState<Reward[]>([]);
 const [transactions,setTransactions]=useState<Transaction[]>([]);
 const [orders,setOrders]=useState<Order[]>([]);
 const [posts,setPosts]=useState<MyPost[]>([]);
 const [selectedPost,setSelectedPost]=useState('');
 const [region,setRegion]=useState('richmond');
 const [selected,setSelected]=useState<Reward|null>(null);
 const [tab,setTab]=useState<'store'|'orders'|'ledger'>('store');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [loaded,setLoaded]=useState(false);

 const reload=useCallback(async()=>{
  if(!db)return;
  const [{data:catalog},{data:cash},{data:tx},{data:history},{data:myPosts}]=await Promise.all([
   db.from('rch_rep_rewards').select('code,title,description,category,price,requires_post,delivery,duration_hours').eq('available',true).order('price'),
   user?db.from('rch_rep_wallets').select('balance,lifetime_earned').eq('profile_id',user.id).maybeSingle():Promise.resolve({data:null}),
   user?db.from('rch_rep_transactions').select('id,amount,kind,detail,created_at').eq('profile_id',user.id).order('created_at',{ascending:false}).limit(35):Promise.resolve({data:[]}),
   user?db.from('rch_rep_orders').select('id,reward_code,price_paid,status,region,purchased_at,expires_at,review_note').eq('profile_id',user.id).order('purchased_at',{ascending:false}).limit(30):Promise.resolve({data:[]}),
   user?db.from('posts').select('id,body,created_at').eq('author_id',user.id).eq('status','published').eq('is_automated',false).order('created_at',{ascending:false}).limit(25):Promise.resolve({data:[]})
  ]);
  setRewards((catalog??[]) as Reward[]);setWallet((cash??{balance:0,lifetime_earned:0}) as Wallet);
  setTransactions((tx??[]) as Transaction[]);setOrders((history??[]) as Order[]);
  setPosts((myPosts??[]) as MyPost[]);setLoaded(true);
 },[db,user?.id]);
 useEffect(()=>{void reload();},[reload]);
 const redeem=async()=>{
  if(!db||!user||!selected||busy)return;
  setBusy(true);setNotice('');setError('');
  const {error:failure}=await db.rpc('rch_buy_rep_reward',{
   p_code:selected.code,p_post:selected.requires_post?selectedPost:null,p_region:region
  });
  if(failure)setError(failure.message);
  else{
   setNotice(selected.delivery==='instant'
    ? 'Unlocked! Your reward is now active.'
    : 'Redeemed! Your request is reserved and awaiting RCH fulfillment review.');
   setSelected(null);setSelectedPost('');await reload();
  }
  setBusy(false);
 };
 const cancel=async(id:string)=>{
  if(!db||busy)return;
  setBusy(true);setError('');setNotice('');
  const {error:failure}=await db.rpc('rch_cancel_rep_reward',{p_order:id});
  if(failure)setError(failure.message);
  else {setNotice('Order cancelled; the original REP amount was returned to your wallet.');await reload();}
  setBusy(false);
 };
 const requestedRewards=orders.filter(o=>!['cancelled','refunded'].includes(o.status)).length;
 return <main className="rch-identity-surface min-h-screen bg-[#061322] pb-24 text-white">
  <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-7">
   <Link href="/badges" className="text-xs font-bold text-[#9bdbff]">← Trophy Case</Link>
   <header className="rch-identity-hero mt-6 p-6 sm:p-9">
    <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-[#96d7ff]"><FaBolt/> RCH Economy · Spend Your Influence</p>
    <h1 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">REP <span className="text-[#74c9ff]">Exchange.</span></h1>
    <p className="mt-3 max-w-2xl text-sm text-[#b7d5e9]">Earn from real hoops, creativity and community. Redeem REP for approved promotions, player media, identity perks and crew exposure. Your lifetime reputation and court rankings never go down when you spend.</p>
    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
      <div className="rch-identity-wallet-stat">
       <p className="flex items-center gap-2 text-[11px] font-bold uppercase text-[#9acde9]"><FaCoins/> Spendable wallet</p>
       <p className="mt-2 text-3xl font-black tabular-nums">{Number(wallet.balance).toLocaleString()}</p>
       <p className="text-xs text-[#a8d1ea]">REP available</p>
      </div>
      <div className="rch-identity-wallet-stat">
       <p className="flex items-center gap-2 text-[11px] font-bold uppercase text-[#9acde9]"><FaArrowTrendUp/> Lifetime earned</p>
       <p className="mt-2 text-3xl font-black tabular-nums">{Number(wallet.lifetime_earned).toLocaleString()}</p>
       <p className="text-xs text-[#a8d1ea]">Career wallet earnings</p>
      </div>
      <div className="rch-identity-wallet-stat col-span-2 lg:col-span-1">
       <p className="flex items-center gap-2 text-[11px] font-bold uppercase text-[#9acde9]"><FaGift/> Rewards requested</p>
       <strong className="mt-2">{requestedRewards}</strong>
       <small>Non-cancelled reward requests · check fulfillment below</small>
      </div>
    </div>
    <div className="rch-identity-actions mt-5"><button type="button" onClick={()=>setTab('store')} className="rch-identity-primary"><FaGift/> Browse rewards</button><button type="button" onClick={()=>setTab('ledger')} className="rch-identity-secondary">See REP receipts</button></div>
   </header>
   {notice&&<p role="status" className="mt-5 rounded-xl border border-emerald-400/40 bg-[#102c35] p-4 text-sm text-[#aaf2d8]">{notice}</p>}
   {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-400/40 bg-[#3b202b] p-4 text-sm text-[#ffd0d0]">{error}</p>}
   {!authLoading&&!user&&<p className="mt-5 rounded-xl border border-[#416587] p-4 text-sm">You can explore the catalog now. <Link className="font-bold text-[#96daff] underline" href="/auth/sign-in?next=%2Frep">Sign in</Link> to view and spend REP.</p>}
   <nav aria-label="REP Exchange sections" className="mt-7 flex flex-wrap gap-2">{([
    ['store','Reward Shop',FaGift],['orders','My Redemptions',FaCheck],['ledger','Transaction History',FaClockRotateLeft]
   ] as const).map(([key,label,Icon])=><button key={key} onClick={()=>setTab(key)}
      aria-current={tab===key?'page':undefined} className={'flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold '+(tab===key?'border-[#74caff] bg-[#20537b]':'border-[#3a5b78] bg-[#0b2236] text-[#afc9db]')}><Icon/>{label}</button>)}</nav>
   {tab==='store'&&<section className="mt-6">
     <div className="flex flex-wrap items-center justify-between gap-2">
       <h2 className="font-display text-2xl font-black uppercase">Redeem REP</h2>
       <p className="text-xs text-[#a8bcd0]">{rewards.length} launch rewards · never pay-to-win</p>
     </div>
     <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rewards.map(reward=><article key={reward.code} className="rch-identity-reward flex flex-col justify-between gap-4 p-5">
       <div>
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9cd3f5]">{reward.category} · {reward.delivery==='instant'?'Instant unlock':'Fulfillment review'}</p>
        <h3 className="mt-3 font-display text-xl font-black">{reward.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#b1cbde]">{reward.description}</p>
        {reward.duration_hours&&<p className="mt-2 text-xs text-[#8ec1df]">{reward.duration_hours===720?'30 days':reward.duration_hours+' hours'} after activation</p>}
        {user&&reward.price>0&&<div className="mt-4"><div className="flex justify-between gap-2 text-xs text-[#bbd9ef]"><span>Wallet readiness</span><strong>{Number(wallet.balance)>=reward.price?'Ready to redeem':costs(Math.max(0,reward.price-Number(wallet.balance)))+' needed'}</strong></div><div className="rch-identity-capacity mt-2"><span style={{width:Math.max(0,Math.min(100,(Number(wallet.balance)/reward.price)*100))+'%'}}/></div></div>}
       </div>
       <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#3d5d77] pt-4">
        <strong className="text-lg text-[#ffdf9b]">{costs(reward.price)}</strong>
        <button type="button" onClick={()=>{setSelected(reward);setSelectedPost('');setError('');}} disabled={!user||wallet.balance<reward.price}
          className="min-h-11 rounded-xl bg-[#67b8f0] px-4 text-xs font-black text-[#061d2e] disabled:cursor-not-allowed disabled:opacity-35">Redeem</button>
       </div>
      </article>)}
     </div>
     {!loaded&&<p className="mt-5 text-sm text-[#a2bfd7]">Loading REP rewards…</p>}
   </section>}
   {tab==='orders'&&<section className="mt-6">
     <h2 className="text-xl font-black uppercase">Your Rewards</h2>
     <div className="mt-4 space-y-3">{orders.map(o=><article key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#3c6082] bg-[#0c243a] p-4">
      <div><p className="font-bold">{rewards.find(r=>r.code===o.reward_code)?.title??o.reward_code.replaceAll('_',' ')}</p><p className="mt-1 text-xs text-[#a6c9e0]">{o.status.replaceAll('_',' ')} · {new Date(o.purchased_at).toLocaleDateString()} · {costs(o.price_paid)}</p>
      {o.expires_at&&<p className="mt-1 text-xs text-[#9fc3d8]">Expires {new Date(o.expires_at).toLocaleDateString()}</p>}
      {o.review_note&&<p className="mt-2 max-w-xl whitespace-pre-wrap text-xs leading-5 text-[#d1e5f1]">RCH fulfillment note: {o.review_note}</p>}</div>
      {o.status==='pending_review'&&<button type="button" disabled={busy} onClick={()=>void cancel(o.id)} className="min-h-10 rounded-lg border border-[#a5adc0] px-3 text-xs font-bold disabled:opacity-50">Cancel &amp; refund</button>}
     </article>)}{orders.length===0&&<p className="rounded-xl border border-dashed border-[#3c6082] p-6 text-sm text-[#acc9dd]">Your first REP reward will appear here.</p>}</div>
   </section>}
   {tab==='ledger'&&<section className="mt-6">
      <h2 className="text-xl font-black uppercase">Every REP Has a Receipt</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[#3c6082] bg-[#0b2237]">
       {transactions.map(t=><div key={t.id} className="flex items-center justify-between gap-3 border-b border-[#31516e] px-4 py-3 last:border-0">
        <div><p className="text-sm font-semibold">{t.detail}</p><p className="mt-1 text-[11px] text-[#9ab6cb]">{t.kind} · {new Date(t.created_at).toLocaleDateString()}</p></div>
        <span className={'shrink-0 font-bold tabular-nums '+(t.amount>0?'text-emerald-300':'text-[#ffdaab]')}>{t.amount>0?'+':''}{t.amount}</span>
       </div>)}
       {!transactions.length&&<p className="p-6 text-sm text-[#afc9dc]">Verified earnings, purchases and refunds will appear here.</p>}
      </div>
   </section>}
   <p className="mt-8 flex items-start gap-2 text-xs leading-6 text-[#aec6d9]"><FaShieldHalved className="mt-1 shrink-0"/> All promoted content is labeled. Promotions require review; redeeming REP does not guarantee impressions, athletic awards, followers or access to competitive titles. Pending rewards can be cancelled for a full REP refund.</p>
  </div>
  {selected&&<div role="presentation" className="fixed inset-0 z-[110] grid place-items-center bg-[#030b16]/90 p-4">
   <section role="dialog" aria-modal="true" aria-labelledby="rch-rep-redeem-title" className="w-full max-w-lg rounded-3xl border border-[#6186a2] bg-[#102b42] p-6 text-white shadow-2xl">
    <div className="flex items-center justify-between gap-3"><h2 id="rch-rep-redeem-title" className="text-xl font-black">{selected.title}</h2><button aria-label="Close redemption" onClick={()=>setSelected(null)}><FaXmark/></button></div>
    <p className="mt-3 text-sm text-[#bfd7e6]">{selected.description}</p>
    <div className="mt-4 rounded-xl border border-[#4d839f] bg-[#0b2239] p-4 text-sm"><div className="flex justify-between gap-2"><span className="text-[#c0d9eb]">Reward cost</span><strong className="text-[#ffe0a5]">{costs(selected.price)}</strong></div><div className="mt-2 flex justify-between gap-2"><span className="text-[#c0d9eb]">Wallet after redemption</span><strong>{Math.max(0,Number(wallet.balance)-selected.price).toLocaleString()} REP</strong></div><p className="mt-3 text-xs leading-5 text-[#b0cadb]">You are spending available REP only. This does not reduce verified basketball rankings or permanent achievements.</p></div>
    {selected.requires_post&&<label className="mt-5 block text-xs font-bold">Your published post
     <select value={selectedPost} onChange={e=>setSelectedPost(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[#5f849a] bg-[#091b2c] px-3 text-sm">
      <option value="">Select a post</option>{posts.map(p=><option key={p.id} value={p.id}>{p.body.slice(0,95)||'Media post'} · {new Date(p.created_at).toLocaleDateString()}</option>)}
     </select></label>}
    {selected.requires_post&&<label className="mt-4 block text-xs font-bold">Target area
     <select value={region} onChange={e=>setRegion(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[#5f849a] bg-[#091b2c] px-3 text-sm">
      {regionChoices.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
     </select></label>}
    <div className="mt-5 flex justify-between gap-2 rounded-xl border border-[#4b718e] p-3 text-sm"><span>Wallet after redemption</span><strong>{costs(wallet.balance-selected.price)}</strong></div>
    <button type="button" disabled={busy||wallet.balance<selected.price||(selected.requires_post&&!selectedPost)} onClick={()=>void redeem()} className="mt-5 min-h-12 w-full rounded-xl bg-[#80c6f8] font-black text-[#092137] disabled:opacity-40">{busy?'Processing…':'Confirm '+costs(selected.price)}</button>
    <p className="mt-3 text-center text-xs text-[#b3cadd]">{selected.delivery==='instant'?'Unlocks immediately.':'REP will be reserved now. RCH must approve fulfillment.'}</p>
   </section>
  </div>}
 </main>;
}
