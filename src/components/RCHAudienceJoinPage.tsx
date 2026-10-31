import Link from 'next/link';
import { RCHAudienceJoinCTA } from '@/components/RCHAudienceJoinCTA';

type Audience = 'players' | 'fans' | 'coaches' | 'creators' | 'organizations';
type Entry = {
  eyebrow: string;
  headline: string;
  pitch: string;
  benefits: [string, string, string];
  destination: string;
  role: 'player' | 'coach' | 'fan';
  context: string;
};

const entries: Record<Audience, Entry> = {
  players: {
    eyebrow: 'For the players', headline: 'Your next game starts here.',
    pitch: 'Find Virginia basketball opportunities, connect with players and build a real basketball identity.',
    benefits: ['Find upcoming pickup Runs', 'Connect with players and crews', 'Build a profile around verified play'],
    destination: '/runs', role: 'player', context: 'audience_player',
  },
  fans: {
    eyebrow: 'For the fans', headline: 'Get closer to your basketball community.',
    pitch: 'Follow local players, basketball stories and the next chapter of Rich City League.',
    benefits: ['Follow players and basketball stories', 'Discover local basketball culture', 'Get ready for League and Fantasy updates'],
    destination: '/pulse', role: 'fan', context: 'audience_fan',
  },
  coaches: {
    eyebrow: 'For the coaches', headline: 'Build your basketball network.',
    pitch: 'Discover athletes, follow opportunities and create your coaching identity across Virginia.',
    benefits: ['Find local athletes and opportunities', 'Create your coaching profile', 'Connect within the basketball network'],
    destination: '/coaches', role: 'coach', context: 'audience_coach',
  },
  creators: {
    eyebrow: 'For the creators', headline: 'Your basketball stories deserve a stage.',
    pitch: 'Connect with Virginia basketball, build your creator presence and explore RCH media opportunities.',
    benefits: ['Explore basketball highlights', 'Connect with players and local communities', 'Discover RCH TV creator opportunities'],
    destination: '/media', role: 'fan', context: 'audience_creator',
  },
  organizations: {
    eyebrow: 'For basketball organizations', headline: 'Grow the game under your own name.',
    pitch: 'Connect with the community and explore basketball-specific websites and tools for your organization.',
    benefits: ['Start a free basketball website draft', 'Explore scheduling and registration tools', 'Reach a Virginia basketball audience'],
    destination: '/website-creator/start', role: 'coach', context: 'audience_organizer',
  },
};

export function RCHAudienceJoinPage({ audience }: { audience: Audience }) {
  const entry = entries[audience];
  const href = '/auth/sign-up?next=' + encodeURIComponent(entry.destination) + '&role=' + entry.role;
  return <main className="min-h-svh bg-[#080e16] text-white">
    <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
      <p className="text-xs font-black uppercase tracking-[.24em] text-rose-400">{entry.eyebrow} · Rich City Hoops</p>
      <h1 className="mt-5 max-w-4xl font-display text-5xl font-black uppercase leading-[.96] sm:text-7xl">{entry.headline}</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">{entry.pitch}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <RCHAudienceJoinCTA href={href} context={entry.context}/>
        <Link href={entry.destination} className="inline-flex min-h-12 items-center rounded-xl border border-white/30 px-6 text-sm font-black">Explore before joining</Link>
      </div>
      <p className="mt-3 text-xs text-white/60">Free community membership. No app install required.</p>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {entry.benefits.map((benefit, index) => <div key={benefit} className="rounded-2xl border border-white/15 bg-white/[.045] p-6"><span className="text-xs font-black text-rose-400">0{index+1}</span><h2 className="mt-3 text-xl font-black">{benefit}</h2></div>)}
      </div>
    </section>
  </main>;
}
