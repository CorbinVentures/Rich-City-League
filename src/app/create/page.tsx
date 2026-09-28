import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FaArrowRight,
  FaBasketball,
  FaBolt,
  FaImage,
  FaPen,
  FaPeopleGroup,
  FaPlus,
  FaVideo,
} from 'react-icons/fa6';
import { Container } from '@/components/Container';

export const metadata: Metadata = {
  title: 'Create in RCL | Rich City League',
  description: 'Create a post, story, basketball highlight, pickup run, or community conversation across the RCL Network.',
};

const createOptions = [
  {
    label: 'Post',
    eyebrow: 'Network conversation',
    description: 'Start a basketball conversation, share an opinion, post an update, or add photos and video to the RCL feed.',
    href: '/social?compose=1',
    action: 'Create a post',
    icon: FaPen,
    accent: 'blue',
    note: 'Publishes to your Network identity and can be shared, reacted to, commented on, saved, and reposted.',
  },
  {
    label: 'Story',
    eyebrow: '24-hour update',
    description: 'Share a quick moment from the gym, court, event, or city without turning it into a permanent feed post.',
    href: '/social',
    action: 'Open stories',
    icon: FaBolt,
    accent: 'orange',
    note: 'Use the Add Story card at the top of Network Home. Stories expire automatically after their active window.',
  },
  {
    label: 'Highlight',
    eyebrow: 'Basketball identity',
    description: 'Put a clip or visual basketball moment in front of the network and build the media side of your RCL identity.',
    href: '/social?compose=1',
    action: 'Share a highlight',
    icon: FaVideo,
    accent: 'blue',
    note: 'Attach a basketball clip or photo in the Network composer. Media posts become part of your Highlights and Media identity surfaces.',
  },
  {
    label: 'Run',
    eyebrow: 'Turn social into basketball',
    description: 'Put a real game on the board, choose the format and skill level, set the court and time, and invite the network.',
    href: '/runs',
    action: 'Create a run',
    icon: FaBasketball,
    accent: 'orange',
    note: 'Open future runs also generate an official RCL Runs activity story so the network can discover them.',
  },
  {
    label: 'Community post',
    eyebrow: 'Post where you belong',
    description: 'Start a focused conversation inside a team, run, neighborhood, or basketball community you have joined.',
    href: '/communities',
    action: 'Choose a community',
    icon: FaPeopleGroup,
    accent: 'blue',
    note: 'Community conversations keep their own context instead of flooding the main Network feed.',
  },
] as const;

export default function CreatePage() {
  return (
    <main className="min-h-screen bg-[#03070d] pb-28 text-white">
      <section className="relative overflow-hidden border-b border-rcl-blue/15 bg-[linear-gradient(135deg,#071522_0%,#03070d_62%,#07111b_100%)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(255,79,22,.18),transparent_30%),radial-gradient(circle_at_8%_72%,rgba(21,159,255,.16),transparent_34%)]" />
        <Container maxWidth="xl" className="relative py-12 sm:py-16">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-rcl-orange/20 bg-rcl-orange/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.18em] text-rcl-orange">
              <FaPlus /> Create in RCL
            </div>
            <h1 className="mt-5 font-display text-5xl font-black uppercase leading-[.9] sm:text-6xl md:text-7xl">
              Put something<br />
              <span className="text-rcl-blue">into the network.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/55 md:text-lg">
              One place to start every meaningful contribution across Rich City League. Choose what you want to create; RCL sends you into the trusted flow that already owns that content.
            </p>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="py-8 sm:py-10">
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
            <h2 className="mt-2 font-display text-2xl font-black uppercase sm:text-3xl">Create → get discovered → build your identity → bring it back to the court.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/40">Posts and stories create conversation. Highlights build basketball identity. Runs turn online connections into games. Communities give those relationships a place to grow.</p>
          </div>
          <Link href="/social" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-5 text-xs font-black uppercase tracking-wider text-rcl-blue transition hover:border-rcl-blue/60">
            Network Home <FaArrowRight />
          </Link>
        </section>
      </Container>
    </main>
  );
}
