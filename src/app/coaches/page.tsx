import { Container } from '@/components/Container';
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

  return (
    <main className="min-h-screen bg-rcl-black bg-[radial-gradient(ellipse_at_top,rgba(255,107,26,0.16),transparent_70%)] pb-24 text-white">
      <section className="border-b border-white/10 py-16 text-center font-display">
        <Container maxWidth="xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-rcl-gold">
            RCL LEADERSHIP & STRATEGY
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
            RCL <span className="text-rcl-gold">COACHES</span>
          </h1>
          <p className="mt-4 mx-auto max-w-xl text-base text-gray-400">
            Meet the tactical minds guiding Richmond&apos;s basketball talent.
          </p>
        </Container>
      </section>

      <Container maxWidth="xl" className="mt-12">
        <CoachesDirectory items={items} />
      </Container>
    </main>
  );
}
