'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowLeft, FaCircleCheck, FaCrown, FaShieldHalved } from 'react-icons/fa6';

type Application={
  headline:string;discipline:'cheer'|'step'|'both';
  years_experience:number|null;availability:'available'|'not_available';
  published:boolean;status:'pending'|'approved'|'rejected'
};
const empty:Application={headline:'',discipline:'both',years_experience:null,availability:'available',published:false,status:'pending'};
const field='mt-2 min-h-12 w-full rounded-xl border border-[#346b98] bg-[#061728] px-4 py-3 text-sm text-white outline-none focus:border-[#ff9a54]';
export function RoyalteeJoinForm(){
  const {user,loading:authLoading}=useAuth();
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const [ageReady,setAgeReady]=useState(false);
  const [eligible,setEligible]=useState(false);
  const [application,setApplication]=useState<Application>(empty);
  const [hasApplication,setHasApplication]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  useEffect(()=>{
    if(authLoading)return;
    if(!db||!user){setLoading(false);return;}
    let active=true;
    void Promise.all([
      db.rpc('is_my_profile_adult'),
      db.from('rcl_royaltee_cheer_profiles').select('headline,discipline,years_experience,availability,published,status').eq('profile_id',user.id).maybeSingle()
    ]).then(([profileResult,identityResult]:any[])=>{
      if(!active)return;
      if(profileResult.error){setError('Unable to verify adult eligibility. Try again.');setEligible(false);}
      else setEligible(profileResult.data===true);
      setAgeReady(true);
      if(identityResult.data){setApplication({...empty,...identityResult.data});setHasApplication(true);}
      setLoading(false);
    }).catch(()=>{if(active){setAgeReady(true);setError('Unable to verify adult eligibility. Try again.');setLoading(false);}});
    return()=>{active=false;};
  },[authLoading,db,user]);
  async function submit(event:FormEvent){
    event.preventDefault();setError('');setSuccess('');
    if(!user||!db||!eligible||busy)return;
    setBusy(true);
    const payload={
      headline:application.headline.trim(),
      discipline:application.discipline,
      years_experience:application.years_experience,
      availability:application.availability,
      published:application.published,
      updated_at:new Date().toISOString()
    };
    const {error:saveError}=hasApplication
      ? await db.from('rcl_royaltee_cheer_profiles').update(payload).eq('profile_id',user.id)
      : await db.from('rcl_royaltee_cheer_profiles').insert({profile_id:user.id,...payload});
    if(saveError)setError(saveError.message||'Unable to save your application.');
    else {setHasApplication(true);setSuccess(application.status==='approved'?'Your public performer details were saved.':'Your adult performer application has been saved for Royaltee review.');}
    setBusy(false);
  }
  return <main className="min-h-screen bg-[#050c16] pb-24 text-white">
    <section className="border-b border-[#365e87] bg-[radial-gradient(circle_at_70%_10%,rgba(255,121,41,.2),transparent_35%),linear-gradient(125deg,#0c2b50,#060e1a)]">
      <Container maxWidth="lg" className="py-11 sm:py-16">
        <Link href="/league/royaltee" className="inline-flex gap-2 text-xs font-black uppercase tracking-widest text-[#b5e2ff]"><FaArrowLeft/> Royaltee Home</Link>
        <p className="mt-7 text-xs font-black uppercase tracking-[.21em] text-[#ffa666]">Official RCL Partner · 18+ Only</p>
        <h1 className="mt-3 font-display text-4xl font-black uppercase leading-tight sm:text-6xl">Your Royaltee <span className="text-[#78c9ff]">performer profile.</span></h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-[#c6d9ea]">Use your existing RCH membership to apply for an adult Royaltee cheer or step affiliation. This is part of your regular member profile—not a new account and not an automatic league staff appointment.</p>
      </Container>
    </section>
    <Container maxWidth="lg" className="py-10">
      {authLoading||loading?<div className="rounded-2xl border border-[#345b7e] bg-[#0b2238] p-7 text-sm">Checking membership eligibility…</div>
      :!user?<div className="rounded-2xl border border-[#345b7e] bg-[#0b2238] p-7"><h2 className="text-2xl font-black">An RCH account is required.</h2><p className="mt-3 text-sm text-[#c4d8e9]">Registration is free. Existing members can sign in and add a Royaltee affiliation to their profiles.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/auth/sign-up?next=/league/royaltee/join" className="rounded-xl bg-[#fc8537] px-5 py-3 text-sm font-black text-black">Create free account</Link><Link href="/auth/sign-in?next=/league/royaltee/join" className="rounded-xl border border-[#8cc4ed] px-5 py-3 text-sm font-bold">Sign in</Link></div></div>
      :!ageReady||!eligible?<div className="rounded-2xl border border-[#855634] bg-[#302013] p-7"><FaShieldHalved className="text-3xl text-[#ffac70]"/><h2 className="mt-4 text-2xl font-black">Adult eligibility required.</h2><p className="mt-3 text-sm leading-7 text-[#f6d7c0]">Royaltee profiles on Rich City Hoops are for members age 18 and older with a completed birth date on their RCH account. Under-18 profiles, teams, events and applications cannot be included here.</p><Link href="/settings" className="mt-5 inline-flex rounded-xl border border-[#e0a677] px-5 py-3 text-sm font-bold">Account settings</Link></div>
      :<form onSubmit={submit} className="space-y-6">
        <div className="rounded-2xl border border-[#326390] bg-[#0b233b] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#ffa46a]">Adult performer identity</p><h2 className="mt-2 text-2xl font-black">Cheer + Step</h2></div><span className="rounded-full border border-[#4e90c6] px-4 py-2 text-xs font-black uppercase text-[#c6eaff]">Status: {application.status}</span></div>
          <p className="mt-4 text-sm leading-6 text-[#c3d8e9]">Royaltee leadership must approve your affiliation before it can appear publicly. You control whether your approved profile is listed.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-xs font-black uppercase tracking-wider text-[#afd4ec]">Primary discipline<select className={field} value={application.discipline} onChange={event=>setApplication({...application,discipline:event.target.value as Application['discipline']})}><option value="both">Cheer and Step</option><option value="cheer">Cheerleading</option><option value="step">Stepping</option></select></label>
            <label className="text-xs font-black uppercase tracking-wider text-[#afd4ec]">Years of experience<input className={field} type="number" min="0" max="60" value={application.years_experience??''} onChange={event=>setApplication({...application,years_experience:event.target.value===''?null:Number(event.target.value)})}/></label>
          </div>
          <label className="mt-5 block text-xs font-black uppercase tracking-wider text-[#afd4ec]">Short performer headline<input className={field} maxLength={120} value={application.headline} onChange={event=>setApplication({...application,headline:event.target.value})} placeholder="Stepping with confidence. Performing with purpose."/></label>
          <label className="mt-5 block text-xs font-black uppercase tracking-wider text-[#afd4ec]">Availability<select className={field} value={application.availability} onChange={event=>setApplication({...application,availability:event.target.value as Application['availability']})}><option value="available">Open to opportunities</option><option value="not_available">Not available currently</option></select></label>
          <label className="mt-6 flex gap-3 rounded-xl border border-[#2b5b87] bg-[#061b30] p-4 text-sm text-white"><input type="checkbox" checked={application.published} onChange={event=>setApplication({...application,published:event.target.checked})} className="mt-1 h-5 w-5 accent-[#ff8f46]"/><span><strong>Show my affiliation publicly after approval.</strong><span className="mt-1 block text-xs leading-5 text-[#aacce1]">Only when your normal RCH profile is public and Royaltee has approved you. No birth date will be shown.</span></span></label>
          <p className="mt-5 flex items-start gap-2 text-xs leading-6 text-[#abc7de]"><FaCrown className="mt-1 shrink-0 text-[#ffac72]"/>Royaltee manages its own acceptance, tryouts, uniforms and opportunities. An RCH affiliation request is not a performance booking.</p>
        </div>
        {error&&<p role="alert" className="rounded-xl border border-red-500/50 bg-red-950/40 p-4 text-sm text-red-200">{error}</p>}
        {success&&<p role="status" className="flex gap-2 rounded-xl border border-[#3c8e87] bg-[#0b3330] p-4 text-sm text-[#b4f6eb]"><FaCircleCheck/>{success}</p>}
        <div className="flex flex-wrap items-center gap-4"><button type="submit" disabled={busy} className="min-h-12 rounded-xl bg-[#ff8a35] px-6 text-sm font-black text-[#1e0f06] disabled:opacity-50">{busy?'Saving…':application.status==='approved'?'Save performer profile':'Submit / update adult application'}</button><Link href={'/social/profile/'+user.id} className="text-sm font-bold text-[#94d5ff]">View my RCH profile →</Link></div>
      </form>}
    </Container>
  </main>;
}
