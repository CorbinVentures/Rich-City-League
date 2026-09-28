import type { ReactNode } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { FaArrowLeft, FaBasketball, FaShieldHalved } from 'react-icons/fa6';

export function AuthShell({ children, mode }: { children: ReactNode; mode: 'sign-in' | 'sign-up' | 'reset' | 'verify' }) {
  const copy = mode === 'sign-up'
    ? { kicker:'Build your RCL identity', title:'Join the city.', body:'Create one account for league identity, social, fantasy, community activity, badges, and the rest of the Rich City League platform.' }
    : mode === 'verify'
      ? { kicker:'Verify your identity', title:'Check your inbox.', body:'Confirm your email address to secure your RCL identity and finish connecting your account to the league and community.' }
      : mode === 'reset'
        ? { kicker:'Account recovery', title:'Get back in.', body:'Recover access securely, then return to the same RCL identity, activity, and league tools.' }
        : { kicker:'Member access', title:'Welcome back.', body:'One account connects your RCL profile, league tools, social activity, fantasy experience, and community.' };

  return <main className="relative min-h-svh overflow-hidden bg-rcl-black text-white">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(255,79,22,.13),transparent_30%),radial-gradient(circle_at_12%_82%,rgba(21,159,255,.13),transparent_32%)]" />
    <div className="pointer-events-none absolute inset-0 opacity-[.1] [background-image:linear-gradient(rgba(21,159,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(21,159,255,.18)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
    <Container maxWidth="xl" className="relative py-8 sm:py-12 lg:py-16">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/40 transition hover:text-white"><FaArrowLeft /> Back to RCL</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,.85fr)_minmax(420px,.65fr)] lg:items-center lg:gap-14">
        <section className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-rcl-blue/20 bg-rcl-blue/5 px-3 py-1.5 text-xs font-black uppercase tracking-[.18em] text-rcl-blue"><FaBasketball /> Rich City League · 804</div>
          <p className="mt-10 text-xs font-black uppercase tracking-[.26em] text-rcl-orange">{copy.kicker}</p>
          <h2 className="mt-4 max-w-xl text-balance font-display text-6xl font-black uppercase leading-[.86] tracking-[-.03em]">{copy.title}<br/><span className="text-rcl-blue">Stay connected.</span></h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/50">{copy.body}</p>
          <div className="mt-9 grid max-w-lg gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-4"><FaShieldHalved className="text-rcl-blue"/><p className="mt-3 text-xs font-black uppercase tracking-wider">Secure account access</p><p className="mt-1 text-xs leading-5 text-white/35">Your profile and permissions stay attached to one identity.</p></div>
            <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-4"><FaBasketball className="text-rcl-orange"/><p className="mt-3 text-xs font-black uppercase tracking-wider">Built around basketball</p><p className="mt-1 text-xs leading-5 text-white/35">League, community, competition, and culture in one platform.</p></div>
          </div>
        </section>
        <section className="mx-auto w-full max-w-xl lg:mx-0">{children}</section>
      </div>
    </Container>
  </main>;
}
