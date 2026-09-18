import Link from 'next/link';
import { FaArrowLeft, FaArrowRight, FaBasketball, FaBolt, FaBrain, FaChartLine, FaDumbbell, FaFilm, FaMedal } from 'react-icons/fa6';

const modules = {
  training: {
    title: 'Training',
    kicker: 'RCL TRAINING SYSTEM',
    body: 'Build structured basketball sessions around your skill, level, time, environment and equipment.',
    icon: FaDumbbell,
    cta: 'Open Workout Builder',
    href: '/lab/training',
    accent: 'orange',
    cards: [
      ['Personalized workouts', 'Generate a session from your current development focus.'],
      ['Coaching cues', 'Every generated drill includes coaching points and common mistakes.'],
      ['Training log', 'Your recent generated sessions are saved locally on this device.'],
    ],
  },
  'player-lab': {
    title: 'Player Lab',
    kicker: 'RCL PLAYER DEVELOPMENT',
    body: 'Your player-development workspace connects identity, performance, progression and the work you put in.',
    icon: FaChartLine,
    cta: 'Open Player Profile',
    href: '/profile',
    accent: 'blue',
    cards: [
      ['Player identity', 'Build the profile that represents your RCL journey.'],
      ['Performance', 'Use official games and player data as the foundation for development.'],
      ['Progression', 'Connect training, badges and competition over time.'],
    ],
  },
  'film-room': {
    title: 'Film Room',
    kicker: 'RCL FILM ROOM',
    body: 'Study basketball through RCL media, game footage, highlights and player stories.',
    icon: FaFilm,
    cta: 'Open RCL Media',
    href: '/media',
    accent: 'blue',
    cards: [
      ['Study', 'Review available RCL media and game content.'],
      ['Break down', 'Look for decisions, spacing, defensive reads and finishing details.'],
      ['Apply', 'Take one lesson from the film and put it into your next workout.'],
    ],
  },
  iq: {
    title: 'Basketball IQ',
    kicker: 'RCL IQ SYSTEM',
    body: 'Sharpen the way you read the floor: spacing, timing, decisions, defensive coverages and game situations.',
    icon: FaBrain,
    cta: 'Explore Basketball',
    href: '/games',
    accent: 'gold',
    cards: [
      ['Read the floor', 'Identify advantage, help position and the next pass.'],
      ['Make the decision', 'Turn recognition into a fast, intentional choice.'],
      ['Compete smarter', 'Carry the lesson into live RCL competition.'],
    ],
  },
  challenges: {
    title: 'Skill Challenges',
    kicker: 'RCL CHALLENGE SYSTEM',
    body: 'Turn daily basketball work into measurable challenges and progression.',
    icon: FaBolt,
    cta: 'Start in The Lab',
    href: '/lab',
    accent: 'orange',
    cards: [
      ['Daily grind', 'Pick one skill and give it a focused block of work.'],
      ['Track results', 'Record makes, reps, time or completion against your target.'],
      ['Earn progression', 'Completed work can become part of the future RCL progression system.'],
    ],
  },
  badges: {
    title: 'Badge Lab',
    kicker: 'RCL PROGRESSION',
    body: 'Track the achievements that show how your basketball identity is developing.',
    icon: FaMedal,
    cta: 'Open Badges',
    href: '/badges',
    accent: 'gold',
    cards: [
      ['Earn', 'Complete meaningful basketball activities and milestones.'],
      ['Display', 'Use badges as part of your RCL player identity.'],
      ['Build legacy', 'Let your progression tell the story of your work over time.'],
    ],
  },
} as const;

type ModuleKey = keyof typeof modules;

export default async function LabModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const config = modules[module as ModuleKey] ?? modules.training;
  const Icon = config.icon;

  return (
    <main className="min-h-screen bg-[#05080d] pb-24 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[#07111c]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(77,163,255,.18),transparent_30%),radial-gradient(circle_at_25%_70%,rgba(255,107,26,.14),transparent_25%),linear-gradient(180deg,#07111c,#030509)]" />
        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <Link href="/lab" className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-white/40 hover:text-white">
            <FaArrowLeft /> Back to The Lab
          </Link>
          <div className="mt-10 flex max-w-4xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[9px] font-black tracking-[.28em] text-rcl-orange"><Icon /> {config.kicker}</p>
              <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[.85] sm:text-7xl">{config.title}</h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/50">{config.body}</p>
            </div>
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-3xl text-rcl-orange shadow-2xl"><Icon /></div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="grid gap-4 md:grid-cols-3">
          {config.cards.map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-[#0a111b] p-6 shadow-xl">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-rcl-orange"><FaBasketball /></div>
              <h2 className="mt-6 font-display text-lg font-black uppercase">{title}</h2>
              <p className="mt-2 text-xs leading-6 text-white/40">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c1826] to-[#05080d] p-7 sm:p-10">
          <p className="text-[9px] font-black tracking-[.25em] text-rcl-gold">NEXT MOVE</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-black uppercase sm:text-4xl">Keep the work connected.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/45">The Lab is designed as one connected development system. Move from training to competition, study, progression and your player identity without losing your place.</p>
          <Link href={config.href} className="mt-7 inline-flex items-center gap-3 rounded-xl bg-rcl-orange px-5 py-3 text-[9px] font-black uppercase tracking-[.18em] text-black hover:bg-white">
            {config.cta} <FaArrowRight />
          </Link>
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link href="/lab/training" className="rounded-xl border border-white/10 bg-white/[.02] p-4 text-xs font-black uppercase hover:border-rcl-orange/50">Training</Link>
          <Link href="/lab/film-room" className="rounded-xl border border-white/10 bg-white/[.02] p-4 text-xs font-black uppercase hover:border-rcl-orange/50">Film Room</Link>
          <Link href="/lab/badges" className="rounded-xl border border-white/10 bg-white/[.02] p-4 text-xs font-black uppercase hover:border-rcl-orange/50">Badge Lab</Link>
        </div>
      </div>
    </main>
  );
}
