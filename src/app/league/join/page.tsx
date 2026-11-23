import type { Metadata } from 'next';
import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ProgramEmblem, type ProgramEmblemId } from '@/components/ProgramEmblem';
import { LeagueJoinRegistration } from '@/components/LeagueJoinRegistration';
import { RCL_PRO_SEASON } from '@/lib/rcl-pro-season';

export const metadata: Metadata = {
  title: 'Join Rich City League | Your Basketball Path',
  description: 'Join Rich City Hoops free now. Rich City League professional play is planned for November 2027, with official summer 2027 tryouts and Draft Night beforehand.',
  alternates: { canonical: '/league/join' },
  openGraph: {
    type: 'website',
    url: '/league/join',
    title: 'Join Rich City League | Your Basketball Path',
    description: 'Join Rich City Hoops free now. Rich City League professional play is planned for November 2027, with official summer 2027 tryouts and Draft Night beforehand.',
    siteName: 'Rich City Hoops',
    images: [{ url: 'https://www.richcityhoops.com/opengraph-image?v=20261014', width: 1200, height: 630, alt: 'Rich City Hoops — Virginia basketball community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join Rich City League | Your Basketball Path',
    description: 'Join Rich City Hoops free now. Rich City League professional play is planned for November 2027, with official summer 2027 tryouts and Draft Night beforehand.',
    images: ['https://www.richcityhoops.com/opengraph-image?v=20261014'],
  },
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
  {number:'03',title:'Check official tryouts',detail:'Official tryouts are planned for summer 2027; verify open dates, fees and eligibility only after an official announcement.',href:'#official-registration',action:'Check registration'},
  {number:'04',title:'Compete and get evaluated',detail:'Official evaluations happen through announced league processes, not automatically from social activity.',href:'/league',action:'League Center'},
  {number:'05',title:'Follow the official Draft',detail:'See which eligible players are selected for real season rosters.',href:'/draft',action:'Draft Night'},
  {number:'06',title:'Play Fantasy and follow the season',detail:'Fans build fantasy teams using official Rich City League player statistics when a season is active.',href:'/fantasy',action:'Open Fantasy'},
] as const;

export default function JoinRichCityLeaguePage(){
 return <main className="min-h-screen bg-[#03070d] pb-28 text-white">
  <Container maxWidth="lg" className="py-7 sm:py-10">
   <p className="text-xs font-bold uppercase tracking-widest text-rcl-orange">Rich City Hoops · Your basketball world</p>
   <h1 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">Your road to Rich City League</h1>
   <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Join the basketball community and play Runs today. The Rich City League professional season is planned to begin {RCL_PRO_SEASON.startLabel}; official tryouts are planned for summer 2027 and Draft Night follows.</p>
   <div className="mt-5 flex flex-wrap gap-3">
    <Link href="/auth/sign-up?next=%2Fsocial" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-sm font-bold text-black">Join RCH free <FaArrowRight aria-hidden="true"/></Link>
    <Link href="/register" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-bold">Check league registration</Link>
    <Link href="/league/rules" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-bold">League rules</Link>
   </div>
   <div className="mt-8 grid gap-4 sm:grid-cols-2">
    {worlds.map(world=><Link key={world.href} href={world.href} className="rounded-2xl border border-white/10 bg-white/[.03] p-5 hover:border-rcl-blue/50"><ProgramEmblem program={world.program as ProgramEmblemId}/><h2 className="mt-3 font-display text-xl font-black uppercase">{world.title}</h2><p className="mt-1 text-sm text-white/55">{world.subtitle}</p></Link>)}
   </div>
   <section className="mt-10">
    <h2 className="font-display text-2xl font-black uppercase">Your path into the league</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
     {path.map(step=><article key={step.number} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className="text-xs font-black tracking-widest text-rcl-orange">{step.number}</p><h3 className="mt-2 font-bold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-white/60">{step.detail}</p><Link href={step.href} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-rcl-blue">{step.action} <FaArrowRight aria-hidden="true"/></Link></article>)}
    </div>
   </section>
   <LeagueJoinRegistration/>
  </Container>
 </main>;
}
