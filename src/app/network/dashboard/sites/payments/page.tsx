'use client';
import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {Container} from '@/components/Container';
import {useAuth} from '@/hooks/useAuth';
import {FaArrowLeft,FaArrowUpRightFromSquare,FaCircleCheck,FaCreditCard,FaLink,FaPlus,FaXmark} from 'react-icons/fa6';

type Org={id:string;name:string;member_role:string;eligible:boolean};
type Offering={id:string;title:string;description:string;amount_cents:number;currency:string;payment_url:string;active:boolean};
const field='mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#171923] p-3 text-sm text-white focus:border-rose-400 focus:outline-none';
const amount=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value/100);
export default function PayPalPaymentLinksManager(){
  const {user,loading:authLoading}=useAuth();
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [selected,setSelected]=useState('');
  const [offerings,setOfferings]=useState<Offering[]>([]);
  const [form,setForm]=useState({title:'',description:'',amount:'',paymentUrl:''});
  const [busy,setBusy]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const loadOrgs=useCallback(async()=>{
    const res=await fetch('/api/rch-sites',{cache:'no-store'});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(data.error||'Unable to load organizations.');
    const approved=(data.organizations??[]).filter((org:Org)=>org.eligible&&['owner','manager'].includes(org.member_role));
    setOrgs(approved);
    setSelected(current=>current||approved[0]?.id||'');
  },[]);
  const loadLinks=useCallback(async(orgId:string)=>{
    const res=await fetch('/api/rch-sites/paypal?organizationId='+encodeURIComponent(orgId),{cache:'no-store'});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(data.error||'Unable to load links.');
    setOfferings(data.offerings??[]);
  },[]);
  useEffect(()=>{
    if(authLoading)return;
    if(!user){setLoading(false);return;}
    void loadOrgs().catch(e=>setError(e instanceof Error?e.message:'Unable to load organizations.'))
      .finally(()=>setLoading(false));
  },[authLoading,user,loadOrgs]);
  useEffect(()=>{
    if(!selected){setOfferings([]);return;}
    void loadLinks(selected).catch(e=>setError(e instanceof Error?e.message:'Unable to load payment links.'));
  },[selected,loadLinks]);
  const act=async(action:'create'|'deactivate',offeringId?:string)=>{
    if(busy||!selected)return;
    setBusy(action);setError('');setMessage('');
    try{
      const decimal=Number(form.amount);
      const cents=Math.round(decimal*100);
      if(action==='create'&&(!Number.isFinite(decimal)||decimal<=0||Math.abs(decimal*100-cents)>0.001))
        throw Error('Enter a valid amount in US dollars.');
      const res=await fetch('/api/rch-sites/paypal',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({organizationId:selected,action,...(action==='create'
          ?{title:form.title,description:form.description,amountCents:cents,paymentUrl:form.paymentUrl}
          :{offeringId})})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw Error(data.error||'Unable to save changes.');
      setMessage(action==='create'?'Your link is now visible on your published site.':'Payment link disabled.');
      if(action==='create')setForm({title:'',description:'',amount:'',paymentUrl:''});
      await loadLinks(selected);
    }catch(e){setError(e instanceof Error?e.message:'Unable to save payment link.');}
    finally{setBusy('');}
  };
  if(loading||authLoading)return <Shell><p role="status" className="text-white/70">Loading your payment links…</p></Shell>;
  if(!user)return <Shell><h1 className="text-3xl font-black">Sign in to manage your links.</h1>
    <Link href="/auth/sign-in?next=/network/dashboard/sites/payments" className="mt-5 inline-block rounded-xl bg-rose-600 px-5 py-3 font-black">Sign in</Link></Shell>;
  return <Shell>
    <Link href="/network/dashboard/sites" className="inline-flex items-center gap-2 text-sm text-white/60"><FaArrowLeft/> Website Studio</Link>
    <p className="mt-7 text-xs font-black uppercase tracking-[.15em] text-rose-400">RCH Sites · Independent payments</p>
    <h1 className="mt-2 text-4xl font-black">Your PayPal. Your earnings.</h1>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">Create your payment link in your own PayPal Business account. Add it here so visitors can pay you directly on PayPal. RCH never asks for your password, links its merchant account, or receives those payments.</p>
    <div className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-400/5 p-4 text-xs leading-6 text-amber-100">
      <b>Important:</b> Any RCH website subscription will be billed separately by RCH, not through your PayPal account. Links on this screen cannot verify payments, confirm paid bookings, or issue refunds. Confirm all funds, recipient and prices in your own PayPal account.
    </div>
    {orgs.length===0?<p className="mt-8 text-sm text-white/70">An approved organization owner or manager must sign in to add PayPal links.</p>:<>
      <label className="mt-7 block max-w-lg text-sm font-bold">Organization
        <select className={field} value={selected} onChange={e=>{setSelected(e.target.value);setError('');setMessage('');}}>
          {orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/15 bg-white/5 p-5">
          <h2 className="flex items-center gap-2 text-xl font-black"><FaCreditCard className="text-rose-400"/> 1 · Set up in PayPal</h2>
          <p className="mt-4 text-sm leading-7 text-white/70">Sign in directly on PayPal, create a fixed-price Payment Link for a training session, camp, or registration fee, then copy its full URL.</p>
          <a href="https://www.paypal.com/us/business/accept-payments/payment-links" target="_blank" rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/30 px-5 text-sm font-black">Open PayPal <FaArrowUpRightFromSquare/></a>
          <p className="mt-3 text-xs leading-6 text-white/50">The link should start with www.paypal.com/ncp/payment/. Only official PayPal Business Payment Links are accepted.</p>
        </section>
        <section className="rounded-2xl border border-white/15 bg-white/5 p-5">
          <h2 className="flex items-center gap-2 text-xl font-black"><FaLink className="text-rose-400"/> 2 · Add your payment link</h2>
          <label className="mt-5 block text-xs font-bold">What is this payment for?
            <input className={field} maxLength={90} value={form.title} placeholder="One-on-one training" onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
          </label>
          <label className="mt-4 block text-xs font-bold">Details (optional)
            <textarea className={field} maxLength={350} rows={2} value={form.description} placeholder="What the customer gets" onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
          </label>
          <label className="mt-4 block text-xs font-bold">Amount shown on RCH (USD)
            <input className={field} type="number" inputMode="decimal" min="1" max="10000" step="0.01" value={form.amount} placeholder="40.00" onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
          </label>
          <label className="mt-4 block text-xs font-bold">Your PayPal Business Payment Link
            <input className={field} type="url" maxLength={240} autoComplete="off" value={form.paymentUrl} placeholder="https://www.paypal.com/ncp/payment/..." onChange={e=>setForm(f=>({...f,paymentUrl:e.target.value}))}/>
          </label>
          <p className="mt-3 text-xs leading-6 text-white/55">Set the exact same price and item details in PayPal. RCH does not control the PayPal checkout amount or verify the receiving account.</p>
          <button type="button" disabled={Boolean(busy)||!form.title||!form.amount||!form.paymentUrl}
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-black disabled:opacity-40"
            onClick={()=>void act('create')}><FaPlus/> {busy==='create'?'Saving…':'Add link'}</button>
        </section>
      </div>
      {message&&<p role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-400/30 p-4 text-sm text-emerald-200"><FaCircleCheck/>{message}</p>}
      {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-400/30 p-4 text-sm text-rose-200">{error}</p>}
      <section className="mt-7 rounded-2xl border border-white/15 bg-white/5 p-5">
        <h2 className="text-xl font-black">Your payment links</h2>
        <p className="mt-2 text-xs text-white/55">Up to 12 active links. Each link takes visitors to your own external PayPal checkout.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {offerings.filter(o=>o.active).length===0&&<p className="text-sm text-white/60">No active links yet.</p>}
          {offerings.filter(o=>o.active).map(o=><article key={o.id} className="rounded-xl border border-white/20 p-4">
            <b className="text-sm">{o.title}</b>
            <p className="mt-1 text-sm text-white/70">{amount(o.amount_cents)}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <a href={o.payment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">View PayPal <FaArrowUpRightFromSquare/></a>
              <button type="button" disabled={Boolean(busy)} onClick={()=>void act('deactivate',o.id)}
                className="inline-flex items-center gap-1 text-rose-300 underline disabled:opacity-50"><FaXmark/> Disable</button>
            </div>
          </article>)}
        </div>
      </section>
    </>}
  </Shell>;
}
function Shell({children}:{children:React.ReactNode}){
  return <main className="min-h-screen bg-[#0b0c10] pb-28 text-white">
    <Container maxWidth="xl" className="py-8 sm:py-12">{children}</Container>
  </main>;
}
