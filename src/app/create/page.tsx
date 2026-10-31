import type { Metadata } from 'next';
import Link from 'next/link';
import { FaArrowRight, FaBasketball, FaCamera, FaPen, FaPeopleGroup, FaVideo, FaBolt } from 'react-icons/fa6';
import { Container } from '@/components/Container';

export const metadata: Metadata = {
  title: 'Create | Rich City Hoops',
  description: 'Share a clip, photo, post or story. Start a run or community conversation.',
};

const actions = [
  {title:'Post a clip', detail:'Video highlight', href:'/create/social?mode=clip', icon:FaVideo},
  {title:'Share photos', detail:'Game or event photos', href:'/create/social?mode=moment', icon:FaCamera},
  {title:'Write a post', detail:'Start a conversation', href:'/create/social?mode=post', icon:FaPen},
  {title:'Add a story', detail:'A quick 24-hour update', href:'/social', icon:FaBolt},
  {title:'Host a run', detail:'Set a court and time', href:'/runs?create=1', icon:FaBasketball},
  {title:'Post in a community', detail:'Share with your group', href:'/communities', icon:FaPeopleGroup},
] as const;

export default function CreatePage() {
  return <main className="rcl-social-secondary min-h-screen bg-rcl-black pb-28 text-white">
    <Container maxWidth="md" className="py-6 sm:py-9">
      <h1 className="font-display text-3xl font-black uppercase">Create</h1>
      <p className="mt-2 text-sm text-white/60">What would you like to share?</p>
      <nav aria-label="Create actions" className="mt-5 grid gap-2">
        {actions.map(({title,detail,href,icon:Icon})=><Link key={href} href={href}
          className="group flex min-h-16 items-center gap-4 rounded-xl border border-white/15 bg-white/[.035] px-4 py-3 transition hover:border-rcl-orange/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rcl-orange/10 text-lg text-rcl-orange"><Icon aria-hidden="true"/></span>
          <span className="min-w-0 flex-1"><strong className="block text-base font-bold">{title}</strong><span className="block text-xs text-white/55">{detail}</span></span>
          <FaArrowRight className="shrink-0 text-white/50" aria-hidden="true"/>
        </Link>)}
      </nav>
      <details className="mt-7 rounded-xl border border-white/10 p-4 text-sm text-white/60">
        <summary className="min-h-10 cursor-pointer font-semibold text-white">Where will my posts appear?</summary>
        <p className="mt-2">Clips, photos and posts appear on your basketball profile and can be discovered on Home. Stories expire after 24 hours. Runs and community posts go to their own spaces.</p>
      </details>
    </Container>
  </main>;
}
