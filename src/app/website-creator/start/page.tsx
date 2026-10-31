import type {Metadata} from 'next';
import {RchSiteStarterClient} from '@/components/sites/RchSiteStarterClient';
import {rchSitesBillingEnabled} from '@/lib/rch-sites-stripe-billing';

export const dynamic='force-dynamic';

export const metadata:Metadata={
  title:'Get Started | RCH Website Creator',
  description:'Build your basketball website with RCH Sites. Choose a template, preview your design and save a private website draft before organization verification.',
  robots:{index:false,follow:false},
};

export default async function WebsiteCreatorStartPage({
  searchParams,
}:{searchParams:Promise<{tier?:string;billing?:string}>}){
  const {tier,billing}=await searchParams;
  return <RchSiteStarterClient initialTier={tier} initialBilling={billing}
    billingOpen={rchSitesBillingEnabled()}/>;
}
