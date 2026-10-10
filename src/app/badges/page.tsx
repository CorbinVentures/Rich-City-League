import { BadgeMedallion, BadgeShowcaseCard } from '@/components/BadgeMedallion';
import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';
import type { Badge } from '@/types/database';

export const revalidate = 60;

const CATEGORY_LABELS: Record<string, string> = {
  richmond: 'Richmond Legacy',
  basketball: 'On-Court Excellence',
  community: 'Community & Runs',
  social: 'Social & Reputation',
  performance: 'Performance',
  coach: 'Coaching',
};

const TIER_ORDER: Record<string, number> = { diamond: 0, platinum: 0, elite: 1, gold: 2, silver: 3, bronze: 4 };

export default async function BadgesPage() {
  const client = getPublicClient();
  const { data: rawBadges } = client
    ? await client.from('badges').select('id,name,description,category,icon,tier,requirement_type').eq('is_active', true).order('name')
    : { data: null };
  const badges = (rawBadges ?? []) as Badge[];
  const groups = new Map<string, Badge[]>();
  for (const badge of badges) {
    const category = (badge.category || 'performance').toLowerCase();
    const label = CATEGORY_LABELS[category] || category.replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(badge);
  }
  for (const items of groups.values()) {
    items.sort((a, b) => (TIER_ORDER[a.tier?.toLowerCase()] ?? 5) - (TIER_ORDER[b.tier?.toLowerCase()] ?? 5) || a.name.localeCompare(b.name));
  }
  const featured = badges.find(badge => /elite|diamond|platinum|gold/i.test(badge.tier)) || badges[0];

  return <main className="rcl-social-secondary min-h-screen bg-rcl-black pb-24 text-white">
    <header className="relative overflow-hidden border-b border-rcl-blue/20 bg-[radial-gradient(ellipse_at_75%_20%,rgba(18,114,176,.22),transparent_58%),linear-gradient(130deg,#071c2b,#050810)]">
      <Container maxWidth="xl" className="relative flex flex-col items-center gap-3 py-8 sm:flex-row sm:justify-between sm:gap-8 sm:py-12">
        <div className="w-full sm:max-w-2xl">
          <p className="text-[11px] font-black uppercase tracking-[.24em] text-rcl-blue">RCH achievement vault</p>
          <h1 className="mt-2 font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">Earn your legacy.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/65">Real achievements. Metallic collectible badges. Every milestone becomes part of your Rich City Hoops identity, displayed on your public profile.</p>
          <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/[.04] px-4 py-2 text-xs text-white/70">
            <strong className="font-display text-2xl text-white">{badges.length}</strong>
            <span>collectibles to unlock</span>
          </div>
        </div>
        {featured && <div className="shrink-0" aria-label="Featured badge preview"><BadgeMedallion badge={featured} size="lg" /></div>}
      </Container>
    </header>

    <Container maxWidth="xl" className="py-8 sm:py-10">
      <div className="space-y-11">{[...groups.entries()].map(([category, items]) => <section key={category} aria-label={category}>
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/10 pb-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-rcl-blue">The collection</p><h2 className="mt-1 font-display text-2xl font-black uppercase">{category}</h2></div>
          <span className="shrink-0 text-xs font-bold text-white/45">{items.length} badges</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items.map(badge => <BadgeShowcaseCard key={badge.id} badge={badge} />)}
        </div>
      </section>)}{!badges.length && <p className="rounded-2xl border border-white/10 p-8 text-white/50">Badge catalog is being prepared.</p>}</div>
    </Container>
  </main>;
}
