import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';
import { MediaDirectory } from '@/components/PublicDirectory';

export const revalidate = 60;

export default async function MediaPage() {
  const client = getPublicClient();

  const { data: mediaItems } = client
    ? await client.from('media').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(60)
    : { data: [] };

  const items = (mediaItems ?? []).map((item) => ({ id: item.id, title: item.title, description: item.description, type: item.media_type, url: item.storage_path, createdAt: item.created_at }));

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

      <Container maxWidth="xl" className="mt-12">
        <MediaDirectory items={items} />
      </Container>
    </main>
  );
}
