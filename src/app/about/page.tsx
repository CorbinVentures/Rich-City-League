import { Container } from '@/components/Container';

export default function AboutPage() {
  return <main className="rcl-platform-page rcl-about-page min-h-screen pb-24 text-white">
    <section className="rcl-cinematic-page-hero"><Container maxWidth="xl"><p className="rcl-page-kicker">804 · RICHMOND, VIRGINIA</p><h1>THE CITY. <span>THE CULTURE.</span></h1><p>Rich City League is a Richmond basketball platform built around competition, player development, community, media, and the culture of the 804.</p></Container></section>
    <Container maxWidth="xl" className="rcl-page-content"><div className="rcl-page-grid-3">
      {[
        ['MORE THAN A LEAGUE.','A movement built around the people who make Richmond basketball what it is.'],
        ['THE MISSION.','Create places to play, compete, connect, grow, and build a stronger basketball community.'],
        ['THE 804.','Local basketball, local stories, local players, and local pride—connected in one platform.'],
      ].map(([title,body])=><article className="rcl-platform-card" key={title}><p className="rcl-card-kicker">RCL</p><h2>{title}</h2><p>{body}</p></article>)}
    </div></Container>
  </main>;
}