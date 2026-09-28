'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FaArrowRight, FaBasketball, FaLock, FaShieldHalved, FaUser } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';

export default function MemberAccessPage() {
  const params = useSearchParams();
  const { user, profile, loading } = useAuth();
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 1450);
    return () => window.clearTimeout(timer);
  }, []);

  const next = params.get('next') || '/social';
  const inactive = params.get('inactive') === '1';
  const needsProfile = Boolean(user && !profile && !loading);

  return <main className="fixed inset-0 z-[9999] overflow-y-auto bg-[#02060b] text-white">
    <div className={`pointer-events-none fixed inset-0 z-20 grid place-items-center bg-[#02060b] transition-all duration-700 ${intro ? 'opacity-100' : 'scale-105 opacity-0'}`} aria-hidden={!intro}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(21,159,255,.18),transparent_28%),radial-gradient(circle_at_62%_62%,rgba(255,79,22,.14),transparent_24%)]" />
      <div className="relative text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-rcl-blue/35 bg-rcl-blue/10 text-4xl font-black text-rcl-blue shadow-[0_0_60px_rgba(21,159,255,.18)]">R</div>
        <p className="mt-6 text-xs font-black uppercase tracking-[.45em] text-rcl-orange">Rich City League</p>
        <h1 className="mt-3 font-display text-5xl font-black uppercase leading-none sm:text-7xl">Enter the<br/><span className="text-rcl-blue">Network.</span></h1>
        <div className="mx-auto mt-7 h-px w-40 overflow-hidden bg-white/10"><div className="h-full animate-[pulse_1.1s_ease-in-out_infinite] bg-rcl-orange" /></div>
      </div>
    </div>

    <div className={`relative min-h-screen transition-opacity duration-700 ${intro ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,79,22,.16),transparent_28%),radial-gradient(circle_at_12%_72%,rgba(21,159,255,.16),transparent_34%),linear-gradient(135deg,#071522_0%,#02060b_62%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-5 py-12 sm:px-8">
        <section className="grid w-full gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-rcl-orange/25 bg-rcl-orange/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.2em] text-rcl-orange"><FaShieldHalved/> Members only</p>
            <h2 className="mt-6 max-w-3xl font-display text-5xl font-black uppercase leading-[.88] sm:text-7xl lg:text-8xl">Richmond basketball<br/><span className="text-rcl-blue">lives inside.</span></h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/50">RCL is a private basketball network for registered players, coaches, fans and league staff. Your profile is your access pass to the social network, competition tools, Fantasy, Draft Night and Open Runs.</p>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><FaBasketball className="text-rcl-orange"/><b className="mt-3 block text-sm uppercase">Compete</b><small className="mt-1 block text-white/35">Stats, schedule, rankings</small></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><FaUser className="text-rcl-blue"/><b className="mt-3 block text-sm uppercase">Identity</b><small className="mt-1 block text-white/35">Profile, REP, badges</small></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><FaLock className="text-rcl-orange"/><b className="mt-3 block text-sm uppercase">Member access</b><small className="mt-1 block text-white/35">No public platform browsing</small></div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-rcl-blue/20 bg-[#071522]/88 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            {loading ? <div className="space-y-4"><div className="h-5 w-28 animate-pulse rounded bg-white/10"/><div className="h-12 animate-pulse rounded-xl bg-white/10"/><div className="h-12 animate-pulse rounded-xl bg-white/10"/></div> : inactive ? <>
              <p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Account unavailable</p>
              <h3 className="mt-3 font-display text-3xl font-black uppercase">Membership inactive.</h3>
              <p className="mt-3 text-sm leading-6 text-white/45">This RCL profile is not active. Contact league administration if you believe your access should be restored.</p>
              <Link href="/auth/sign-in" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-5 text-xs font-black uppercase tracking-wider">Return to sign in <FaArrowRight/></Link>
            </> : needsProfile ? <>
              <p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">One step left</p>
              <h3 className="mt-3 font-display text-3xl font-black uppercase">Build your RCL profile.</h3>
              <p className="mt-3 text-sm leading-6 text-white/45">Your account is signed in, but platform access starts after you create your basketball identity and choose your RCL role.</p>
              <Link href={`/profile?next=${encodeURIComponent(next)}`} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Create profile <FaArrowRight/></Link>
            </> : profile ? <>
              <p className="text-xs font-black uppercase tracking-[.2em] text-rcl-blue">Access verified</p>
              <h3 className="mt-3 font-display text-3xl font-black uppercase">Welcome back.</h3>
              <p className="mt-3 text-sm leading-6 text-white/45">Your RCL membership is active.</p>
              <Link href={next} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Enter RCL <FaArrowRight/></Link>
            </> : <>
              <p className="text-xs font-black uppercase tracking-[.2em] text-rcl-blue">RCL member access</p>
              <h3 className="mt-3 font-display text-3xl font-black uppercase">Sign in to enter.</h3>
              <p className="mt-3 text-sm leading-6 text-white/45">The RCL platform is not publicly browsable. Sign in with your member account or create an account to begin your profile.</p>
              <Link href={`/auth/sign-in?next=${encodeURIComponent(next)}`} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Sign in <FaArrowRight/></Link>
              <Link href="/auth/sign-up" className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-5 text-xs font-black uppercase tracking-wider">Create an account <FaArrowRight/></Link>
              <div className="mt-5 border-t border-white/10 pt-5 text-center"><Link href="/auth/reset" className="text-xs font-bold text-white/35 hover:text-rcl-blue">Forgot your password?</Link></div>
            </>}
          </div>
        </section>
      </div>
    </div>
  </main>;
}
