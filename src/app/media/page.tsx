import type { Metadata } from 'next';
import Link from 'next/link';
import { FaArrowRight, FaBasketball, FaCrown, FaFilm, FaGlobe, FaMicrophone, FaPlay, FaPlus, FaUsers } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { NetworkSponsoredPlacement } from '@/components/network/NetworkSponsoredPlacement';
import { getPublicClient } from '@/lib/public-data';
import { MediaDirectory } from '@/components/PublicDirectory';
import type { Media } from '@/types/database';
import { resolveRchMediaUrl, RCH_TV_VIDEO_BUCKET } from '@/lib/rch-tv-media';
import { RchLiveViewer } from '@/components/media/RchLiveViewer';

export const revalidate = 60;
export const metadata: Metadata = {
  title:{absolute:'RCH TV | Virginia Basketball Games, Replays & Originals'},
  description:'Watch published Virginia basketball game replays, free RCH TV live broadcasts when scheduled, player stories and original programming as it premieres.',
  alternates:{canonical:'/media'},
};

type Highlight={id:string;player_id:string;game_id:string|null;title:string;category:string;clip_url:string|null;thumbnail_url:string|null;featured:boolean;created_at:string;player?:{first_name:string|null;last_name:string|null}|null};

export default async function MediaPage() {
  const client = getPublicClient();
  const db = client as any;
  const [mediaResult,highlightResult]=client?await Promise.all([
    client.from('media').select('*').eq('status','published').order('created_at',{ascending:false}).limit(60),
    db.from('player_highlights').select('id,player_id,game_id,title,category,clip_url,thumbnail_url,featured,created_at,player:players(first_name,last_name)').eq('status','published').order('featured',{ascending:false}).order('created_at',{ascending:false}).limit(30),
  ]):[{data:[]},{data:[]}];
  const items = ((mediaResult.data ?? []) as Media[]).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    type: item.media_type,
    url: resolveRchMediaUrl(item.storage_path, (path) => client!.storage.from('media').getPublicUrl(path).data.publicUrl, (path) => client!.storage.from(RCH_TV_VIDEO_BUCKET).getPublicUrl(path).data.publicUrl),
    createdAt: item.created_at,
    posterUrl: item.thumbnail_path ? resolveRchMediaUrl(item.thumbnail_path,
      path => client!.storage.from('media').getPublicUrl(path).data.publicUrl) : null,
    category: (item as Media & { rch_tv_category?: string }).rch_tv_category ?? 'general',
  })).filter((item) => item.url !== null) as Array<{ id: string; title: string; description: string | null; type: string; url: string; createdAt: string; category: string; posterUrl: string | null }>;
  const highlights=(highlightResult.data??[]) as Highlight[];
  const gameReplays=items.filter(item=>item.category==='live_games');
  const pulseEpisodes=items.filter(item=>item.category==='the_pulse');
  const movies=items.filter(item=>item.category==='movies');
  const originals=items.filter(item=>item.category==='original_content');
  const curatedCount=gameReplays.length+pulseEpisodes.length+movies.length+originals.length;


  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <Container maxWidth="xl" className="pt-6 sm:pt-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-3xl font-black uppercase">RCH TV</h1>
          <p className="mt-1 text-sm text-white/60">Virginia basketball. Real games, real stories, real culture.</p>
          <p className="mt-2 text-xs text-white/40">{curatedCount+highlights.length} published videos and clips · Free live games when on air</p></div>
        <div className="flex flex-wrap gap-2">
          <Link href="/media/studios" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-sm font-black text-black">
            Hire RCH Studios <FaArrowRight aria-hidden="true"/>
          </Link>
          <Link href="/media/creators" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-semibold">
            Creators <FaArrowRight aria-hidden="true"/>
          </Link>
        </div>
      </div>
    </Container>

    <Container maxWidth="xl" className="py-10 sm:py-12">
      <nav aria-label="RCH TV sections" className="flex gap-2 overflow-x-auto pb-3">
        {gameReplays.length>0&&<Link href="#game-replays" className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-rcl-orange/30 bg-rcl-orange/10 px-4 text-sm font-semibold text-rcl-orange">Watch now ({gameReplays.length})</Link>}
        <Link href="#live-games" className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/15 px-4 text-sm font-semibold">Live games</Link>
        <Link href="#the-pulse" className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/15 px-4 text-sm font-semibold">The Pulse</Link>
        <Link href="#movies" className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/15 px-4 text-sm font-semibold">Films</Link>
        <Link href="#original-content" className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/15 px-4 text-sm font-semibold">Originals</Link>
        <Link href="/media/studios" className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/15 px-4 text-sm font-semibold">Studios & sponsors</Link>
      </nav>


      {gameReplays.length>0&&<section id="game-replays" aria-labelledby="rch-tv-archives-heading" className="mt-7 scroll-mt-24">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Available to watch now</p>
            <h2 id="rch-tv-archives-heading" className="mt-2 font-display text-3xl font-black uppercase">Richmond basketball archives</h2>
            <p className="mt-2 text-sm text-white/50">Watch actual published games and replays. No subscription required.</p></div>
          <Link href="/media/submit" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-rcl-blue">Submit a highlight <FaArrowRight/></Link>
        </div>
        <MediaDirectory items={gameReplays}/>
      </section>}
      <section id="live-games" aria-labelledby="rch-tv-live-title" className="mt-8 scroll-mt-24 overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/60 shadow-[0_24px_70px_rgba(0,0,0,.22)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7"><div><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange">RCH TV Live</p><h2 id="rch-tv-live-title" className="mt-1 font-display text-2xl font-black uppercase">Live Games</h2></div><span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.16em] text-emerald-200">Free stream</span></div>
        <RchLiveViewer mode="live_games" />
        <div className="grid gap-4 px-5 py-5 sm:px-7 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs font-black uppercase tracking-[.18em] text-white/30">'Broadcast schedule'</p><h3 className="mt-2 font-display text-lg font-black uppercase sm:text-xl">'Next confirmed broadcast to be announced'</h3><p className="mt-1 text-sm text-white/40">League fixtures do not automatically indicate a scheduled RCH TV broadcast.</p></div><div className="md:text-right"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-blue">Watch here</p><p className="mt-1 text-xs text-white/35">No subscription required for games.</p></div></div>
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

      <section id="the-pulse" aria-labelledby="rch-tv-pulse-title" className="mt-10 scroll-mt-24 overflow-hidden rounded-3xl border border-rcl-orange/20 bg-[linear-gradient(135deg,rgba(236,139,40,.11),rgba(7,21,34,.9)_52%,#040a11)] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-rcl-orange/30 bg-rcl-orange/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rcl-orange"><FaMicrophone aria-hidden="true"/>RCH TV weekly show + podcast</span>
            <h2 id="rch-tv-pulse-title" className="mt-5 font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">The <span className="text-rcl-orange">Pulse</span></h2>
            <p className="mt-3 text-lg font-semibold text-white/80">The conversation behind Virginia basketball.</p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/55">Weekly discussion, news, culture, interviews, and the stories beyond the scoreboard. Watch the episodes right here on RCH TV when the series launches.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
              {['Weekly show','Podcast','Interviews','Basketball culture'].map(label=><span key={label} className="rounded-full border border-white/15 px-3 py-2 text-white/60">{label}</span>)}
            </div>
          </div>
          <div className="flex min-h-44 w-full max-w-xs flex-col items-center justify-center rounded-2xl border border-rcl-orange/20 bg-[#070e17] p-6 text-center shadow-xl">
            <FaMicrophone className="text-4xl text-rcl-orange" aria-hidden="true"/>
            <p className="mt-4 font-display text-3xl font-black uppercase tracking-widest">THE PULSE</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[.25em] text-white/45">An RCH TV Production</p>
            <p className="mt-5 border-t border-white/10 pt-4 text-xs text-rcl-orange">Premiere to be announced</p>
          </div>
        </div>
        <div className="mt-7 overflow-hidden rounded-2xl border border-white/15"><RchLiveViewer mode="the_pulse" /></div>
        {pulseEpisodes.length>0?<div className="mt-8"><h3 className="mb-5 font-display text-2xl font-black uppercase">Watch The Pulse</h3><MediaDirectory items={pulseEpisodes}/></div>:<div className="mt-7 rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-white/55">Episodes will appear here when published. The show has not announced its first air date.</div>}
      </section>

      <section id="movies" aria-labelledby="rch-tv-movies-title" className="mt-10 scroll-mt-24 overflow-hidden rounded-3xl border border-rcl-blue/20 bg-[#071522]/65 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-rcl-blue"><FaFilm aria-hidden="true"/>RCH TV cinema</span>
            <h2 id="rch-tv-movies-title" className="mt-3 font-display text-3xl font-black uppercase sm:text-4xl">Films & Documentaries</h2>
            <p className="mt-3 text-sm leading-7 text-white/55">A carefully curated library of rights-cleared basketball films and documentaries. No broad movie catalog is promised; each title is licensed individually.</p>
          </div>
          <Link href="/media/creators" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-xs font-black uppercase tracking-wider text-white/80">For filmmakers <FaArrowRight/></Link>
        </div>
        {movies.length>0?<div className="mt-7"><MediaDirectory items={movies}/></div>:<div className="mt-7 rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-white/55"><p className="font-semibold text-white">Films are in acquisition review.</p><p className="mt-2">Only confirmed, licensed titles will appear here. No films are currently published.</p></div>}
      </section>

      <section id="original-content" aria-labelledby="rch-tv-originals-title" className="mt-10 scroll-mt-24 rounded-3xl border border-rcl-orange/20 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.14),transparent_34%),#071018] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange"><FaCrown className="mr-2 inline"/>RCH Originals</p><h2 id="rch-tv-originals-title" className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">Original Content</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">The plan is not to flood RCH TV with filler. Originals should earn their place: strong Richmond basketball stories, personalities and access that members cannot get from a box score.</p></div><Link href="/membership" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-orange/30 bg-rcl-orange/10 px-4 text-xs font-black uppercase tracking-wider text-rcl-orange">Membership <FaArrowRight/></Link></div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-black/20 p-5"><span className="rounded-full border border-rcl-blue/25 bg-rcl-blue/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-rcl-blue">In development</span><h3 className="mt-4 font-display text-xl font-black uppercase">Between The Lines</h3><p className="mt-2 text-sm leading-6 text-white/40">RCL stories, personalities, pressure and everything around the game that the scoreboard misses.</p></article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-5"><span className="rounded-full border border-rcl-orange/25 bg-rcl-orange/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-rcl-orange">Curated creators</span><h3 className="mt-4 font-display text-xl font-black uppercase">Creator Originals</h3><p className="mt-2 text-sm leading-6 text-white/40">Selected Virginia creators can develop Shorts, recurring shows, interviews, documentaries, podcasts, photo stories and basketball culture programming.</p></article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-5"><span className="rounded-full border border-white/15 bg-white/[.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white/45">Future library</span><h3 className="mt-4 font-display text-xl font-black uppercase">Selected future premieres</h3><p className="mt-2 text-sm leading-6 text-white/40">Originals remain a programming concept until cleared episodes and a verified premium entitlement system are ready. No separate TV subscription is currently for sale.</p></article>
        </div>
        {originals.length>0?<div className="mt-7"><MediaDirectory items={originals}/></div>:<p className="mt-6 rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/50">The original series library is in development. Episodes will appear here when officially released.</p>}
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <article className="rounded-3xl border border-rcl-blue/15 bg-[#071522]/50 p-6 sm:p-7"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaUsers/></span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">RCH Creator Network</p><h2 className="font-display text-2xl font-black uppercase">Virginia creators. One destination.</h2></div></div><p className="mt-4 max-w-2xl text-sm leading-6 text-white/45">RCH TV is building a curated statewide roster rather than an open upload free-for-all. Creators can own a region, format or voice—from 30-second Reels to documentaries—while RCH becomes the organized home for Virginia basketball media.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/media/creators" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-4 text-xs font-black uppercase tracking-wider text-white">Explore the creator network <FaArrowRight/></Link><Link href="/media/submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-black uppercase tracking-wider"><FaPlus/>Submit a highlight</Link></div></article>
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-7"><FaGlobe className="text-2xl text-rcl-orange"/><p className="mt-4 text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">Future creator earnings</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Reward qualified viewing.</h2><p className="mt-3 text-sm leading-6 text-white/45">Creator earnings are not guaranteed or automatically payable. Future agreements must define rights, eligible media revenue, audited viewing, and approval before any payouts.</p></article>
      </section>

      <section className="mt-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange"><FaFilm className="mr-1 inline"/>Public highlights</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Top Plays & player tape</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">Highlights remain public and shareable. Tagged clips attach to a player’s Basketball Passport and, when available, the official game.</p></div><Link href="/media/submit" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rcl-blue">Add a clip <FaArrowRight/></Link></div>{highlights.length?<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{highlights.map(h=><a key={h.id} href={h.clip_url??(h.game_id?`/games/${h.game_id}`:`/players/${h.player_id}/passport`)} className="group rounded-2xl border border-white/10 bg-[#071018] p-4 transition hover:border-rcl-blue/35"><div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_center,rgba(26,155,220,.16),transparent_55%),#020408]">{h.thumbnail_url?<img src={h.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80"/>:null}<span className="relative z-10 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-rcl-blue backdrop-blur"><FaPlay/></span>{h.featured&&<span className="absolute left-2 top-2 rounded-full bg-rcl-orange px-2 py-1 text-[8px] font-black uppercase tracking-wider text-black">Featured</span>}</div><p className="mt-3 text-[9px] font-black uppercase tracking-wider text-rcl-orange">{h.category.replace(/_/g,' ')}</p><h3 className="mt-1 line-clamp-2 font-black">{h.title}</h3><p className="mt-2 text-xs text-white/35">{h.player?`${h.player.first_name??''} ${h.player.last_name??''}`.trim():'RCL Player'}</p></a>)}</div>:<div className="mt-6 rounded-2xl border border-dashed border-white/10 p-9 text-center"><FaFilm className="mx-auto text-3xl text-rcl-blue"/><h3 className="mt-3 font-display text-xl font-black uppercase">The player-tagged tape starts here</h3><p className="mt-2 text-sm text-white/35">Submit highlights and connect them to an RCL player and game.</p></div>}</section>

    </Container>
  </main>;
}
