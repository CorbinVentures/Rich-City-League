import type { Metadata } from 'next';
import Link from 'next/link';
import { FaArrowRight, FaCrown, FaFilm, FaGlobe, FaPlay, FaPlus, FaUsers } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { NetworkSponsoredPlacement } from '@/components/network/NetworkSponsoredPlacement';
import { getPublicClient, getLeagueSnapshot } from '@/lib/public-data';
import { MediaDirectory } from '@/components/PublicDirectory';
import type { Media } from '@/types/database';

export const revalidate = 60;
export const metadata: Metadata = {
  title:{absolute:'RCH TV | Virginia Basketball Live, Highlights & Originals'},
  description:'Watch Rich City League games free on RCH TV, explore Virginia basketball highlights and follow the future home of subscriber Originals from Rich City Hoops and selected creators.',
  alternates:{canonical:'/media'},
};

type Highlight={id:string;player_id:string;game_id:string|null;title:string;category:string;clip_url:string|null;thumbnail_url:string|null;featured:boolean;created_at:string;player?:{first_name:string|null;last_name:string|null}|null};

export default async function MediaPage() {
  const client = getPublicClient();
  const db = client as any;
  const { games, teams } = await getLeagueSnapshot();
  const [mediaResult,highlightResult]=client?await Promise.all([
    client.from('media').select('*').eq('status','published').order('created_at',{ascending:false}).limit(60),
    db.from('player_highlights').select('id,player_id,game_id,title,category,clip_url,thumbnail_url,featured,created_at,player:players(first_name,last_name)').eq('status','published').order('featured',{ascending:false}).order('created_at',{ascending:false}).limit(30),
  ]):[{data:[]},{data:[]}];
  const items = ((mediaResult.data ?? []) as Media[]).map((item) => ({ id: item.id, title: item.title, description: item.description, type: item.media_type, url: item.storage_path, createdAt: item.created_at }));
  const highlights=(highlightResult.data??[]) as Highlight[];
  const now = Date.now();
  const nextGame = [...games].filter((game) => !['completed', 'cancelled'].includes(game.status) && new Date(game.scheduled_at).getTime() >= now).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
  const teamName = (id: string) => teams.find((team) => team.id === id)?.name ?? 'RCL Team';
  const liveInputId = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_LIVE_INPUT_ID?.trim();
  const customerCode = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE?.trim();
  const playerUrl = liveInputId && customerCode ? `https://customer-${customerCode}.cloudflarestream.com/${liveInputId}/iframe` : null;

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="RCH TV"
      title="Virginia basketball. One screen."
      accent="Live games. Originals. Local voices."
      description="RCH TV is the media home of Rich City Hoops. Rich City League game streams stay free. Highlights and previews stay shareable. As original programming launches, selected shows from RCH and a curated statewide creator network can grow into membership programming."
      assetKey="media.cover"
      actions={<><Link href="/games" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black"><FaPlay/>Watch games</Link><Link href="/media/creators" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-black uppercase tracking-wider">Creator program <FaArrowRight/></Link></>}
      meta={<div className="min-w-52 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">RCH TV library</p><p className="mt-1 font-display text-3xl font-black">{items.length+highlights.length}<span className="ml-2 text-xs text-white/35">items</span></p><p className="mt-2 text-xs text-rcl-orange">Games stay free</p></div>}
    />

    <Container maxWidth="xl" className="py-10 sm:py-12">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">Live basketball</p><p className="mt-2 font-display text-xl font-black uppercase">Free to watch</p><p className="mt-2 text-xs leading-5 text-white/40">RCL game streams are public. No paid membership is required to watch the league.</p></div>
        <div className="rounded-2xl border border-rcl-orange/15 bg-rcl-orange/[.035] p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCH Originals</p><p className="mt-2 font-display text-xl font-black uppercase">Built for members</p><p className="mt-2 text-xs leading-5 text-white/40">Documentaries, series and creator-led originals can become premium membership programming as the library grows.</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">Creator network</p><p className="mt-2 font-display text-xl font-black uppercase">Curated, not crowded</p><p className="mt-2 text-xs leading-5 text-white/40">Selected creators across Virginia can bring Shorts, Reels, original series, photography, interviews and regional coverage into one basketball destination.</p></div>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/60 shadow-[0_24px_70px_rgba(0,0,0,.22)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7"><div><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange">RCH TV Live</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Live Court</h2></div><span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.16em] text-emerald-200">Free stream</span></div>
        <div className="aspect-video w-full bg-black">{playerUrl ? <iframe src={playerUrl} title="RCH TV Live" className="h-full w-full border-0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <div className="flex h-full flex-col items-center justify-center px-6 text-center"><FaPlay className="text-3xl text-rcl-blue"/><p className="mt-4 text-xs font-black uppercase tracking-[.25em] text-rcl-orange">Broadcast setup in progress</p><h3 className="mt-3 font-display text-2xl font-black uppercase sm:text-4xl">RCH TV Live is coming online.</h3><p className="mt-3 max-w-xl text-sm leading-6 text-white/40">When the live input is connected, official RCL games stream here free.</p></div>}</div>
        <div className="grid gap-4 px-5 py-5 sm:px-7 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs font-black uppercase tracking-[.18em] text-white/30">{nextGame ? 'Next free broadcast' : 'RCH TV Live'}</p><h3 className="mt-2 font-display text-lg font-black uppercase sm:text-xl">{nextGame ? `${teamName(nextGame.away_team_id)} vs ${teamName(nextGame.home_team_id)}` : 'Broadcast schedule coming soon'}</h3>{nextGame && <p className="mt-1 text-sm text-white/40">{new Date(nextGame.scheduled_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' })}</p>}</div><div className="md:text-right"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-blue">Watch here</p><p className="mt-1 text-xs text-white/35">No subscription required for games.</p></div></div>
      </section>

      <NetworkSponsoredPlacement
        placement="media-feature"
        surface="rch-tv-presenting"
        variant="strip"
        slotKey="rch-tv-primary"
        dailyCap={6}
        sessionCap={3}
        brandLabel="RCH TV partner"
        ctaLabel="Visit partner"
        className="mt-8"
      />

      <section className="mt-10 rounded-3xl border border-rcl-orange/20 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.14),transparent_34%),#071018] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange"><FaCrown className="mr-2 inline"/>RCH Originals</p><h2 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">A premium library worth opening.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">The plan is not to flood RCH TV with filler. Originals should earn their place: strong Richmond basketball stories, personalities and access that members cannot get from a box score.</p></div><Link href="/membership" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-orange/30 bg-rcl-orange/10 px-4 text-xs font-black uppercase tracking-wider text-rcl-orange">Membership <FaArrowRight/></Link></div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-black/20 p-5"><span className="rounded-full border border-rcl-blue/25 bg-rcl-blue/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-rcl-blue">Flagship original</span><h3 className="mt-4 font-display text-xl font-black uppercase">Between The Lines</h3><p className="mt-2 text-sm leading-6 text-white/40">RCL stories, personalities, pressure and everything around the game that the scoreboard misses.</p></article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-5"><span className="rounded-full border border-rcl-orange/25 bg-rcl-orange/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-rcl-orange">Curated creators</span><h3 className="mt-4 font-display text-xl font-black uppercase">Creator Originals</h3><p className="mt-2 text-sm leading-6 text-white/40">Selected Virginia creators can develop Shorts, recurring shows, interviews, documentaries, podcasts, photo stories and basketball culture programming.</p></article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-5"><span className="rounded-full border border-white/15 bg-white/[.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white/45">Member library</span><h3 className="mt-4 font-display text-xl font-black uppercase">Watch beyond game night</h3><p className="mt-2 text-sm leading-6 text-white/40">Free clips can introduce a show. Full original episodes can become part of paid membership once programming is ready.</p></article>
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <article className="rounded-3xl border border-rcl-blue/15 bg-[#071522]/50 p-6 sm:p-7"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaUsers/></span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">RCH Creator Network</p><h2 className="font-display text-2xl font-black uppercase">Virginia creators. One destination.</h2></div></div><p className="mt-4 max-w-2xl text-sm leading-6 text-white/45">RCH TV is building a curated statewide roster rather than an open upload free-for-all. Creators can own a region, format or voice—from 30-second Reels to documentaries—while RCH becomes the organized home for Virginia basketball media.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/media/creators" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-4 text-xs font-black uppercase tracking-wider text-white">Explore the creator network <FaArrowRight/></Link><Link href="/media/submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-black uppercase tracking-wider"><FaPlus/>Submit a highlight</Link></div></article>
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-7"><FaGlobe className="text-2xl text-rcl-orange"/><p className="mt-4 text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">Future creator earnings</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Reward qualified viewing.</h2><p className="mt-3 text-sm leading-6 text-white/45">If creator revenue sharing launches, the model should use a defined creator pool and qualified subscriber viewing instead of paying blindly for raw clicks. That keeps payouts connected to real member value and keeps RCH costs predictable.</p></article>
      </section>

      <section className="mt-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange"><FaFilm className="mr-1 inline"/>Public highlights</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Top Plays & player tape</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">Highlights remain public and shareable. Tagged clips attach to a player’s Basketball Passport and, when available, the official game.</p></div><Link href="/media/submit" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rcl-blue">Add a clip <FaArrowRight/></Link></div>{highlights.length?<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{highlights.map(h=><a key={h.id} href={h.clip_url??(h.game_id?`/games/${h.game_id}`:`/players/${h.player_id}/passport`)} className="group rounded-2xl border border-white/10 bg-[#071018] p-4 transition hover:border-rcl-blue/35"><div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_center,rgba(26,155,220,.16),transparent_55%),#020408]">{h.thumbnail_url?<img src={h.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80"/>:null}<span className="relative z-10 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-rcl-blue backdrop-blur"><FaPlay/></span>{h.featured&&<span className="absolute left-2 top-2 rounded-full bg-rcl-orange px-2 py-1 text-[8px] font-black uppercase tracking-wider text-black">Featured</span>}</div><p className="mt-3 text-[9px] font-black uppercase tracking-wider text-rcl-orange">{h.category.replace(/_/g,' ')}</p><h3 className="mt-1 line-clamp-2 font-black">{h.title}</h3><p className="mt-2 text-xs text-white/35">{h.player?`${h.player.first_name??''} ${h.player.last_name??''}`.trim():'RCL Player'}</p></a>)}</div>:<div className="mt-6 rounded-2xl border border-dashed border-white/10 p-9 text-center"><FaFilm className="mx-auto text-3xl text-rcl-blue"/><h3 className="mt-3 font-display text-xl font-black uppercase">The player-tagged tape starts here</h3><p className="mt-2 text-sm text-white/35">Submit highlights and connect them to an RCL player and game.</p></div>}</section>

      <section className="mt-12"><div className="mb-6"><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange">RCH TV archive</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Photos, interviews & media</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">Browse published Rich City Hoops and Rich City League media without leaving the platform.</p></div><MediaDirectory items={items} /></section>
    </Container>
  </main>;
}
