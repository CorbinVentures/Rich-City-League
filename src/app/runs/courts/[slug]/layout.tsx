import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getPublicClient } from '@/lib/public-data';

type Court = {
  slug: string;
  name: string;
  locality: string | null;
  address: string | null;
};

type CourtLookup =
  | { status: 'found'; court: Court }
  | { status: 'missing' }
  | { status: 'unavailable' };

// The public court page uses this same verified outdoor-court view. A missing
// record is a real 404, not an indexable client-side "court not available" page.
const getCourt = cache(async (slug: string): Promise<CourtLookup> => {
  const db = getPublicClient();
  if (!db) return { status: 'unavailable' };
  const { data, error } = await db.from('rch_runs_outdoor_courts')
    .select('slug,name,locality,address')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return { status: 'unavailable' };
  if (!data) return { status: 'missing' };
  return { status: 'found', court: data as Court };
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCourt(slug);
  if (result.status !== 'found') {
    return {
      title: 'Basketball court | Rich City Hoops',
      robots: { index: false, follow: false },
    };
  }

  const { court } = result;
  const locality = court.locality?.trim() || 'Virginia';
  const title = `${court.name} Basketball Court | ${locality}, VA | Rich City Hoops`;
  const description = `Explore ${court.name}, a verified public outdoor basketball court in ${locality}, Virginia. Find court details, pickup Runs and local basketball competition on Rich City Hoops.`;
  const url = `/runs/courts/${encodeURIComponent(court.slug)}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'Rich City Hoops',
    },
    robots: { index: true, follow: true },
  };
}

export default async function CourtLayout({ children, params }: Props) {
  const { slug } = await params;
  const result = await getCourt(slug);
  if (result.status === 'missing') notFound();
  return children;
}
