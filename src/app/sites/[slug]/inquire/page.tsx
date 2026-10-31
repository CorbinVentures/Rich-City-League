import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getPublicClient} from '@/lib/public-data';
import {isRchSiteSlug} from '@/lib/rch-site-builder';
import {RchSiteInquiryClient} from '@/components/sites/RchSiteInquiryClient';

export const dynamic='force-dynamic';
export const metadata:Metadata={
  title:{absolute:'Contact the Organization | RCH Sites'},
  description:'Ask an independent basketball program about training, camps or upcoming opportunities.',
  robots:{index:false,follow:false},
};
export default async function RchSiteInquirePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!isRchSiteSlug(slug))notFound();
  const db=getPublicClient() as any;
  if(!db)notFound();
  const {data:site}=await db.from('rch_sites').select('organization_id')
    .eq('slug',slug).eq('status','published').maybeSingle();
  if(!site)notFound();
  const {data:org}=await db.from('network_organizations').select('name').eq('id',site.organization_id)
    .eq('status','active').eq('is_verified',true).eq('is_claimed',true).maybeSingle();
  if(!org)notFound();
  return <RchSiteInquiryClient slug={slug} organizationName={org.name}/>;
}
