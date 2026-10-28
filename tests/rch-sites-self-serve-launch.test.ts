import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {normalizeOrganizationPayPalLink} from '../src/lib/rch-site-paypal';

const source=(path:string)=>readFileSync(path,'utf8');
const studio=source('src/app/network/dashboard/sites/page.tsx');
const bookings=source('src/app/network/dashboard/sites/appointments/page.tsx');
const paypal=source('src/app/network/dashboard/sites/payments/page.tsx');

describe('RCH Sites self-service launch experience',()=>{
  it('distinguishes published from unpublished and never exposes an unpublished public link',()=>{
    expect(studio).toContain("const isLive=published?.status==='published'");
    expect(studio).toContain("if(!isLive||!published)return");
    expect(studio).toContain("{isLive?'Published':'Not published'}");
    expect(studio).toContain('{isLive&&published&&');
    expect(studio).toContain("{busy==='publish'?'Publishing…':isLive?'Publish changes':'Publish website'}");
    expect(studio).not.toContain("{published?'Published':'Not published'}");
    expect(studio).not.toContain('{published&&<div className="rounded-xl border border-emerald');
  });
  it('makes free-first setup and the next steps accessible on small screens',()=>{
    expect(studio).toContain('Continue website setup');
    expect(studio).toContain('Your launch checklist');
    expect(studio).toContain('href="#site-design"');
    expect(studio).toContain('href="#site-publish"');
    expect(studio).toContain('href="#site-tools"');
    expect(studio).toContain('href="#site-preview"');
    expect(studio).toContain('xl:hidden');
    for(const link of ['sites/payments','sites/appointments','sites/billing']){
      expect(studio).toContain(link);
    }
  });
  it('never carries appointment service IDs and schedule results across organizations',()=>{
    expect(bookings).toContain('const scheduleRequest=useRef(0)');
    expect(bookings).toContain('requestId!==scheduleRequest.current');
    expect(bookings).toContain("setForm(f=>({...f,serviceId:'',startsAt:''}))");
    expect(bookings).toContain('const activeServices=services.filter');
    expect(bookings).toContain('payload.serviceId=serviceId');
    expect(bookings).toContain('min={localInputTime(');
    expect(bookings).toContain('Booking setup progress');
  });
  it('validates merchant-owned PayPal links without connecting RCH as the payee',()=>{
    const valid='https://www.paypal.com/ncp/payment/PLB-X7MNK9P2QR8T';
    expect(normalizeOrganizationPayPalLink(valid)).toBe(valid);
    expect(normalizeOrganizationPayPalLink('https://paypal.me/example')).toBeNull();
    expect(paypal).toContain('normalizeOrganizationPayPalLink(form.paymentUrl)');
    expect(paypal).toContain('!verifiedLink');
    expect(paypal).toContain('Verify recipient and item on PayPal');
    expect(paypal).toContain('rel="noopener noreferrer"');
    expect(paypal).not.toContain('STRIPE_SECRET_KEY');
    expect(paypal).not.toContain('PAYPAL_CLIENT_SECRET');
    expect(paypal).not.toContain('connected_account');
    expect(paypal).toContain('cannot verify payments, confirm paid bookings');
  });
});
