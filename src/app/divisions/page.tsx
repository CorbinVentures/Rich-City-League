import Link from 'next/link';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { getPublicClient } from '@/lib/public-data';
import type { Division } from '@/types/database';
import { FaArrowRight, FaLayerGroup } from 'react-icons/fa6';

export const revalidate = 60;

export default async function DivisionsPage() {
  const client = getPublicClient();
  const { data: divisions, error } = client ? await client.from('divisions').select('*').order('name') : { data: [] as Division[], error: null };
  const rows = (divisions ?? []) as Division[];

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero eyebrow="Competition Structure" title="Divisions" accent="Know your lane" description="Explore the official RCL competition groups and move directly into the season each division belongs to." assetKey="league.cover" meta={<div className="min-w-44 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Structure</p><p className="mt-1 font-display text-3xl font-black">{rows.length}<span className="ml-2 text-xs text-white/35">divisions</span></p></div>} />
    <Container maxWidth="xl" className="py-10 sm:py-12">
      {error ? <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-8"><p className="text-xs font-black uppercase tracking-[.18em] text-red-300">Divisions</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Temporarily unavailable</h2><p className="mt-2 text-sm text-white/45">The competition structure could not be loaded.</p></div> : rows.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map((division) => <Link key={division.id} href={`/seasons/${division.season_id}`} className="group rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-6 transition hover:-translate-y-1 hover:border-rcl-blue/45"><div className="flex items-start justify-between gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaLayerGroup/></span><FaArrowRight className="mt-1 text-xs text-white/20 transition group-hover:translate-x-1 group-hover:text-rcl-orange"/></div><p className="mt-7 text-xs font-black uppercase tracking-[.18em] text-rcl-orange">RCL Division</p><h2 className="mt-1 font-display text-2xl font-black uppercase group-hover:text-rcl-blue">{division.name}</h2><p className="mt-3 text-sm text-white/40">{division.age_group ?? 'Open age group'}{division.gender ? ` · ${division.gender}` : ''}</p></Link>)}</div> : <div className="rounded-2xl border border-dashed border-rcl-blue/25 bg-rcl-blue/[.035] p-12 text-center"><FaLayerGroup className="mx-auto text-3xl text-rcl-blue/60"/><h2 className="mt-4 font-display text-2xl font-black uppercase">No divisions published</h2><p className="mt-2 text-sm text-white/40">Official competition divisions will appear here when they are published.</p></div>}
    </Container>
  </main>;
}
