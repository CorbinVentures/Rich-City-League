import type { Metadata } from 'next';
import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ProgramEmblem, type ProgramEmblemId } from '@/components/ProgramEmblem';
import { LeagueJoinRegistration } from '@/components/LeagueJoinRegistration';

export const metadata: Metadata = {
  title:'Join Rich City League | Your Basketball Path | Rich City Hoops',
  description:'Create a free RCH profile, play Runs, build your basketball identity, check Rich City League registration, follow Draft Night and play Fantasy.',
};

const worlds = [
  {title:'Runs',subtitle:'Find games and crews',href:'/runs',program:'runs'},
  {title:'Rich City League',subtitle:'Your route to organized competition',href:'/league',program:'rich-city-league'},
  {title:'Draft Night',subtitle:'Watch official roster selections',href:'/draft',program:'draft-night'},
  {title:'Fantasy',subtitle:'Build a team and follow the season',href:'/fantasy',program:'fantasy-league'},
] as const;

const path = [
  {number:'01',title:'Join the community',detail:'Create a free profile. Follow players, share moments, and find your people.',href:'/auth/sign-up?next=%2Fsocial',action:'Join free'},
  {number:'02',title:'Play Runs and challenge a crew',detail:'Play whenever it works for you. Record eligible games, share highlights and build your reputation.',href:'/runs',action:'Find Runs'},
  {number:'03',title:'Check official tryouts',detail:'Explore league registration options and verify open dates, fees and eligibility.',href:'#official-registration',action:'Check registration'},
  {number:'04',title:'Compete and get evaluated',detail:'Official evaluations happen through announced league processes, not automatically from social activity.',href:'/league',action:'League Center'},
  {number:'05',title:'Follow the official Draft',detail:'See which eligible players are selected for real season rosters.',href:'/draft',action:'Draft Night'},
  {number:'06',title:'Play Fantasy and follow the season',detail:'Fans build fantasy teams using official Rich City League player statistics when a season is active.',href:'/fantasy',action:'Open Fantasy'},
] as const;

export default function JoinRichCityLeaguePage(){
 return <main className="min-h-screen bg-[#03070d] pb-28 text-white">
  <Container maxWidth="lg" className="py-7 sm:py-10">
   <p className="text-xs font-bold uppercase tracking-widest text-rcl-orange">Rich City Hoops · Your basketball world</p>
   <h1 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">Your road to Rich City League</h1>
   <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Join the community today. Play Runs on your schedule. When you are ready, explore Rich City League competition.</p>
   <div className="mt-5 flex flex-wrap gap-3">
    <Link href="/auth/sign-up?next=%2Fsocial" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-sm font-bold text-black">Join RCH free <FaArrowRight aria-hidden="true"/></Link>
    <Link href="/register" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-bold">Check league registration</Link>
   </div>
   <section aria-label="Four basketball destinations" className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
    {worlds.map(({title,subtitle,href,program})=><Link href={href} key={href} className="flex min-h-28 flex-col gap-2 rounded-xl border border-white/15 bg-white/[.035] p-3 transition hover:border-rcl-orange/50 focus-visible:outline focus-visible:outline-2">
      <ProgramEmblem program={program as ProgramEmblemId} className="rch-program-emblem-journey"/>
      <strong className="text-sm">{title}</strong><span className="text-xs leading-4 text-white/55">{subtitle}</span>
    </Link>)}
   </section>
   <h2 className="mt-9 text-xl font-bold">How it works</h2>
   <ol className="mt-3 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/15">
    {path.map(step=><li key={step.number} className="flex gap-3 p-4 sm:gap-5">
      <span className="w-8 shrink-0 font-display text-xl font-black text-rcl-orange">{step.number}</span>
      <div className="min-w-0 flex-1">
       <h3 className="font-semibold">{step.title}</h3>
       <p className="mt-1 text-xs leading-5 text-white/60">{step.detail}</p>
       <Link href={step.href} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-rcl-orange">{step.action} <FaArrowRight aria-hidden="true"/></Link>
      </div>
    </li>)}
   </ol>
   <LeagueJoinRegistration />
   <div className="mt-6 rounded-xl border border-white/15 p-4">
    <h2 className="font-semibold">Build your basketball identity anytime</h2>
    <p className="mt-1 text-xs leading-5 text-white/60">Post highlights, join conversations, and review XP, REP and badges. Verified results and other qualifying activity follow each system&apos;s existing rules. Playing Runs does not guarantee a tryout, draft selection or rewards.</p>
    <nav aria-label="Build basketball identity" className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
     <Link className="text-rcl-orange" href="/create/social?mode=clip">Post highlights</Link>
     <Link className="text-rcl-orange" href="/crews">Find a crew</Link>
     <Link className="text-rcl-orange" href="/badges">Badges</Link>
     <Link className="text-rcl-orange" href="/rep">REP</Link>
    </nav>
   </div>
  </Container>
 </main>;
}
