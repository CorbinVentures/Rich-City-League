import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/Container';

export const metadata: Metadata = {
  title: "Men's Basketball League Richmond VA | Join Rich City League",
  description: "Looking for a men's basketball league in Richmond, VA? Join Rich City League for organized competition, player profiles, official stats, rankings, community, runs and year-round RVA basketball.",
  alternates:{canonical:'/richmond-basketball-league'},
  openGraph:{url:'/richmond-basketball-league',title:"Men's Basketball League Richmond VA | Rich City League",description:'Competitive Richmond basketball with official stats, player profiles, community and year-round hoops culture.'}
};

const features=[
 ['ORGANIZED COMPETITION','Play meaningful league basketball with schedules, teams, standings and official results.'],
 ['PLAYER PROFILES + STATS','Build a basketball identity with game statistics, achievements, ratings and season history.'],
 ['RICHMOND COMMUNITY','Connect with players, coaches and fans across the 804 through RCL’s basketball-first community.'],
 ['RUNS + MORE BASKETBALL','Find basketball activity beyond league night and stay connected to the game year-round.'],
 ['REP + BADGES','Earn recognition for participation and accomplishments across the RCL ecosystem.'],
 ['MEDIA + EXPOSURE','RCL news, rankings, highlights and original storytelling give Richmond basketball a home.'],
];

export default function RichmondBasketballLeaguePage(){
 const schema={'@context':'https://schema.org','@type':'SportsOrganization',name:'Rich City League',alternateName:'RCL',sport:'Basketball',url:'https://richcityhoops.com/richmond-basketball-league',areaServed:{'@type':'City',name:'Richmond, Virginia'},description:"Competitive men's basketball league and year-round basketball community serving Richmond, Virginia."};
 return <main className="min-h-screen bg-rcl-black pb-24 text-white"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
  <section className="border-b border-white/10 bg-[radial-gradient(circle_at_75%_20%,rgba(249,115,22,.2),transparent_35%),linear-gradient(180deg,#07111d,#02060b)]">
   <Container maxWidth="xl" className="py-20 md:py-28"><p className="text-xs font-black uppercase tracking-[.28em] text-rcl-orange">804 · Richmond, Virginia</p><h1 className="mt-5 max-w-5xl font-display text-5xl font-black uppercase leading-[.92] md:text-8xl">Richmond basketball.<br/><span className="text-rcl-orange">Built different.</span></h1><p className="mt-7 max-w-3xl text-lg leading-8 text-white/65">Rich City League is a Richmond-born basketball league and year-round hoops community built for players who want more than a place to show up and play. Compete, build your profile, track your stats, earn recognition and stay connected to RVA basketball.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/register" className="rounded-full bg-rcl-orange px-7 py-4 text-sm font-black uppercase tracking-wider text-black">Register for RCL →</Link><Link href="/players" className="rounded-full border border-white/15 px-7 py-4 text-sm font-black uppercase tracking-wider">Explore Players</Link></div></Container>
  </section>
  <Container maxWidth="xl" className="py-16">
   <section><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-gold">More than a league</p><h2 className="mt-3 max-w-4xl font-display text-4xl font-black uppercase md:text-6xl">A basketball ecosystem for the 804.</h2><div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map(([t,d])=><article key={t} className="border border-white/10 bg-white/[.025] p-6"><h3 className="font-display text-xl font-black uppercase">{t}</h3><p className="mt-3 text-sm leading-7 text-white/55">{d}</p></article>)}</div></section>
   <section className="mt-20 grid gap-8 border-y border-white/10 py-12 lg:grid-cols-2"><div><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-orange">Richmond men&apos;s basketball</p><h2 className="mt-3 font-display text-4xl font-black uppercase">Your game should have a history.</h2></div><div className="space-y-4 text-base leading-8 text-white/60"><p>RCL connects what happens on the court to a permanent digital experience. Games create stats. Stats build player profiles. Performances create rankings, achievements and stories. The community continues between game nights.</p><p>Whether you are looking to compete, reconnect with Richmond basketball or become part of the next RCL season, this is where the journey starts.</p><div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-sm font-bold"><Link href="/games" className="text-rcl-gold">Schedule & scores →</Link><Link href="/standings" className="text-rcl-gold">Standings →</Link><Link href="/news" className="text-rcl-gold">RCL News →</Link><Link href="/about" className="text-rcl-gold">Our history →</Link></div></div></section>
   <section className="mt-20 text-center"><p className="text-xs font-black uppercase tracking-[.3em] text-rcl-orange">Ready to compete?</p><h2 className="mx-auto mt-4 max-w-4xl font-display text-5xl font-black uppercase md:text-7xl">Find your place in Richmond basketball.</h2><p className="mx-auto mt-6 max-w-2xl text-white/55">Registration is handled through the official Rich City League registration flow.</p><Link href="/register" className="mt-8 inline-flex rounded-full bg-rcl-orange px-8 py-4 text-sm font-black uppercase tracking-wider text-black">Join Rich City League →</Link></section>
  </Container>
 </main>
}