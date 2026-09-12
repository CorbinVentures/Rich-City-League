import Link from 'next/link';
import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';
import { FaPlay, FaImage, FaFilm, FaNewspaper } from 'react-icons/fa6';

export const revalidate = 60;

export default async function MediaPage() {
  const client = getPublicClient();

  const { data: mediaItems } = client
    ? await client.from('media').select('*').order('created_at', { ascending: false })
    : { data: [] };

  const items = mediaItems ?? [];

  return (
    <main className="min-h-screen bg-rcl-black bg-[radial-gradient(ellipse_at_top,rgba(29,53,87,0.3),transparent_70%)] pb-24 text-white font-display">
      {/* Page Header */}
      <section className="border-b border-white/10 py-16 text-center">
        <Container maxWidth="xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-rcl-gold">
            RICH CITY MEDIA CENTER
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
            PHOTOS & <span className="text-rcl-gold">HIGHLIGHTS</span>
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Immerse yourself in Richmond basketball history. High quality stream coverage, courtside action captures, and player interviews.
          </p>
        </Container>
      </section>

      {/* Grid of media */}
      <Container maxWidth="xl" className="mt-12">
        <div className="grid gap-8 md:grid-cols-2">
          {items.map((item) => {
            const isVideo = item.media_type === 'video' || item.media_type === 'highlight';
            return (
              <div 
                key={item.id} 
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-2xl transition hover:border-rcl-gold/40"
              >
                {/* Media Image Backdrop */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-900">
                  <img
                    src={item.storage_path}
                    alt={item.title} 
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                  {/* Media Type Icon overlays */}
                  <div className="absolute top-4 left-4 rounded-full bg-black/70 border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rcl-gold flex items-center gap-1.5">
                    {item.media_type === 'photo' && <FaImage />}
                    {item.media_type === 'video' && <FaFilm />}
                    {item.media_type === 'highlight' && <FaPlay />}
                    {item.media_type === 'interview' && <FaNewspaper />}
                    {item.media_type}
                  </div>

                  {/* Play Button Overlay for video/highlights */}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rcl-gold text-black shadow-lg shadow-rcl-gold/20 transition duration-300 group-hover:scale-110 group-hover:bg-white">
                        <FaPlay className="h-5 w-5 ml-1" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Content Box */}
                <div className="p-6">
                  <span className="text-[10px] font-black tracking-widest text-gray-500 uppercase">
                    PUBLISHED {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-white group-hover:text-rcl-gold transition duration-200">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
          {!items.length && <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-12 text-center text-gray-400 md:col-span-2">Official RCL highlights, game footage, photos, recaps, interviews, and features will appear here as they are published.</div>}
        </div>
      </Container>
    </main>
  );
}
