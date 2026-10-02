import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FaArrowRight,
  FaBasketball,
  FaBolt,
  FaCamera,
  FaImage,
  FaPen,
  FaPeopleGroup,
  FaPlus,
  FaVideo,
} from 'react-icons/fa6';
import { Container } from '@/components/Container';

export const metadata: Metadata = {
  title: 'Create in RCL | Rich City League',
  description: 'Drop clips, post basketball moments, create stories, start runs, and contribute across RCL.',
};

const createOptions = [
  {
    label: 'Drop a Clip',
    eyebrow: 'Build The Tape',
    description: 'Upload a basketball video directly from your phone, add context, enter a weekly challenge, and put your game in front of the network.',
    href: '/create/social?mode=clip',
    action: 'Drop a clip',
    icon: FaVideo,
    accent: 'orange',
    note: 'Native video posts become part of your basketball identity and can collect RCL reactions, comments, saves, shares, and discovery.',
  },
  {
    label: 'Post a Moment',
    eyebrow: 'Photos from the culture',
    description: 'Share a game, workout, team, event, community, or behind-the-scenes moment with up to 10 photos in one post.',
    href: '/create/social?mode=moment',
    action: 'Post a moment',
    icon: FaCamera,
    accent: 'blue',
    note: 'Photo sets are native to RCL now. Give the moment context, tag it with a challenge, and let the network react.',
  },
  {
    label: 'Post',
    eyebrow: 'Network conversation',
    description: 'Start a basketball conversation, share an opinion, add a link, or combine your words with native photos or video.',
    href: '/create/social?mode=post',
    action: 'Create a post',
    icon: FaPen,
    accent: 'blue',
    note: 'Posts publish to your Network identity and can be shared, reacted to, commented on, saved, and reposted.',
  },
  {
    label: 'Story',
    eyebrow: '24-hour update',
    description: 'Share a quick moment from the gym, court, event, or city without turning it into a permanent feed post.',
    href: '/social',
    action: 'Open stories',
    icon: FaBolt,
    accent: 'orange',
    note: 'Use the Add Story card at the top of Home. Stories support native photos and video and expire automatically.',
  },
  {
    label: 'Run',
    eyebrow: 'Turn social into basketball',
    description: 'Put a real game on the board, choose the format and skill level, set the court and time, and invite the network.',
    href: '/runs',
    action: 'Create a run',
    icon: FaBasketball,
    accent: 'orange',
    note: 'Open future runs also generate official RCL activity so the network can discover them.',
  },
  {
    label: 'Community post',
    eyebrow: 'Post where you belong',
    description: 'Start a focused conversation inside a team, run, neighborhood, or basketball community you have joined.',
    href: '/communities',
    action: 'Choose a community',
    icon: FaPeopleGroup,
    accent: 'blue',
    note: 'Community conversations keep their own context while still feeding the culture around the league.',
  },
] as const;

export default function CreatePage() {
  return (
    <main className="rcl-social-secondary min-h-screen bg-[#03070d] pb-28 text-white">
      <section className="relative overflow-hidden border-b border-rcl-blue/15 bg-[linear-gradient(135deg,#071522_0%,#03070d_62%,#07111b_100%)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(255,79,22,.18),transparent_30%),radial-gradient(circle_at_8%_72%,rgba(21,159,255,.16),transparent_34%)]" />
        <Container maxWidth="xl" className="relative py-12 sm:py-16">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-rcl-orange/20 bg-rcl-orange/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.18em] text-rcl-orange">
              <FaPlus /> Create in RCL
            </div>
            <h1 className="mt-5 font-display text-5xl font-black uppercase leading-[.9] sm:text-6xl md:text-7xl">
              Don&apos;t just scroll.<br />
              <span className="text-rcl-blue">Put something on the court.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/55 md:text-lg">
              RCL is built around participation. Drop the clip, post the photos, start the conversation, organize the run, and build a basketball identity people can actually discover.
            </p>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="py-8 sm:py-10">
        <section className="mb-8 overflow-hidden rounded-3xl border border-rcl-orange/20 bg-[linear-gradient(135deg,rgba(255,79,22,.11),rgba(7,21,34,.8))] p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-rcl-orange"><FaImage /> New · RCL Creator Studio</p>
              <h2 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">Upload native. Get seen. Build The Tape.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">YouTube links still work, but they are no longer the main way to contribute. Upload clips and photo sets directly, enter weekly basketball challenges, and let RCL reactions and discovery do the rest.</p>
            </div>
            <Link href="/create/social?mode=clip" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black transition hover:brightness-110">Open Creator Studio <FaArrowRight /></Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {createOptions.map((option, index) => {
            const Icon = option.icon;
            const orange = option.accent === 'orange';
            return (
              <Link
                key={option.label}
                href={option.href}
                className={`group relative overflow-hidden rounded-3xl border p-5 transition duration-200 hover:-translate-y-0.5 sm:p-6 ${orange ? 'border-rcl-orange/18 bg-rcl-orange/[.035] hover:border-rcl-orange/45' : 'border-rcl-blue/16 bg-[#071522]/70 hover:border-rcl-blue/45'}`}
              >
                <div className="flex items-start gap-4">
                  <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border text-xl ${orange ? 'border-rcl-orange/25 bg-rcl-orange/10 text-rcl-orange' : 'border-rcl-blue/25 bg-rcl-blue/10 text-rcl-blue'}`}>
                    <Icon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <small className={`text-[11px] font-black uppercase tracking-[.18em] ${orange ? 'text-rcl-orange' : 'text-rcl-blue'}`}>{option.eyebrow}</small>
                    <span className="mt-1 flex items-center gap-3">
                      <strong className="font-display text-2xl font-black uppercase sm:text-3xl">{option.label}</strong>
                      <span className="text-xs font-black text-white/20">0{index + 1}</span>
                    </span>
                    <span className="mt-3 block max-w-xl text-sm leading-6 text-white/52">{option.description}</span>
                  </span>
                </div>
                <div className="mt-5 flex flex-col gap-3 border-t border-white/[.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="max-w-xl text-xs leading-5 text-white/30">{option.note}</span>
                  <span className={`inline-flex shrink-0 items-center gap-2 text-xs font-black uppercase tracking-wider ${orange ? 'text-rcl-orange' : 'text-rcl-blue'}`}>
                    {option.action} <FaArrowRight className="transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </section>

        <section className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-[linear-gradient(135deg,#071522,#050a10)] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-rcl-orange"><FaImage /> RCL creator loop</p>
            <h2 className="mt-2 font-display text-2xl font-black uppercase sm:text-3xl">Upload → recognition → REP + identity → discovery → more basketball.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/40">The goal is not to reward spam. Strong posts earn reactions, conversation, saves, features, challenge visibility, and a permanent place in the basketball identity you build on RCL.</p>
          </div>
          <Link href="/social" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-5 text-xs font-black uppercase tracking-wider text-rcl-blue transition hover:border-rcl-blue/60">
            Home <FaArrowRight />
          </Link>
        </section>
      </Container>
    </main>
  );
}
