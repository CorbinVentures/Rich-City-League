import Link from 'next/link';
import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';
import type { PublicPlayer } from '@/types/database';

export const revalidate = 60;

export default async function PlayersPage() {
  const client = getPublicClient();
  const { data: players, error } = client
    ? await client.from('public_players').select('*').order('last_name').order('first_name')
    : { data: [] as PublicPlayer[], error: null };
  return <main><Container maxWidth="xl" className="py-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">League directory</p><h1 className="mt-2 font-display text-4xl font-bold">Players</h1>{error ? <p className="mt-8 text-red-300">Player directory is temporarily unavailable.</p> : players?.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{players.map((player) => <Link key={player.id} href={`/players/${player.id}`} className="rounded-2xl border border-white/10 p-5 hover:border-rcl-gold/50"><p className="font-display text-xl font-bold">{player.first_name} {player.last_name}</p><p className="mt-2 text-sm text-gray-400">{player.position ?? 'Player'}{player.jersey_number ? ` · #${player.jersey_number}` : ''}</p></Link>)}</div> : <p className="mt-8 text-gray-500">No active players are currently listed.</p>}</Container></main>;
}
