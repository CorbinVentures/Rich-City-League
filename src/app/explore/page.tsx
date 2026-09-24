import Link from 'next/link';
import { Container } from '@/components/Container';
import { RCL_NAV_ITEMS } from '@/lib/rcl-navigation';
import { FaArrowRight, FaBasketball, FaBolt, FaShieldHalved } from 'react-icons/fa6';

export const metadata = {
  title: 'Explore RCL',
  description: 'Discover every major feature across the Rich City League platform.',
};

const featured = [
  { title:'Build Your Identity', copy:'Create your RCL profile, follow your basketball story, and build a reputation through real activity.', href:'/profile', tag:'PROFILE' },
  { title:'RCL Social', copy:'Post, react, connect, share highlights, discover people, and stay inside Richmond basketball culture.', href:'/social', tag:'SOCIAL' },
  { title:'Rep + Badges', copy:'Earn recognition across RCL through participation, achievements, community activity, and league performance.', href:'/badges', tag:'REPUTATION' },
  { title:'Communities', copy:'Find your basketball circles, join conversations, and build communities around teams, runs, and the game.', href:'/communities', tag:'COMMUNITY' },
  { title:'Runs', copy:'Find and organize basketball runs, connect with hoopers, and turn online connections into real competition.', href:'/runs', tag:'PLAY' },
  { title:'Fantasy RCL', copy:'Build your fantasy experience around real Rich City League players and real league performance.', href:'/fantasy', tag:'FANTASY' },
];

const descriptions:Record<string,string>={
  Home:'Return to the RCL hub and see what is happening across the league.',
  'The Lab':'Enter RCL’s basketball lab and explore development, analysis, and interactive basketball tools.',
  Players:'Discover player profiles, basketball identities, stats, recognition, and league history.',
  Teams:'Explore RCL teams, rosters, identities, and team information.',
  Schedule:'See when the league plays and what is coming next.',
  Games:'Follow matchups, results, and the RCL game experience.',
  Standings:'Track the race through the season and see where every team stands.',
  Stats:'Explore the numbers behind players, teams, and league performance.',
  'Draft Night':'Experience the RCL draft and follow selections as teams are built.',
  Social:'Enter the basketball social network built around the RCL community.',
  News:'Follow official league stories, announcements, and coverage.',
  Media:'Watch and discover RCL highlights and league media.',
  Community:'Join basketball communities and connect around shared interests.',
  Rankings:'See RCL rankings and how the league landscape is taking shape.',
  Fantasy:'Build a fantasy experience around real RCL competition.',
  Leaderboards:'See who is leading across performance, activity, and recognition.',
  'Game IQ':'Explore basketball intelligence, analysis, and RCL performance tools.',
  Messages:'Talk directly with people across the RCL network.',
  Friends:'Discover hoopers, coaches, fans, and connections across RCL.',
  Coaches:'Explore the coaches helping lead and develop the league.',
  Awards:'See badges, achievements, and recognition earned across RCL.',
  Shop:'Explore official RCL merchandise and products.',
  Notifications:'Keep up with activity that matters to your RCL account.',
  About:'Learn the history, mission, and future of Rich City League.',
};

export default function ExploreRCLPage(){
  return <main className="min-h-screen bg-[#05070b] text-white">
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(245,158,11,.18),transparent_34%),radial-gradient(circle_at_10%_50%,rgba(14,165,233,.12),transparent_32%)]" />
      <Container maxWidth="xl" className="relative py-14 md:py-20">
        <div className="max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[.3em] text-rcl-orange">Welcome to the new RCL</p>
          <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[.9] sm:text-6xl md:text-8xl">Your basketball world.<br/><span className="text-rcl-gold">One platform.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/60 md:text-lg">Rich City League is more than schedules and scores. Build your identity, compete, connect, earn recognition, follow the league, and experience Richmond basketball from one home.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/profile" className="inline-flex items-center gap-2 rounded-xl bg-rcl-gold px-5 py-3 text-sm font-black uppercase text-black">Complete your profile <FaArrowRight/></Link>
            <Link href="/social" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase">Enter RCL Social <FaBolt/></Link>
          </div>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-12">
      <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.24em] text-rcl-orange">Start here</p><h2 className="mt-2 font-display text-3xl font-black uppercase md:text-4xl">The RCL Experience</h2></div><FaBasketball className="hidden text-4xl text-rcl-gold/50 sm:block"/></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {featured.map((item,i)=><Link key={item.title} href={item.href} className="group relative min-h-56 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.07] to-transparent p-6 transition hover:-translate-y-1 hover:border-rcl-gold/50">
          <span className="text-[10px] font-black tracking-[.25em] text-rcl-orange">{String(i+1).padStart(2,'0')} · {item.tag}</span>
          <h3 className="mt-8 font-display text-3xl font-black uppercase">{item.title}</h3>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/55">{item.copy}</p>
          <span className="absolute bottom-6 right-6 grid h-10 w-10 place-items-center rounded-full border border-white/15 transition group-hover:border-rcl-gold group-hover:text-rcl-gold"><FaArrowRight/></span>
        </Link>)}
      </div>

      <div className="mt-14 rounded-3xl border border-white/10 bg-white/[.03] p-5 md:p-8">
        <div className="mb-7"><p className="text-xs font-black uppercase tracking-[.24em] text-rcl-blue">Explore everything</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Inside Rich City League</h2><p className="mt-2 text-sm text-white/50">Every major RCL destination, all in one place.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RCL_NAV_ITEMS.map(item=>{const Icon=item.icon;return <Link key={item.href+item.label} href={item.href} className="group flex min-h-28 items-start gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-rcl-gold/40 hover:bg-white/[.05]"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rcl-gold/10 text-rcl-gold"><Icon/></span><span className="min-w-0"><b className="flex items-center gap-2 font-display text-lg uppercase">{item.label}<FaArrowRight className="text-xs opacity-0 transition group-hover:opacity-100"/></b><small className="mt-1 block text-xs leading-5 text-white/45">{descriptions[item.label]??'Explore this part of the Rich City League experience.'}</small></span></Link>})}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-5 rounded-3xl border border-rcl-blue/20 bg-rcl-blue/5 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaShieldHalved/></span><div><h3 className="font-display text-xl font-black uppercase">Your experience. Your controls.</h3><p className="mt-1 max-w-2xl text-sm text-white/50">Manage privacy, notifications, reporting, blocking, and account settings from the RCL settings and safety tools.</p></div></div>
        <Link href="/settings" className="shrink-0 rounded-xl border border-white/15 px-5 py-3 text-center text-xs font-black uppercase">Open settings</Link>
      </div>
    </Container>
  </main>;
}
