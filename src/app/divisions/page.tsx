import Link from 'next/link';
import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';
import type { Division } from '@/types/database';

export const revalidate = 60;

export default async function DivisionsPage() {
  const client = getPublicClient();
  const { data: divisions, error } = client
    ? await client.from('divisions').select('*').order('name')
    : { data: [] as Division[], error: null };
  return <main><Container maxWidth="xl" className="py-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Competition</p><h1 className="mt-2 font-display text-4xl font-bold">Divisions</h1>{error ? <p className="mt-8 text-red-300">{error.message}</p> : divisions?.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{divisions.map((division) => <Link key={division.id} href={`/seasons/${division.season_id}`} className="rounded-2xl border border-white/10 p-5 hover:border-rcl-gold/50"><p className="font-display text-xl font-bold">{division.name}</p><p className="mt-2 text-sm text-gray-400">{division.age_group ?? 'Open age group'}{division.gender ? ` · ${division.gender}` : ''}</p></Link>)}</div> : <p className="mt-8 text-gray-500">No divisions are currently published.</p>}</Container></main>;
}
