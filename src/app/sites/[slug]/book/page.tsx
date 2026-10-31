import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {RchSiteBookingClient} from '@/components/sites/RchSiteBookingClient';
import {isRchSiteSlug} from '@/lib/rch-site-builder';

export const metadata:Metadata={
  title:{absolute:'Book a Session | RCH Sites'},
  description:'Reserve a free basketball training or coaching appointment through Rich City Hoops.',
  robots:{index:false,follow:false},
};
export const dynamic='force-dynamic';
export default async function RchSiteBookingPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!isRchSiteSlug(slug))notFound();
  return <RchSiteBookingClient slug={slug}/>;
}
