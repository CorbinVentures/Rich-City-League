import type { ReactNode } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { FaArrowLeft, FaBasketball, FaShieldHalved } from 'react-icons/fa6';

/** Public authentication should feel like the RCH platform, not a second product. */
export function AuthShell({ children, mode }: { children: ReactNode; mode: 'sign-in' | 'sign-up' | 'reset' | 'verify' }) {
  const copy = mode === 'sign-up'
    ? { kicker: 'Free membership', title: 'Your game starts here.', body: 'Create your basketball identity, find local runs and connect with Virginia players and creators. One free account connects the entire RCH community.' }
    : mode === 'verify'
      ? { kicker: 'Verify your identity', title: 'Check your inbox.', body: 'Confirm your email address to secure your Rich City Hoops profile. Then return to discovering basketball near you.' }
      : mode === 'reset'
        ? { kicker: 'Account recovery', title: 'Get back in.', body: 'Securely restore your account and return to your basketball world.' }
        : { kicker: 'Member access', title: 'Welcome back.', body: 'Your Rich City Hoops profile, runs, crews, league competition and community are waiting.' };

  return <main className="relative min-h-svh overflow-hidden bg-[var(--rch-brand-canvas)] text-[var(--rch-brand-ink)]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_6%,rgba(200,16,46,.16),transparent_34%),radial-gradient(circle_at_12%_84%,rgba(200,16,46,.09),transparent_35%)]" />
    <Container maxWidth="xl" className="relative py-8 sm:py-12 lg:py-16">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-[.12em] text-[var(--rch-brand-copy)] transition hover:text-white"><FaArrowLeft aria-hidden="true" /> Back to Rich City Hoops</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,.85fr)_minmax(420px,.65fr)] lg:items-center lg:gap-14">
        <section className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--rch-brand-border)] bg-[var(--rch-brand-surface)] px-3 py-2 text-xs font-black uppercase tracking-[.14em] text-[var(--rch-brand-accent-text)]"><FaBasketball aria-hidden="true" /> Rich City Hoops · Virginia</div>
          <p className="mt-10 text-xs font-black uppercase tracking-[.22em] text-[var(--rch-brand-accent-text)]">{copy.kicker}</p>
          <h2 className="mt-4 max-w-xl text-balance font-display text-6xl font-black uppercase leading-[.9] tracking-[-.02em]">{copy.title}<br/><span className="text-[var(--rch-brand-accent-text)]">Stay in the game.</span></h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-[var(--rch-brand-copy)]">{copy.body}</p>
          <div className="mt-9 grid max-w-lg gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--rch-brand-border)] bg-[var(--rch-brand-surface)] p-4"><FaShieldHalved className="text-[var(--rch-brand-accent-text)]"/><p className="mt-3 text-xs font-black uppercase tracking-wider">One secure account</p><p className="mt-1 text-xs leading-5 text-[var(--rch-brand-copy)]">Your profile and permissions stay connected.</p></div>
            <div className="rounded-xl border border-[var(--rch-brand-border)] bg-[var(--rch-brand-surface)] p-4"><FaBasketball className="text-[var(--rch-brand-accent-text)]"/><p className="mt-3 text-xs font-black uppercase tracking-wider">Real local basketball</p><p className="mt-1 text-xs leading-5 text-[var(--rch-brand-copy)]">Discover real runs, players and events.</p></div>
          </div>
        </section>
        <section className="mx-auto w-full max-w-xl lg:mx-0">{children}</section>
      </div>
    </Container>
  </main>;
}
