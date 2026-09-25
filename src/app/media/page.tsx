import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { getPublicClient, getLeagueSnapshot } from '@/lib/public-data';
import { MediaDirectory } from '@/components/PublicDirectory';
import type { Media } from '@/types/database';

export const revalidate = 60;

export const metadata: Metadata = { title:{absolute:'RCL Media | Richmond Basketball Highlights & Live'}, description:'Watch Rich City League live coverage and explore Richmond basketball photos, highlights, interviews and RCL media.', alternates:{canonical:'/media'} };

export default async function MediaPage() {
  const client = getPublicClient();
  const { games, teams } = await getLeagueSnapshot();

  const { data: mediaItems } = client
    ? await client.from('media').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(60)
    : { data: [] };

  const items = ((mediaItems ?? []) as Media[]).map((item) => ({ id: item.id, title: item.title, description: item.description, type: item.media_type, url: item.storage_path, createdAt: item.created_at }));
  const now = Date.now();
  const nextGame = [...games]
    .filter((game) => !['completed', 'cancelled'].includes(game.status) && new Date(game.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
  const teamName = (id: string) => teams.find((team) => team.id === id)?.name ?? 'RCL Team';
  const liveInputId = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_LIVE_INPUT_ID?.trim();
  const customerCode = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE?.trim();
  const playerUrl = liveInputId && customerCode
    ? `https://customer-${customerCode}.cloudflarestream.com/${liveInputId}/iframe`
    : null;

  return (
    <main className="min-h-screen bg-rcl-black bg-[radial-gradient(ellipse_at_top,rgba(29,53,87,0.3),transparent_70%)] pb-24 text-white font-display">
      <section className="border-b border-white/10 py-16 text-center">
        <Container maxWidth="xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-rcl-gold">RICH CITY MEDIA CENTER</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
            RCL <span className="text-rcl-gold">LIVE</span> & MEDIA
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Watch Rich City League live, then catch replays, highlights, courtside action and player interviews.
          </p>
        </Container>
      </section>

      <Container maxWidth="xl" className="mt-10">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#07101b] shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.28em] text-rcl-orange">RCL BROADCAST NETWORK</p>
              <h2 className="mt-1 text-2xl font-black uppercase">Live Court</h2>
            </div>
            <span className="rounded-full border border-rcl-orange/40 bg-rcl-orange/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">
              Live & Replay
            </span>
          </div>

          <div className="aspect-video w-full bg-black">
            {playerUrl ? (
              <iframe
                src={playerUrl}
                title="Rich City League Live"
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="text-xs font-black uppercase tracking-[.3em] text-rcl-orange">Broadcast setup in progress</p>
                <h3 className="mt-3 text-2xl font-black uppercase sm:text-4xl">RCL Live is coming online.</h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">The live player will activate here as soon as the RCL Stream input is connected.</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 px-5 py-5 sm:px-7 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.25em] text-gray-500">{nextGame ? 'NEXT BROADCAST' : 'RCL LIVE'}</p>
              <h3 className="mt-2 text-lg font-black uppercase sm:text-xl">
                {nextGame ? `${teamName(nextGame.away_team_id)} vs ${teamName(nextGame.home_team_id)}` : 'Broadcast schedule coming soon'}
              </h3>
              {nextGame && <p className="mt-1 text-sm text-gray-400">{new Date(nextGame.scheduled_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' })}</p>}
            </div>
            <div className="text-left md:text-right">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-gray-500">WATCH HERE</p>
              <p className="mt-1 text-xs text-gray-400">No external app required.</p>
            </div>
          </div>
        </section>

        <div className="mt-12">
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-rcl-orange">ON DEMAND</p>
            <h2 className="mt-1 text-3xl font-black uppercase">Photos & Highlights</h2>
          </div>
          <MediaDirectory items={items} />
        </div>
      </Container>
    </main>
  );
}
