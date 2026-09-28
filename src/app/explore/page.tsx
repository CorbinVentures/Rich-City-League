import Link from 'next/link';
import { Container } from '@/components/Container';
import { RCL_NAV_GROUPS } from '@/lib/rcl-navigation';
import { FaArrowRight, FaBasketball, FaBolt, FaShieldHalved } from 'react-icons/fa6';

export const metadata = {
  title: 'Explore RCL',
  description: 'Discover every major feature across the Rich City League platform.',
};

const featured = [
  { title:'League Center', copy:'Get to schedules, games, standings, stats, teams, rankings, and the competitive side of RCL from one place.', href:'/league', tag:'LEAGUE' },
  { title:'Build Your Identity', copy:'Create your RCL profile, follow your basketball story, and build a reputation through real activity.', href:'/profile', tag:'PROFILE' },
  { title:'RCL Social', copy:'Post, react, connect, share highlights, discover people, and stay inside Richmond basketball culture.', href:'/social', tag:'SOCIAL' },
  { title:'Rep + Badges', copy:'Earn recognition across RCL through participation, achievements, community activity, and league performance.', href:'/badges', tag:'REPUTATION' },
  { title:'Runs', copy:'Find and organize basketball runs, connect with hoopers, and turn online connections into real competition.', href:'/runs', tag:'PLAY' },
  { title:'Fantasy RCL', copy:'Build your fantasy experience around real Rich City League players and real league performance.', href:'/fantasy', tag:'FANTASY' },
];

const descriptions:Record<string,string>={
  Players:'Discover player profiles, basketball identities, stats, recognition, and league history.',
  Teams:'Explore RCL teams, rosters, identities, and team information.',
  Schedule:'See when the league plays and what is coming next.',
  Games:'Follow matchups, results, and the RCL game experience.',
  Standings:'Track the race through the season and see where every team stands.',
  Stats:'Explore the numbers behind players, teams, and league performance.',
  Rankings:'See RCL rankings and how the league landscape is taking shape.',
  Coaches:'Explore the coaches helping lead and develop the league.',
  'Draft Night':'Experience the RCL draft and follow selections as teams are built.',
  Fantasy:'Build a fantasy experience around real RCL competition.',
  Leaderboards:'See who is leading across performance, activity, and recognition.',
  'Game IQ':'Explore basketball intelligence, analysis, and RCL performance tools.',
  Shop:'Explore official RCL merchandise and products.',
  Social:'Enter the basketball social network built around the RCL community.',
  News:'Follow official league stories, announcements, and coverage.',
  Media:'Watch and discover RCL highlights and league media.',
  Communities:'Join basketball communities and connect around shared interests.',
  Friends:'Discover hoopers, coaches, fans, and connections across RCL.',
  Messages:'Talk directly with people across the RCL network.',
  Awards:'See badges, achievements, and recognition earned across RCL.',
  Notifications:'Keep up with activity that matters to your RCL account.',
  'About RCL':'Learn the history, mission, and future of Rich City League.',
};

export default function ExploreRCLPage(){
  return <main className="min-h-screen bg-[#03070d] text-white">
    <section className="relative overflow-hidden border-b border-rcl-blue/20 bg-[linear-gradient(120deg,#071522_0%,#03070d_60%,#07111b_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_15%,rgba(255,79,22,.16),transparent_30%),radial-gradient(circle_at_12%_48%,rgba(21,159,255,.14),transparent_32%)]" />
      <Container maxWidth="xl" className="relative py-14 md:py-20">
        <div className="max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[.3em] text-rcl-orange">Rich City League · 804</p>
          <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[.9] sm:text-6xl md:text-8xl">One platform.<br/><span className="text-rcl-blue">Clear paths.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/60 md:text-lg">Everything RCL offers is still here. Explore it by purpose instead of digging through one oversized menu.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/league" className="inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-5 py-3 text-sm font-black uppercase text-black">Open League Center <FaArrowRight/></Link>
            <Link href="/social" className="inline-flex items-center gap-2 rounded-xl border border-rcl-blue/35 bg-rcl-blue/10 px-5 py-3 text-sm font-black uppercase">Enter RCL Social <FaBolt/></Link>
          </div>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-12">
      <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.24em] text-rcl-orange">Start here</p><h2 className="mt-2 font-display text-3xl font-black uppercase md:text-4xl">The RCL Experience</h2></div><FaBasketball className="hidden text-4xl text-rcl-blue/50 sm:block"/></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {featured.map((item,i)=><Link key={item.title} href={item.href} className="group relative min-h-56 overflow-hidden rounded-2xl border border-rcl-blue/20 bg-gradient-to-br from-[#0a1b2a] to-[#050b12] p-6 transition hover:-translate-y-1 hover:border-rcl-orange/50">
          <span className="text-xs font-black tracking-[.25em] text-rcl-orange">{String(i+1).padStart(2,'0')} · {item.tag}</span>
          <h3 className="mt-8 font-display text-3xl font-black uppercase">{item.title}</h3>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/55">{item.copy}</p>
          <span className="absolute bottom-6 right-6 grid h-10 w-10 place-items-center rounded-full border border-rcl-blue/30 text-rcl-blue transition group-hover:border-rcl-orange group-hover:text-rcl-orange"><FaArrowRight/></span>
        </Link>)}
      </div>

      <div className="mt-14">
        <div className="mb-7"><p className="text-xs font-black uppercase tracking-[.24em] text-rcl-blue">Platform directory</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Everything, organized</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">Four clear families replace the old wall of links. Nothing was removed; every destination simply has a more obvious home.</p></div>
        <div className="grid gap-5 lg:grid-cols-2">
          {RCL_NAV_GROUPS.map((group,index)=><section key={group.label} className="rounded-2xl border border-rcl-blue/20 bg-[#071522]/80 p-5 md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-4"><div><span className="text-xs font-black tracking-[.2em] text-rcl-orange">0{index+1}</span><h3 className="mt-1 font-display text-2xl font-black uppercase">{group.label}</h3><p className="mt-1 text-sm text-white/45">{group.description}</p></div></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.items.map(item=>{const Icon=item.icon;return <Link key={item.href} href={item.href} className="group flex min-h-20 items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 transition hover:border-rcl-blue/45 hover:bg-rcl-blue/5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rcl-blue/10 text-rcl-blue"><Icon/></span><span className="min-w-0 flex-1"><b className="font-display text-sm uppercase tracking-wide">{item.label}</b><small className="mt-1 block text-xs leading-4 text-white/40">{descriptions[item.label]??'Explore this part of the RCL platform.'}</small></span><FaArrowRight className="shrink-0 text-xs text-white/20 transition group-hover:text-rcl-orange"/></Link>})}
            </div>
          </section>)}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-5 rounded-2xl border border-rcl-blue/20 bg-rcl-blue/5 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaShieldHalved/></span><div><h3 className="font-display text-xl font-black uppercase">Your experience. Your controls.</h3><p className="mt-1 max-w-2xl text-sm text-white/50">Manage privacy, notifications, reporting, blocking, and account settings from one consistent account area.</p></div></div>
        <Link href="/settings" className="shrink-0 rounded-xl border border-white/15 px-5 py-3 text-center text-xs font-black uppercase">Open settings</Link>
      </div>
    </Container>
  </main>;
}
