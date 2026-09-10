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

  // Fallback high quality premium content if table is empty
  const items = mediaItems && mediaItems.length > 0 ? mediaItems : [
    {
      id: '1',
      title: 'Rich City League Opening Ceremony Highlights',
      description: 'The electric opening nights and cinematic crowd coverage in Richmond, VA.',
      url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1200',
      media_type: 'highlight',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Coach James tactical review on full court defense',
      description: 'Breakdown of pressing setups and defensive rotation protocols used in Richmond.',
      url: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a27?q=80&w=1200',
      media_type: 'interview',
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Court Action: Team RVA Elite vs Shockoe Bottom Hoop',
      description: 'High flying highlights from Richmond street battles.',
      url: 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?q=80&w=1200',
      media_type: 'photo',
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      title: 'The Champion Mindset: Interview with League MVP',
      description: 'Post-game conversations detailing work ethic and scoring masterclass strategies.',
      url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200',
      media_type: 'video',
      created_at: new Date().toISOString(),
    }
  ];

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
                    src={item.url} 
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
        </div>
      </Container>
    </main>
  );
}
