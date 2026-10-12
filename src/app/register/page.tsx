import type { Metadata } from 'next';
import Link from 'next/link';

const LEAGUE_REGISTRATION_URL = 'https://vba.leagueapps.com/leagues';

export const metadata: Metadata = {
  title: { absolute: 'Richmond Basketball League Registration | Rich City League' },
  description: 'Explore Rich City League registration in Richmond, Virginia. See how official league registration works and join the free Rich City Hoops basketball community.',
  alternates: { canonical: '/register' },
  openGraph: {
    url: '/register',
    title: 'Richmond Basketball League Registration | Rich City League',
    description: 'Official league registration links, player information and free RCH community membership.',
  },
};

export default function RegisterPage() {
  return (
    <main className="min-h-svh bg-[#03070d] pb-20 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_78%_12%,rgba(59,130,246,.18),transparent_35%),linear-gradient(155deg,#0a2135,#03070d)]">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <p className="text-xs font-black uppercase tracking-[.25em] text-orange-400">Rich City League · Richmond, Virginia</p>
          <h1 className="mt-5 font-display text-5xl font-black uppercase leading-tight sm:text-7xl">Your next chapter in Richmond basketball.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/75">
            Explore organized league competition through Rich City League. Official league availability,
            registration requirements, dates and fees are shown in the existing registration portal.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <a href={LEAGUE_REGISTRATION_URL} rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-xl bg-orange-500 px-6 text-sm font-black uppercase tracking-wide text-[#09101a] hover:bg-orange-400">
              View league registration options ↗
            </a>
            <Link href="/auth/sign-up" className="inline-flex min-h-12 items-center rounded-xl border border-white/25 px-6 text-sm font-bold hover:border-white/60">
              Create a free RCH profile
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/55">
            League registration uses an external LeagueApps portal. An RCH community profile is a separate signup.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="font-display text-3xl font-black uppercase sm:text-4xl">Before you register</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-white/15 bg-white/[.035] p-6">
            <h3 className="font-display text-xl font-black uppercase">1. Check availability</h3>
            <p className="mt-3 text-sm leading-7 text-white/70">Open the registration portal to see current league opportunities and confirm eligibility, schedules and pricing.</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/[.035] p-6">
            <h3 className="font-display text-xl font-black uppercase">2. Complete registration</h3>
            <p className="mt-3 text-sm leading-7 text-white/70">Follow the portal instructions for the competition you select. A visit to this page does not reserve a place.</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/[.035] p-6">
            <h3 className="font-display text-xl font-black uppercase">3. Stay connected</h3>
            <p className="mt-3 text-sm leading-7 text-white/70">Follow teams, player profiles, games and Richmond basketball stories on RCH, and install the app for social features.</p>
          </article>
        </div>
        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-orange-300">
          <Link href="/richmond-basketball-league">Explore the league →</Link>
          <Link href="/teams">Meet the teams →</Link>
          <Link href="/games">Games and results →</Link>
          <Link href="/richmond-basketball-runs">Find open runs →</Link>
          <Link href="/app">Get the RCH app →</Link>
        </div>
      </section>
    </main>
  );
}
