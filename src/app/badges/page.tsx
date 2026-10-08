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

  return <main className="rcl-social-secondary min-h-screen bg-rcl-black pb-24 text-white">
    <header className="border-b border-rcl-blue/12 bg-[#071018]/88">
      <Container maxWidth="xl" className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:py-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-rcl-blue/65">Achievement system</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Badges</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Basketball milestones, Richmond identity and community participation build your visible RCL collection.</p>
        </div>
        <div className="w-fit rounded-xl border border-rcl-blue/15 bg-rcl-blue/[.05] px-4 py-3 text-sm text-white/45"><strong className="mr-2 text-xl font-semibold text-white">{badges.length}</strong>available</div>
      </Container>
    </header>

    <Container maxWidth="xl" className="py-8 sm:py-10">
      <div className="space-y-10">{[...groups.entries()].map(([category, items]) => <section key={category}>
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-rcl-blue/55">Badge collection</p><h2 className="mt-1 font-display text-2xl font-semibold">{category}</h2></div><span className="text-xs font-semibold text-white/25">{items.length} badges</span></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map(badge => <article key={badge.id} className="group rounded-2xl border border-rcl-blue/12 bg-[#071522]/45 p-5 transition hover:-translate-y-1 hover:border-rcl-blue/35">
          <div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rcl-blue/10 text-2xl">{badge.icon}</span><span className="text-xs font-semibold uppercase tracking-[.1em] text-rcl-blue/70">{badge.tier}</span></div>
          <h3 className="mt-5 font-display text-lg font-semibold">{badge.name}</h3>
          <p className="mt-2 text-xs leading-5 text-white/45">{badge.description}</p>
        </article>)}</div>
      </section>)}{!badges.length&&<p className="rounded-2xl border border-white/10 p-8 text-white/40">Badge catalog is being prepared.</p>}</div>
    </Container>
  </main>;
}
