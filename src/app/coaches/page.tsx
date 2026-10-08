import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { getCoachesList, getLeagueSnapshot } from '@/lib/public-data';
import { CoachesDirectory } from '@/components/PublicDirectory';

export const revalidate = 60;

export default async function CoachesPage() {
  const [coaches, snapshot] = await Promise.all([getCoachesList(), getLeagueSnapshot()]);
  const items = coaches.map((coach: any) => {
    const record = snapshot.standings.find((standing) => standing.team_id === coach.team_id);
    const profile = coach.profile;
    return { id: coach.id, profileId: coach.profile_id, name: profile?.display_name ?? ([profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'RCL Coach'), title: coach.title || 'Coach', team: coach.team?.name ?? null, teamSlug: coach.team?.slug ?? null, wins: record?.wins ?? null, losses: record?.losses ?? null };
  });

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="RCL Leadership + Strategy"
      title="Coaches"
      accent="Lead the game"
      description="Meet the coaches guiding teams, developing players, and shaping how Rich City League basketball is played."
      assetKey="coaches.cover"
      meta={<div className="min-w-44 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Leadership</p><p className="mt-1 font-display text-3xl font-black">{items.length}<span className="ml-2 text-xs text-white/35">coaches</span></p><p className="mt-2 text-xs text-rcl-blue">Official RCL staff</p></div>}
    />
    <Container maxWidth="xl" className="py-10 sm:py-12"><CoachesDirectory items={items} /></Container>
  </main>;
}
