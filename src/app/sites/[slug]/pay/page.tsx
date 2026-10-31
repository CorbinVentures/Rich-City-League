import Link from 'next/link';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getPublicClient} from '@/lib/public-data';
import {isRchSiteSlug} from '@/lib/rch-site-builder';
import {normalizeOrganizationPayPalLink} from '@/lib/rch-site-paypal';

export const dynamic='force-dynamic';
export const metadata:Metadata={
  title:{absolute:'Pay an Organization | RCH Sites'},
  description:'Secure offsite PayPal checkout links provided by an independent basketball organization.',
  robots:{index:false,follow:false},
};
type Offering={id:string;title:string;description:string;amount_cents:number;currency:string;payment_url:string};
const usd=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);

export default async function OrganizationPayPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!isRchSiteSlug(slug))notFound();
  const db=getPublicClient() as any;
  if(!db)notFound();
  const {data:site}=await db.from('rch_sites').select('organization_id').eq('slug',slug)
    .eq('status','published').maybeSingle();
  if(!site)notFound();
  const [{data:org},{data:offerings}]=await Promise.all([
    db.from('network_organizations').select('name').eq('id',site.organization_id).maybeSingle(),
    db.from('rch_site_paypal_offerings')
      .select('id,title,description,amount_cents,currency,payment_url')
      .eq('organization_id',site.organization_id).eq('active',true).order('created_at',{ascending:false}).limit(12),
  ]);
  if(!org)notFound();
  const valid=((offerings??[]) as Offering[]).filter(o=>normalizeOrganizationPayPalLink(o.payment_url)===o.payment_url&&
    Number.isSafeInteger(o.amount_cents)&&o.amount_cents>=100&&o.currency==='USD');
  return <main className="min-h-svh bg-[#0b0d12] px-4 pb-20 pt-7 text-white sm:px-7">
    <div className="mx-auto max-w-3xl">
      <Link href={'/sites/'+slug} className="inline-flex min-h-11 items-center text-sm text-white/60">← Back to {org.name}</Link>
      <p className="mt-7 text-xs font-black uppercase tracking-[.16em] text-rose-300">Independent PayPal checkout</p>
      <h1 className="mt-3 text-4xl font-black">Pay {org.name}</h1>
      <p className="mt-4 text-sm leading-7 text-white/70">Select an item below to complete payment on PayPal, outside Rich City Hoops. Funds are processed through the organization&apos;s own PayPal account, not RCH.</p>
      <div className="mt-5 rounded-2xl border border-amber-200/25 bg-amber-400/[.06] p-4 text-xs leading-6 text-amber-100">
        Verify the business name, item and final price on PayPal before paying. The amount displayed here is provided by the organization and is not synchronized with PayPal. Payment does not automatically book a session, guarantee registration or confirm a reservation on RCH. Contact the organization for confirmation, receipts or refunds.
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {valid.length===0&&<p className="rounded-xl border border-white/15 p-5 text-sm text-white/60">This organization has no active PayPal payment links right now.</p>}
        {valid.map(o=><section key={o.id} className="flex flex-col rounded-2xl border border-white/15 bg-white/[.035] p-5">
          <h2 className="text-lg font-black">{o.title}</h2>
          <p className="mt-2 text-2xl font-black">{usd(o.amount_cents)}</p>
          {o.description&&<p className="mt-3 flex-1 text-sm leading-6 text-white/65">{o.description}</p>}
          <a href={o.payment_url} target="_blank" rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-rose-600 px-5 text-sm font-black text-white">
            Pay on PayPal ↗
          </a>
        </section>)}
      </div>
      <p className="mt-9 border-t border-white/15 pt-6 text-xs leading-6 text-white/50">
        Independent merchant transactions. RCH does not accept or settle these payments and cannot confirm PayPal payment status.
      </p>
      <Link href="/" className="mt-4 inline-block text-xs font-black text-white/70">Powered by Rich City Hoops</Link>
    </div>
  </main>;
}
