import Link from 'next/link';
import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';

export const revalidate = 60;

export default async function TeamsPage() {
  const { teams } = await getLeagueSnapshot();
  return <main><Container maxWidth="xl" className="py-12">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">League directory</p>
    <h1 className="mt-2 font-display text-4xl font-bold">Teams</h1>
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.length === 0 && <p className="col-span-full rounded-2xl border border-dashed border-white/15 p-10 text-center text-gray-500">No active teams have been published yet.</p>}
      {teams.map((team) => <Link key={team.id} href={`/teams/${team.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 hover:border-rcl-gold/50"><div className="mb-8 h-2 w-16 rounded-full" style={{ backgroundColor: team.primary_color ?? '#FFD700' }} /><h2 className="font-display text-2xl font-bold">{team.name}</h2><p className="mt-2 text-sm text-gray-400">{team.city ?? 'Richmond'}, VA</p></Link>)}
    </div>
  </Container></main>;
}
