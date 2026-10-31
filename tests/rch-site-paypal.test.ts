import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {normalizeOrganizationPayPalLink,normalizePayPalOffering,MAX_PAYPAL_OFFERINGS} from '../src/lib/rch-site-paypal';

const file=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=file('supabase/migrations/20261027033500_rch_sites_external_paypal_offerings.sql');
const api=file('src/app/api/rch-sites/paypal/route.ts');
const manage=file('src/app/network/dashboard/sites/payments/page.tsx');
const publicPage=file('src/app/sites/[slug]/pay/page.tsx');
const site=file('src/app/sites/[slug]/page.tsx');
const shell=file('src/components/sites/RchSiteView.tsx');

describe('Independent PayPal merchant links, zero integration credentials',()=>{
  it('accepts only genuine PayPal Business hosted payment URLs, stripping no unsafe redirection',()=>{
    const good='https://www.paypal.com/ncp/payment/PLB-X7MNK9P2QR8T';
    expect(normalizeOrganizationPayPalLink(good)).toBe(good);
    for(const bad of [
      'https://paypal.com/ncp/payment/PLB-X7MNK9P2QR8T',
      'https://www.paypal.com.evil.com/ncp/payment/PLB-X7MNK9P2QR8T',
      'http://www.paypal.com/ncp/payment/PLB-X7MNK9P2QR8T',
      'https://www.paypal.com@evil.com/ncp/payment/PLB-X7MNK9P2QR8T',
      'https://www.paypal.com/ncp/payment/PLB-X7MNK9P2QR8T?redirect=evil.com',
      'https://www.paypal.com/ncp/payment/PLB-X7MNK9P2QR8T#hack',
      'https://www.paypal.com/signin',
      'https://www.paypal.com/cgi-bin/webscr?cmd=_xclick',
      'https://paypal.me/person',
      'javascript:alert(1)',
      '/relative',
      '',
      null,
    ])expect(normalizeOrganizationPayPalLink(bad)).toBeNull();
  });
  it('validates display copy and capped USD amounts, with no payee override',()=>{
    const form=normalizePayPalOffering({
      title:'<b>AAU Camp</b>',description:'Fall tryouts',
      amountCents:3500,paymentUrl:'https://www.paypal.com/ncp/payment/F3YMU2ZGT49XX',
      payee:'my-rch@example.com',owner:'global_admin',token:'secret',
    });
    expect(form).toEqual({
      title:'AAU Camp',description:'Fall tryouts',amount_cents:3500,currency:'USD',
      payment_url:'https://www.paypal.com/ncp/payment/F3YMU2ZGT49XX',
    });
    expect(MAX_PAYPAL_OFFERINGS).toBe(12);
    expect(normalizePayPalOffering({title:'Camp',amountCents:1.5,paymentUrl:form?.payment_url})).toBeNull();
    expect(normalizePayPalOffering({title:'Camp',amountCents:2000000,paymentUrl:form?.payment_url})).toBeNull();
  });
  it('separates external links from RCH subscriptions, Stripe Connect and automated payment state',()=>{
    expect(migration).toContain('rch_site_paypal_offerings');
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('revoke all on public.rch_site_paypal_offerings');
    expect(migration).toContain('grant select on public.rch_site_paypal_offerings to anon,authenticated');
    expect(migration).toContain("s.status='published'");
    expect(api).toContain('sameOrigin(request)');
    expect(api).toContain('getAuthenticatorAssuranceLevel()');
    expect(api).toContain("member?.status!=='active'");
    expect(api).toContain("['owner','manager']");
    expect(api).toContain('normalizePayPalOffering(raw)');
    expect(api).toContain("eq('organization_id',raw.organizationId)");
    expect(api).not.toContain('STRIPE_SECRET_KEY');
    expect(api).not.toContain('paypal_client_secret');
    expect(api).not.toContain('refresh_token');
    expect(api).not.toContain("status:'paid'");
    expect(migration).not.toContain('connected_account_id');
    expect(migration).not.toContain('paypal_access_token');
    expect(migration).not.toContain('network_organization_subscriptions');
  });
  it('shows separate PayPal checkout without false booking confirmation',()=>{
    expect(publicPage).toContain('Pay on PayPal');
    expect(publicPage).toContain('normalizeOrganizationPayPalLink');
    expect(publicPage).toContain('Payment does not automatically book a session');
    expect(publicPage).toContain('rel="noopener noreferrer"');
    expect(manage).toContain('Your PayPal. Your earnings.');
    expect(manage).toContain('paypal.com/ncp/payment');
    expect(manage).toContain('separately by RCH');
    expect(shell).toContain('paypalAvailable');
    expect(site).toContain("from('rch_site_paypal_offerings')");
    expect(site).toContain('siteSlug={slug}');
  });
});
