import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { RCL_RULEBOOK_DRAFT } from '@/lib/rcl-governance';

export const metadata: Metadata = {
  title: 'League, Draft & Fantasy Rules | Rich City League',
  description: 'Review the proposed 2027–28 Rich City League competition standards and decisions awaiting commissioner approval.',
  alternates: { canonical: '/league/rules' },
};

const sections = [
  { title: 'League governance', points: ['Commissioner authority, conflict-of-interest disclosures and independent appeals', 'Only signed season rules, agreements and dated commissioner bulletins can become binding', 'Club admission requires verified operators, budgets, insurance, venues and staff'] },
  { title: 'Competition and athletes', points: ['The first new professional season is planned for November 2027; an exact date is not confirmed', 'Final club count, schedule, game rules, playoff format and player compensation remain subject to approval', 'Tryout attendance, Runs XP or popularity do not create professional roster or draft rights', 'Official game results and statistics require independent review and traceable corrections'] },
  { title: 'Draft Night', points: ['The four-round snake order is a preseason preview, not an open live draft', 'Only admitted teams and certified eligible athletes participate in official selections', 'Selections must respect roster capacity, authorized pick clocks and published dispute procedures', 'Post-draft free agency and other roster channels must be authorized before the season'] },
  { title: 'RCL Fantasy', points: ['Fantasy remains separate from official team rosters and the RCH Runs competition', 'Initial fantasy competition is free to enter; no paid-entry contests are authorized', 'Live scoring uses the verified active professional season and locked game lineups', 'A salary-cap or exclusive-player drafting format must be selected and enforced before activation'] },
] as const;

export default function LeagueRulesPage() {
  return (
    <main className="min-h-screen bg-[#03070d] pb-24 text-white">
      <Container maxWidth="lg" className="py-10 sm:py-14">
        <Link href="/league" className="text-sm font-bold text-rcl-orange">← League Center</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[.2em] text-rcl-orange">2027–28 governance · v{RCL_RULEBOOK_DRAFT.version}</p>
        <h1 className="mt-3 font-display text-4xl font-black uppercase leading-tight sm:text-5xl">League Rules & Standards</h1>
        <div role="status" className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
          <strong>Working draft — not yet in force.</strong> These are proposed governance standards, not published competition rules or legal terms. Club admission, player compensation, rules of play, fantasy format and opening night require separate approval.
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-white/70">Rich City League is preparing its first new professional season for {RCL_RULEBOOK_DRAFT.officialSeason}. The regulations below describe the proposed fair-play and operating standards for the league, Draft Night and Fantasy. The full internal draft includes cost responsibilities, dispute procedures and required commissioner votes.</p>
        <div className="mt-9 grid gap-4 md:grid-cols-2">
          {sections.map(section => <section key={section.title} className="rounded-2xl border border-white/15 bg-white/[.035] p-5">
            <h2 className="font-display text-xl font-bold">{section.title}</h2>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-white/65">
              {section.points.map(point => <li key={point}>{point}</li>)}
            </ul>
          </section>)}
        </div>
        <section className="mt-7 rounded-2xl border border-white/15 p-6">
          <h2 className="text-xl font-bold">What is not approved yet?</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">The final number of admitted franchises, player compensation and roster rights, game rules, dates, financial guarantees, draft acceptance rules and fantasy selection format must be settled before the official competition opens. No announced preseason allocation guarantees a live draft position.</p>
          <div className="mt-5 flex flex-wrap gap-4">
            <Link href="/league/join" className="rounded-xl bg-rcl-orange px-5 py-3 text-sm font-bold text-black">How to participate</Link>
            <Link href="/draft" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white">Draft Night preview</Link>
            <Link href="/fantasy" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white">Fantasy preview</Link>
          </div>
        </section>
      </Container>
    </main>
  );
}
