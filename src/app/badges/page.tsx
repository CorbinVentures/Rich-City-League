import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';
import type { Badge } from '@/types/database';

export const revalidate = 60;

export default async function BadgesPage() {
  const client = getPublicClient();
  const { data: rawBadges } = client
    ? await client.from('badges').select('id,name,description,category,icon,tier').eq('is_active', true).order('category').order('tier').order('name')
    : { data: null };
  const badges = (rawBadges ?? []) as Badge[];
  const groups = new Map<string, Badge[]>();
  for (const badge of badges) {
    const key = badge.category === 'richmond' ? 'Richmond' : badge.category === 'basketball' ? 'Basketball' : 'RCL Performance';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(badge);
  }
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="xl" className="py-10 sm:py-14">
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-rcl-navy via-black to-rcl-orange/5 p-7 sm:p-10"><p className="text-[10px] font-black tracking-[.28em] text-rcl-gold">RCL ACHIEVEMENT SYSTEM</p><h1 className="mt-3 font-display text-5xl font-black uppercase sm:text-7xl">Earn your <span className="text-rcl-orange">badge.</span></h1><p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">Basketball milestones, Richmond identity and community participation all count. Players and fans can build a visible RCL collection.</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full bg-rcl-orange/10 px-3 py-2 text-[9px] font-black tracking-widest text-rcl-orange">PLAYERS</span><span className="rounded-full bg-rcl-gold/10 px-3 py-2 text-[9px] font-black tracking-widest text-rcl-gold">FANS</span><span className="rounded-full bg-rcl-blue/10 px-3 py-2 text-[9px] font-black tracking-widest text-rcl-blue">RICHMOND × BASKETBALL</span></div></section>
    <div className="mt-10 space-y-10">{[...groups.entries()].map(([category, items]) => <section key={category}><div className="mb-4 flex items-end justify-between"><div><p className="text-[9px] font-black tracking-[.2em] text-white/30">BADGE COLLECTION</p><h2 className="mt-1 font-display text-2xl font-black uppercase">{category}</h2></div><span className="text-[9px] font-black tracking-widest text-white/25">{items.length} BADGES</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map(badge => <article key={badge.id} className="group rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:-translate-y-1 hover:border-rcl-orange/40"><div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rcl-orange/10 text-2xl">{badge.icon}</span><span className="text-[9px] font-black uppercase tracking-widest text-rcl-gold">{badge.tier}</span></div><h3 className="mt-5 font-display text-lg font-black uppercase">{badge.name}</h3><p className="mt-2 text-xs leading-5 text-white/45">{badge.description}</p></article>)}</div></section>)}{!badges.length&&<p className="rounded-2xl border border-white/10 p-8 text-white/40">Badge catalog is being prepared.</p>}</div>
  </Container></main>;
}
