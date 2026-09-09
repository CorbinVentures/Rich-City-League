import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';
import { getPublicClient } from '@/lib/public-data';
import { RegistrationForm } from '@/components/RegistrationForm';

export const revalidate = 300;

export default async function RegisterPage() {
  const { seasons } = await getLeagueSnapshot();
  const openSeasons = seasons.filter((season) => season.registration_open);
  const client = getPublicClient();
  const { data: divisions } = client ? await client.from('divisions').select('*').in('season_id', openSeasons.map((season) => season.id)) : { data: [] };
  return <main><Container maxWidth="lg" className="py-16"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Get in the game</p><h1 className="mt-2 font-display text-4xl font-bold">Registration</h1><p className="mt-4 max-w-2xl text-gray-400">Registration availability is driven by the current RCL season. Submit an application and track its status from your dashboard.</p><div className="mt-10 space-y-4">{openSeasons.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8"><h2 className="font-display text-xl font-bold">Registration is currently closed</h2><p className="mt-2 text-gray-400">Check back soon for the next Rich City League season.</p></div> : <RegistrationForm seasons={openSeasons} divisions={divisions ?? []} />}</div></Container></main>;
}
