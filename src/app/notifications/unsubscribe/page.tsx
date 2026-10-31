'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaEnvelopeOpenText, FaCheck, FaArrowLeft } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';

type Status='ready'|'working'|'done'|'invalid'|'error';

export default function WeeklyDigestUnsubscribePage() {
  const [token,setToken]=useState('');
  const [status,setStatus]=useState<Status>('ready');
  const client=useMemo(()=>getSupabaseClient(true),[]);

  useEffect(()=>{
    const supplied=new URLSearchParams(window.location.search).get('token')??'';
    if(!/^[0-9a-f]{48}$/.test(supplied)) setStatus('invalid');
    else setToken(supplied);
    // Do not unsubscribe on page load. Email security scanners follow GET links.
  },[]);

  const unsubscribe=async()=>{
    if(!client || !token || status==='working')return;
    setStatus('working');
    try {
      const {data,error}=await (client.rpc as any)('rch_unsubscribe_weekly_digest',{p_token:token});
      if(error)throw error;
      setStatus(data===true?'done':'invalid');
      if(data===true)window.history.replaceState({},'',window.location.pathname);
    }catch{setStatus('error');}
  };

  return <main className="min-h-screen bg-[#050a11] py-16 text-white">
    <Container maxWidth="sm">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#15273b] to-[#080f18] p-8 text-center shadow-xl sm:p-12">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rcl-orange/15 text-2xl text-rcl-orange">{status==='done'?<FaCheck/>:<FaEnvelopeOpenText/>}</span>
        <p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Rich City Hoops</p>
        <h1 className="mt-3 font-display text-3xl font-black uppercase">{status==='done'?'You are unsubscribed':'Your weekly email preferences'}</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-white/65">{status==='done'?'Weekly Hoops Brief emails have been switched off. You can turn them back on any time in notification settings.':status==='invalid'?'This unsubscribe link is invalid or no longer available. Sign in to update your notification settings.':status==='error'?'We could not complete the request. Please try again or adjust your notification settings.':'Stop receiving the optional Weekly Hoops Brief, including upcoming events, news, court recaps, badges and sponsored partner highlights. Important account emails are unaffected.'}</p>
        {(status==='ready'||status==='error') && <button type="button" disabled={!token||!client} onClick={()=>void unsubscribe()} className="mt-7 min-h-12 w-full rounded-xl bg-rcl-orange px-5 text-sm font-black uppercase text-black disabled:opacity-50">Unsubscribe from weekly email</button>}
        {status==='working' && <p className="mt-7 text-sm text-white/50" role="status">Updating your preference…</p>}
        <Link href="/settings/notifications" className="mt-6 inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-wide text-rcl-blue"><FaArrowLeft/> Notification settings</Link>
      </div>
    </Container>
  </main>;
}
