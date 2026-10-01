'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FaArrowRight, FaBasketball, FaCompass, FaLock, FaShieldHalved, FaUser } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';

function safeNext(raw:string|null) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/social';
  return raw;
}

export default function MemberAccessPage() {
  const params = useSearchParams();
  const { user, profile, loading } = useAuth();
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  const next = safeNext(params.get('next'));
  const inactive = params.get('inactive') === '1';
  const needsProfile = Boolean(user && !profile && !loading);

  return <main className="fixed inset-0 z-[9999] overflow-y-auto bg-[#090D12] text-white">
    <div className={`pointer-events-none fixed inset-0 z-20 grid place-items-center bg-[#090D12] transition-all duration-500 ${intro ? 'opacity-100' : 'scale-[1.02] opacity-0'}`} aria-hidden={!intro}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,106,0,.12),transparent_28%)]" />
      <div className="relative text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-white/10 bg-[#111820] text-4xl font-black text-rcl-orange shadow-xl">R</div>
        <p className="mt-6 text-xs font-black uppercase tracking-[.45em] text-white/45">Rich City League</p>
        <h1 className="mt-3 font-display text-5xl font-black uppercase leading-none sm:text-7xl">Your basketball<br/><span className="text-rcl-orange">workspace.</span></h1>
      </div>
    </div>

    <div className={`relative min-h-screen transition-opacity duration-500 ${intro ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,106,0,.08),transparent_26%),linear-gradient(135deg,#111820_0%,#090D12_62%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-5 py-12 sm:px-8">
        <section className="grid w-full gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.025] px-3 py-1.5 text-[11px] font-black uppercase tracking-[.2em] text-white/55"><FaShieldHalved/> Member workspace</p>
            <h2 className="mt-6 max-w-3xl font-display text-5xl font-black uppercase leading-[.9] sm:text-7xl lg:text-8xl">Virginia basketball<br/><span className="text-rcl-orange">gets personal here.</span></h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/55">Most of RCL is open to browse. Sign in when you want the tools tied to your identity: Social, My Hoops, messages, saved basketball, profile management, REP and member-only workspaces.</p>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-[#111820]/80 p-4"><FaBasketball className="text-rcl-orange"/><b className="mt-3 block text-sm uppercase">Your basketball</b><small className="mt-1 block text-white/40">My Hoops, saves, Runs</small></div>
              <div className="rounded-2xl border border-white/8 bg-[#111820]/80 p-4"><FaUser className="text-white/65"/><b className="mt-3 block text-sm uppercase">Your identity</b><small className="mt-1 block text-white/40">Profile, Passport, REP</small></div>
              <div className="rounded-2xl border border-white/8 bg-[#111820]/80 p-4"><FaLock className="text-white/65"/><b className="mt-3 block text-sm uppercase">Private tools</b><small className="mt-1 block text-white/40">Messages and account actions</small></div>
            </div>
            <Link href="/network" className="mt-6 inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-wider text-white/50 hover:text-white">Browse the public RCL Network <FaCompass/></Link>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#111820]/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            {loading ? <div className="space-y-4"><div className="h-5 w-28 animate-pulse rounded bg-white/10"/><div className="h-12 animate-pulse rounded-xl bg-white/10"/><div className="h-12 animate-pulse rounded-xl bg-white/10"/></div> : inactive ? <>
              <p className="text-xs font-black uppercase tracking-[.2em] text-red-300">Account unavailable</p>
              <h3 className="mt-3 font-display text-3xl font-black uppercase">Your RCL profile is inactive.</h3>
              <p className="mt-3 text-sm leading-6 text-white/45">This account cannot enter member-only workspaces right now. Public RCL pages remain available while you contact league administration if you believe access should be restored.</p>
              <Link href="/auth/sign-in" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-5 text-xs font-black uppercase tracking-wider">Return to sign in <FaArrowRight/></Link>
            </> : needsProfile ? <>
              <p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">One step left</p>
              <h3 className="mt-3 font-display text-3xl font-black uppercase">Build your RCL profile.</h3>
              <p className="mt-3 text-sm leading-6 text-white/45">Your account is signed in. Create your basketball identity so RCL can personalize your member workspace and connect activity to you.</p>
              <Link href={`/profile?next=${encodeURIComponent(next)}`} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Create profile <FaArrowRight/></Link>
            </> : profile ? <>
              <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">Access verified</p>
              <h3 className="mt-3 font-display text-3xl font-black uppercase">Welcome back.</h3>
              <p className="mt-3 text-sm leading-6 text-white/45">Your RCL member workspace is ready.</p>
              <Link href={next} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Continue <FaArrowRight/></Link>
            </> : <>
              <p className="text-xs font-black uppercase tracking-[.2em] text-white/45">Member sign in</p>
              <h3 className="mt-3 font-display text-3xl font-black uppercase">Sign in to continue.</h3>
              <p className="mt-3 text-sm leading-6 text-white/45">You opened a member-only RCL workspace. Sign in or create an account to continue; public league, Network, organization, event, news and media pages remain open to browse.</p>
              <Link href={`/auth/sign-in?next=${encodeURIComponent(next)}`} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Sign in <FaArrowRight/></Link>
              <Link href="/auth/sign-up" className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-5 text-xs font-black uppercase tracking-wider">Create an account <FaArrowRight/></Link>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-5"><Link href="/auth/forgot-password" className="text-xs font-bold text-white/35 hover:text-white">Forgot password?</Link><Link href="/network" className="text-xs font-bold text-white/35 hover:text-white">Browse RCL</Link></div>
            </>}
          </div>
        </section>
      </div>
    </div>
  </main>;
}
