'use client';

import Link from 'next/link';
import {useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {FaArrowLeft,FaCheckCircle,FaEnvelope,FaShieldHalved} from 'react-icons/fa6';

type Purpose='training'|'program'|'event'|'general';
const options:ReadonlyArray<{id:Purpose;label:string;detail:string}>=[
  {id:'training',label:'Training',detail:'Sessions, coaching or skill development'},
  {id:'program',label:'Program / tryouts',detail:'Learn about a team, club or upcoming tryouts'},
  {id:'event',label:'Camp / event',detail:'Ask about an upcoming event'},
  {id:'general',label:'Something else',detail:'General organization information'},
];

export function RchSiteInquiryClient({slug,organizationName}:{slug:string;organizationName:string}){
  const {user,loading:authLoading}=useAuth();
  const [purpose,setPurpose]=useState<Purpose>('program');
  const [consent,setConsent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  const [error,setError]=useState('');
  const submit=async()=>{
    if(busy||!user||!consent)return;
    setBusy(true);setError('');
    try{
      const res=await fetch('/api/rch-sites/inquiries',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'submit',slug,purpose,contactConsent:consent}),
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw Error(data.error||'Unable to submit inquiry.');
      setSent(true);
    }catch(e){setError(e instanceof Error?e.message:'Unable to submit inquiry.');}
    finally{setBusy(false);}
  };
  return <main className="min-h-svh bg-[#0b0c12] px-4 pb-16 pt-8 text-white sm:px-7">
    <div className="mx-auto max-w-xl">
      <Link href={'/sites/'+slug} className="inline-flex min-h-11 items-center gap-2 text-sm text-white/65"><FaArrowLeft/> Back to website</Link>
      <div className="mt-7 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rose-300">
        <FaEnvelope/> Organization contact
      </div>
      <h1 className="mt-3 text-4xl font-black">Get connected.</h1>
      <p className="mt-3 text-sm leading-7 text-white/65">Tell {organizationName} what you&apos;re interested in. They can reply to the email address verified on your RCH account.</p>
      {sent?<section role="status" className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-900/10 p-6">
        <FaCheckCircle size={30} className="text-emerald-300"/>
        <h2 className="mt-4 text-2xl font-black">Inquiry received</h2>
        <p className="mt-2 text-sm leading-7 text-white/70">{organizationName} can now follow up by email. This is not a confirmed registration, reservation, or payment.</p>
        <Link href={'/sites/'+slug} className="mt-5 inline-flex rounded-xl border border-white/25 px-5 py-3 text-sm font-bold">Return to website</Link>
      </section>:<>
        {authLoading?<p role="status" className="mt-8 text-sm text-white/65">Checking your account…</p>:!user?
          <section className="mt-7 rounded-2xl border border-rose-400/25 p-5">
            <p className="text-sm text-white/75">Sign in with your RCH account to send an inquiry securely.</p>
            <Link href={'/auth/sign-in?next='+encodeURIComponent('/sites/'+slug+'/inquire')}
              className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-rose-600 px-5 text-sm font-black">Sign in / Join Free</Link>
          </section>:<>
          <fieldset className="mt-8">
            <legend className="text-base font-black">What can we help with?</legend>
            <div className="mt-4 grid gap-3">
              {options.map(opt=><label key={opt.id} className={'flex cursor-pointer gap-3 rounded-xl border p-4 '+(purpose===opt.id?'border-rose-400 bg-rose-600/10':'border-white/15')}>
                <input type="radio" name="purpose" className="mt-1 h-4 w-4 accent-rose-500" checked={purpose===opt.id} onChange={()=>setPurpose(opt.id)}/>
                <span><b className="block text-sm">{opt.label}</b><span className="mt-1 block text-xs text-white/60">{opt.detail}</span></span>
              </label>)}
            </div>
          </fieldset>
          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 p-4">
            <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-rose-500"/>
            <span className="text-sm leading-6 text-white/75">I&apos;m at least 18 and agree to share my verified account email with {organizationName} so they can contact me about this inquiry.</span>
          </label>
          <p className="mt-3 flex items-start gap-2 text-xs leading-6 text-amber-100/75"><FaShieldHalved className="mt-1 shrink-0"/> This is only an interest request. Do not submit children&apos;s names, health details, or other private athlete information. Guardian registration tools are not enabled yet.</p>
          {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-400/30 p-4 text-sm text-rose-200">{error}</p>}
          <button type="button" disabled={!consent||busy} onClick={()=>void submit()}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-rose-600 px-5 text-sm font-black disabled:opacity-40">
            {busy?'Sending…':'Send inquiry'}
          </button>
        </>}
      </>}
      <div className="mt-10 border-t border-white/15 pt-6 text-xs text-white/50">
        No payment is collected. This form does not book sessions or confirm program registration.
      </div>
      <Link href="/" className="mt-4 inline-block text-xs font-black text-white/60">Powered by Rich City Hoops</Link>
    </div>
  </main>;
}
