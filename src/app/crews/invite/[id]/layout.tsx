import type {Metadata} from 'next';
import {loadCrewInvite} from '@/lib/crew-invite';
import {crewInviteUrl} from '@/lib/crew-invite-links';

// Fresh server metadata is important when a captain updates their crew's identity.
export const dynamic = 'force-dynamic';
type Props = {children: React.ReactNode; params: Promise<{id: string}>};

export async function generateMetadata({params}: Omit<Props, 'children'>): Promise<Metadata> {
 const {id} = await params;
 const result = await loadCrewInvite(id);
 if (result.status !== 'found') {
  return result.status === 'missing'
   ? {title: 'Crew invite not found | Rich City Hoops', robots: {index: false, follow: false}}
   : {title: 'RCH Crews invitation', robots: {index: false, follow: false}};
 }
 const {crew} = result;
 const url = crewInviteUrl(id);
 const title = crew.name + ' | Join the Crew · Rich City Hoops';
 const description = 'You are invited to join ' + crew.name + ' on RCH Crews' +
  (crew.city ? ' in ' + crew.city : '') + '. Open the crew headquarters and request to join.';
 const image = url + '/opengraph-image?v=crew-invite-v1';
 return {
  title: {absolute: title},
  description,
  alternates: {canonical: url},
  openGraph: {
   title, description, url, siteName: 'Rich City Hoops', type: 'website',
   images: [{url: image, width: 1200, height: 630, alt: crew.name + ' basketball crew invitation'}],
  },
  twitter: {card: 'summary_large_image', title, description, images: [image]},
 };
}

export default function CrewInviteLayout({children}: Props) {
 return children;
}
