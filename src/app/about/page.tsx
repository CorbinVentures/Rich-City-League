import Link from 'next/link';
import { Container } from '@/components/Container';

const timeline = [
  ['2011', 'THE BEGINNING', 'Rich City League is founded in Richmond with a mission centered on high-level competition, community pride, and the love of basketball.'],
  ['EARLY ERA', 'THE CITY SHOWS UP', 'RCL grows from a local summer streetball concept into an organized basketball environment where players can compete, be seen, and represent Richmond.'],
  ['EXPANSION', 'BEYOND RICHMOND', 'RCL history records collaborations with the Goodman League and Entertainers Basketball Classic, along with recognition from SLAM Magazine and local media.'],
  ['2023', 'END OF A CHAPTER', 'The last full season of the earlier RCL era closes, creating room to rethink what an independent Richmond basketball organization could become.'],
  ['2026', 'THE REBUILD', 'RCL returns with a larger vision: basketball, technology, media, analytics, fantasy competition, social community, and league operations in one ecosystem.'],
];

const ecosystem = [
  ['PLAYER IDENTITY', 'Persistent player profiles built to carry statistics, team history, achievements, badges, highlights, awards, and an RCL career forward from season to season.'],
  ['PLAYER IQ', 'A developing performance system designed to look beyond points per game toward efficiency, consistency, impact, winning contribution, and the complete player story.'],
  ['BADGES + LEGACY', 'Milestones and achievements become permanent parts of the player identity. Seasons end. Accomplishments should not disappear with them.'],
  ['DRAFT NIGHT', 'Evaluations lead into a real draft experience where coaches build rosters while players and fans can follow the selections and storylines.'],
  ['RCL FANTASY', 'Fans build fantasy rosters from real RCL players. Real game statistics power scoring, rankings, matchups, standings, and season-long competition.'],
  ['THE LAB', 'The development and basketball-intelligence side of RCL: shot data, trends, performance analysis, film-minded learning, and tools that help players understand the game.'],
  ['SOCIAL COMMUNITY', 'Player, coach, and fan identities connect through profiles, teammates, friends, stories, messaging, communities, highlights, and basketball conversation.'],
  ['LEAGUE MANAGEMENT', 'Tryouts, rosters, trades, availability, discipline, staff responsibilities, and league decisions live inside an organized operating system instead of scattered spreadsheets.'],
  ['MEDIA + STORYTELLING', 'Highlights, photography, rankings, interviews, weekly recognition, original content, and Between The Lines give Richmond basketball stories a platform.'],
];

const values = [
  ['DISCIPLINE', 'Show up prepared. Compete with purpose.'],
  ['RESPECT', 'Respect the game, teammates, opponents, officials, and community.'],
  ['ACCOUNTABILITY', 'Your actions, preparation, and choices matter.'],
  ['COMMUNITY', 'Basketball is the platform. Richmond is the reason.'],
];

export default function AboutPage() {
  return (
    <main className="rcl-platform-page rcl-about-page min-h-screen overflow-hidden pb-24 text-white">
      <section className="rcl-cinematic-page-hero relative">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(249,115,22,.16),transparent_30%),linear-gradient(180deg,rgba(2,6,23,.05),rgba(2,6,23,.9))]" />
        <Container maxWidth="xl" className="relative z-10 py-20 md:py-32">
          <p className="rcl-page-kicker">804 · RICHMOND, VIRGINIA · EST. 2011</p>
          <h1 className="max-w-5xl text-5xl font-black uppercase leading-[.9] tracking-[-.05em] md:text-8xl">
            RICHMOND BASKETBALL HAS A HISTORY.
            <span className="mt-3 block text-orange-500">WE&apos;RE BUILDING WHAT&apos;S NEXT.</span>
          </h1>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-200 md:text-xl">
            Rich City League is a Richmond-born basketball organization built around competition, player development, community pride, media, technology, and the culture of the 804. What began as a summer basketball league is being rebuilt as a year-round basketball ecosystem.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[.18em]">
            {['Basketball', 'Technology', 'Entertainment', 'Community'].map((item) => (
              <span key={item} className="rounded-full border border-white/15 bg-black/35 px-5 py-3 backdrop-blur">{item}</span>
            ))}
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="rcl-page-content space-y-20 md:space-y-28">
        <section className="grid gap-5 md:grid-cols-3">
          {[
            ['2011', 'FOUNDED IN RICHMOND'],
            ['804', 'BUILT FOR THE CITY'],
            ['NEXT', 'THE DIGITAL ERA'],
          ].map(([big, label]) => (
            <article className="rcl-platform-card min-h-44" key={label}>
              <p className="text-5xl font-black tracking-[-.05em] text-orange-500">{big}</p>
              <h2 className="mt-4 text-lg font-black uppercase tracking-[.12em]">{label}</h2>
            </article>
          ))}
        </section>

        <section>
          <p className="rcl-page-kicker">OUR HISTORY</p>
          <h2 className="max-w-4xl text-4xl font-black uppercase tracking-[-.04em] md:text-6xl">FROM SUMMER STREETBALL TO A BASKETBALL PLATFORM.</h2>
          <p className="mt-6 max-w-4xl text-base leading-8 text-slate-300 md:text-lg">
            RCL&apos;s documented history begins in 2011 with a simple mission: bring Richmond together through competition, community pride, and basketball. The league grew into an organized environment for players from Richmond and beyond, while preserving the energy and authenticity of local basketball culture.
          </p>
          <div className="mt-10 border-l border-orange-500/50 pl-6 md:pl-10">
            {timeline.map(([year, title, body]) => (
              <article key={year} className="relative border-b border-white/10 py-8 first:pt-0">
                <span className="absolute -left-[31px] top-9 h-2.5 w-2.5 rounded-full bg-orange-500 md:-left-[45px]" />
                <p className="text-xs font-black uppercase tracking-[.25em] text-orange-400">{year}</p>
                <h3 className="mt-2 text-2xl font-black uppercase">{title}</h3>
                <p className="mt-3 max-w-3xl leading-7 text-slate-300">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="rcl-page-kicker">THE FOUNDER</p>
            <h2 className="text-4xl font-black uppercase tracking-[-.04em] md:text-6xl">DEVaughn CORBIN.</h2>
          </div>
          <article className="rcl-platform-card">
            <p className="text-lg leading-8 text-slate-200">
              DeVaughn Corbin founded Rich City League in 2011 around the belief that Richmond basketball deserved its own platform—not merely somewhere to play, but somewhere players could compete, be recognized, build relationships, and represent their city.
            </p>
            <p className="mt-5 leading-8 text-slate-300">
              The modern rebuild takes that original idea further. RCL is using software, statistics, automation, media, community participation, and game-day presentation to bring experiences normally associated with much larger sports organizations to local basketball.
            </p>
            <p className="mt-7 text-2xl font-black uppercase italic leading-tight">
              THE TECHNOLOGY IS NEW.<br /><span className="text-orange-500">THE PURPOSE ISN&apos;T.</span>
            </p>
          </article>
        </section>

        <section>
          <p className="rcl-page-kicker">RCL 2.0</p>
          <h2 className="max-w-5xl text-4xl font-black uppercase tracking-[-.04em] md:text-6xl">MORE THAN REGISTRATION. AN ENTIRE BASKETBALL ECOSYSTEM.</h2>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            The traditional recreational cycle is register, play, and leave. RCL is being designed differently. Players enter an ecosystem where evaluations can lead to a draft, games create permanent data, accomplishments build a profile, league operations stay organized, and fans participate instead of simply watching.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {ecosystem.map(([title, body], index) => (
              <article className="rcl-platform-card group min-h-64" key={title}>
                <p className="text-xs font-black tracking-[.25em] text-orange-500">0{index + 1} / RCL SYSTEM</p>
                <h3 className="mt-5 text-2xl font-black uppercase">{title}</h3>
                <p className="mt-4 leading-7 text-slate-300">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-orange-500/20 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.15),transparent_35%),rgba(2,6,23,.72)] p-7 md:p-12">
          <p className="rcl-page-kicker">THE MISSION</p>
          <h2 className="max-w-5xl text-4xl font-black uppercase tracking-[-.04em] md:text-6xl">BUILD PLAYERS. BUILD CHARACTER. BUILD COMMUNITY.</h2>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Basketball is the platform, but the mission goes beyond the scoreboard. RCL is built around discipline, teamwork, leadership, confidence, accountability, respect, positive competition, and giving young men in Richmond a place to stay active, connected, and challenged.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {values.map(([title, body]) => (
              <div key={title} className="border-t-2 border-orange-500 pt-4">
                <h3 className="font-black uppercase">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="rcl-page-kicker">THE FUTURE</p>
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-4xl font-black uppercase tracking-[-.04em] md:text-6xl">PHYSICAL GAME. DIGITAL COMMUNITY.</h2>
            </div>
            <div className="space-y-5 text-lg leading-8 text-slate-300">
              <p>The rebuild is the foundation, not the finish line. The roadmap is deeper analytics, smarter player evaluation, richer player histories, stronger fantasy competition, immersive game experiences, original media, community partnerships, player exposure, and technology that connects what happens on the court to what happens online.</p>
              <p>RCL is not trying to make Richmond basketball pretend to be the NBA. The goal is to build something designed specifically for Richmond basketball—professional in execution, local in identity, and capable of growing with the community.</p>
            </div>
          </div>
        </section>

        <section className="py-12 text-center md:py-20">
          <p className="text-xs font-black uppercase tracking-[.35em] text-orange-500">2011 → TODAY → WHAT&apos;S NEXT</p>
          <h2 className="mx-auto mt-6 max-w-5xl text-5xl font-black uppercase leading-[.9] tracking-[-.055em] md:text-8xl">BUILT IN RICHMOND.<br />REIMAGINED FOR THE NEXT GENERATION.</h2>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-300">The city. The players. The fans. The stories. The future. This is Rich City League.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="rounded-full bg-orange-500 px-7 py-4 text-sm font-black uppercase tracking-[.12em] text-black transition hover:bg-orange-400">Join the League</Link>
            <Link href="/fantasy" className="rounded-full border border-white/20 bg-white/5 px-7 py-4 text-sm font-black uppercase tracking-[.12em] transition hover:bg-white/10">Explore RCL Fantasy</Link>
          </div>
        </section>
      </Container>
    </main>
  );
}
