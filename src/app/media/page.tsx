import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { getPublicClient, getLeagueSnapshot } from '@/lib/public-data';
import { MediaDirectory } from '@/components/PublicDirectory';
import type { Media } from '@/types/database';

export const revalidate = 60;

export const metadata: Metadata = { title:{absolute:'RCL Media | Richmond Basketball Highlights & Live'}, description:'Watch Rich City League live coverage and explore Richmond basketball photos, highlights, interviews and RCL media.', alternates:{canonical:'/media'} };

export default async function MediaPage() {
  const client = getPublicClient();
  const { games, teams } = await getLeagueSnapshot();
  const { data: mediaItems } = client ? await client.from('media').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(60) : { data: [] };
  const items = ((mediaItems ?? []) as Media[]).map((item) => ({ id: item.id, title: item.title, description: item.description, type: item.media_type, url: item.storage_path, createdAt: item.created_at }));
  const now = Date.now();
  const nextGame = [...games].filter((game) => !['completed', 'cancelled'].includes(game.status) && new Date(game.scheduled_at).getTime() >= now).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
  const teamName = (id: string) => teams.find((team) => team.id === id)?.name ?? 'RCL Team';
  const liveInputId = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_LIVE_INPUT_ID?.trim();
  const customerCode = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE?.trim();
  const playerUrl = liveInputId && customerCode ? `https://customer-${customerCode}.cloudflarestream.com/${liveInputId}/iframe` : null;

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="RCL Broadcast Network"
      title="Live + Media"
      accent="Courtside from Richmond"
      description="Watch official live coverage, then move into highlights, photos, interviews, and the visual archive of Rich City League basketball."
      assetKey="media.cover"
      meta={<div className="min-w-48 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Media library</p><p className="mt-1 font-display text-3xl font-black">{items.length}<span className="ml-2 text-xs text-white/35">items</span></p><p className="mt-2 text-xs text-rcl-orange">Live + on demand</p></div>}
    />

    <Container maxWidth="xl" className="py-10 sm:py-12">
      <section className="overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/60 shadow-[0_24px_70px_rgba(0,0,0,.22)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
          <div><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange">RCL Broadcast Network</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Live Court</h2></div>
          <span className="rounded-full border border-rcl-orange/30 bg-rcl-orange/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.16em] text-rcl-orange">Live & Replay</span>
        </div>
        <div className="aspect-video w-full bg-black">
          {playerUrl ? <iframe src={playerUrl} title="Rich City League Live" className="h-full w-full border-0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <div className="flex h-full flex-col items-center justify-center px-6 text-center"><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-orange">Broadcast setup in progress</p><h3 className="mt-3 font-display text-2xl font-black uppercase sm:text-4xl">RCL Live is coming online.</h3><p className="mt-3 max-w-xl text-sm leading-6 text-white/40">The live player will activate here as soon as the RCL Stream input is connected.</p></div>}
        </div>
        <div className="grid gap-4 px-5 py-5 sm:px-7 md:grid-cols-[1fr_auto] md:items-center">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-white/30">{nextGame ? 'Next broadcast' : 'RCL Live'}</p><h3 className="mt-2 font-display text-lg font-black uppercase sm:text-xl">{nextGame ? `${teamName(nextGame.away_team_id)} vs ${teamName(nextGame.home_team_id)}` : 'Broadcast schedule coming soon'}</h3>{nextGame && <p className="mt-1 text-sm text-white/40">{new Date(nextGame.scheduled_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' })}</p>}</div>
          <div className="md:text-right"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-blue">Watch here</p><p className="mt-1 text-xs text-white/35">No external app required.</p></div>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-6"><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange">On demand</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Photos & Highlights</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">Browse published RCL media by type without leaving the platform.</p></div>
        <MediaDirectory items={items} />
      </section>
    </Container>
  </main>;
}
