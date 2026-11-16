import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicClient } from '@/lib/public-data';

type Court = {
  slug: string;
  name: string;
  locality: string | null;
  address: string | null;
  venue_type: string | null;
  access_type: string | null;
  hours_text: string | null;
  open_gym_text: string | null;
  verification_status: string | null;
};

type CourtLookup =
  | { status: 'found'; court: Court }
  | { status: 'missing' }
  | { status: 'unavailable' };

// The public court page uses this same verified outdoor-court view. A missing
// record is a real 404, not an indexable client-side "court not available" page.
const getCourt = cache(async (slug: string): Promise<CourtLookup> => {
  // The verified court view is newer than the generated Supabase Database types.
  const db = getPublicClient() as any;
  if (!db) return { status: 'unavailable' };
  const { data, error } = await db.from('rch_runs_outdoor_courts')
    .select('slug,name,locality,address,venue_type,access_type,hours_text,open_gym_text,verification_status')
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
  if (result.status === 'missing') {
    return {
      title: 'Basketball court | Rich City Hoops',
      robots: { index: false, follow: false },
    };
  }
  if (result.status === 'unavailable') {
    // Preserve inherited robots metadata while the court service is degraded.
    return { title: 'Basketball court | Rich City Hoops' };
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
  if (result.status !== 'found') return children;

  const { court } = result;
  const locality = court.locality?.trim() || 'Virginia';
  const courtPath = `/runs/courts/${encodeURIComponent(court.slug)}`;
  const courtSchema = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: court.name,
    url: `https://www.richcityhoops.com${courtPath}`,
    description: `${court.name} is a verified public outdoor basketball court in ${locality}, Virginia, listed in the Rich City Hoops court network.`,
    address: court.address || `${locality}, Virginia`,
  };

  return (
    <>
      {children}
      <section className="border-t border-white/10 bg-[#07111f] px-5 py-10 text-white" aria-labelledby="rch-public-court-summary-title">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courtSchema) }} />
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-sky-300">Verified Virginia basketball court</p>
          <h2 id="rch-public-court-summary-title" className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">
            Play basketball at {court.name}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70 sm:text-base">
            {court.name} is listed by Rich City Hoops as a verified public outdoor basketball court in {locality}, Virginia.
            {court.address ? ` The listed location is ${court.address}.` : ''}
            {' '}Use RCH to find host-posted Runs, organize a game and connect this court to your basketball profile.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/65">
            {court.venue_type ? <span>Venue: {court.venue_type}</span> : null}
            {court.access_type ? <span>Access: {court.access_type}</span> : null}
            {court.verification_status ? <span>Source status: {court.verification_status}</span> : null}
          </div>
          {court.hours_text || court.open_gym_text ? (
            <div className="mt-4 max-w-3xl text-sm leading-6 text-white/60">
              {court.hours_text ? <p>Published hours: {court.hours_text}</p> : null}
              {court.open_gym_text ? <p>Open-gym information: {court.open_gym_text}</p> : null}
              <p>Confirm current access and park or facility rules before traveling.</p>
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/runs?court=${encodeURIComponent(court.slug)}`} className="rounded-xl bg-sky-300 px-5 py-3 text-xs font-black uppercase tracking-wide text-[#07111f]">
              Find Runs at this court
            </Link>
            <Link href={`/auth/sign-up?next=${encodeURIComponent(courtPath)}`} className="rounded-xl border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-wide text-white">
              Create a free profile
            </Link>
            <Link href="/richmond-basketball-runs" className="rounded-xl border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-wide text-white">
              Richmond pickup basketball
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
