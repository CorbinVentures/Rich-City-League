import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import crypto from 'node:crypto';

vi.mock('server-only',()=>({}));

const env={
  STRIPE_SECRET_KEY:'sk_test_mock_only_not_a_real_credential',
  RCH_SITES_BILLING_ENABLED:'true',
  RCH_SITES_STRIPE_WEBHOOK_SECRET:'whsec_isolated_fixture_only',
  RCH_SITES_STRIPE_PORTAL_CONFIGURATION_ID:'bpc_isolatedFixture',
  RCH_SITES_PRICE_AMATEUR_MONTHLY:'price_rchAmateurM',
  RCH_SITES_PRICE_AMATEUR_ANNUAL:'price_rchAmateurY',
  RCH_SITES_PRICE_PROFESSIONAL_MONTHLY:'price_rchProfessionalM',
  RCH_SITES_PRICE_PROFESSIONAL_ANNUAL:'price_rchProfessionalY',
};
const importBilling=async()=>import('../src/lib/rch-sites-stripe-billing');

describe('RCH Sites isolated Stripe payment scenarios (no payment provider calls)',()=>{
  beforeEach(()=>{
    for(const [key,value] of Object.entries(env))vi.stubEnv(key,value);
  });
  afterEach(()=>{
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requires explicit enablement and separate price, webhook and restricted portal configuration',async()=>{
    const billing=await importBilling();
    expect(billing.rchSitesBillingEnabled()).toBe(true);
    vi.stubEnv('RCH_SITES_BILLING_ENABLED','false');
    expect(billing.rchSitesBillingEnabled()).toBe(false);
    vi.stubEnv('RCH_SITES_BILLING_ENABLED','true');
    vi.stubEnv('RCH_SITES_STRIPE_WEBHOOK_SECRET','');
    expect(billing.rchSitesBillingEnabled()).toBe(false);
    vi.stubEnv('RCH_SITES_STRIPE_WEBHOOK_SECRET',env.RCH_SITES_STRIPE_WEBHOOK_SECRET);
    vi.stubEnv('RCH_SITES_STRIPE_PORTAL_CONFIGURATION_ID','');
    expect(billing.rchSitesBillingEnabled()).toBe(false);
  });

  it.each([
    ['amateur','monthly','price_rchAmateurM',1900,'month'],
    ['amateur','annual','price_rchAmateurY',19000,'year'],
    ['professional','monthly','price_rchProfessionalM',4900,'month'],
    ['professional','annual','price_rchProfessionalY',49000,'year'],
  ] as const)('validates %s %s amount before issuing hosted checkout',async(tier,interval,id,amount,recurrence)=>{
    const requests:Array<{path:string;method:string;body:string;headers:Headers}>= [];
    vi.stubGlobal('fetch',vi.fn(async (input:string,init?:RequestInit)=>{
      const url=new URL(input),form=String(init?.body??'');
      requests.push({path:url.pathname,method:init?.method??'GET',body:form,headers:new Headers(init?.headers)});
      if(url.pathname==='/v1/prices/'+id)
        return new Response(JSON.stringify({id,active:true,currency:'usd',unit_amount:amount,
          recurring:{interval:recurrence}}),{status:200});
      if(url.pathname==='/v1/checkout/sessions')
        return new Response(JSON.stringify({id:'cs_test_mock',url:'https://checkout.stripe.com/c/pay/mock'}),{status:200});
      throw Error('Unexpected Stripe call '+url.pathname);
    }));
    const billing=await importBilling();
    const result=await billing.createRchSitesCheckout({
      intentId:'11111111-1111-4111-8111-111111111111',
      organizationId:'22222222-2222-4222-8222-222222222222',
      userId:'33333333-3333-4333-8333-333333333333',
      email:'sandbox@example.test',tier,interval,
    });
    expect(result.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
    expect(requests.map(r=>r.path)).toEqual(['/v1/prices/'+id,'/v1/checkout/sessions']);
    const body=new URLSearchParams(requests[1].body);
    expect(body.get('mode')).toBe('subscription');
    expect(body.get('line_items[0][price]')).toBe(id);
    expect(body.get('line_items[0][quantity]')).toBe('1');
    expect(body.get('subscription_data[metadata][rch_product]')).toBe('sites');
    expect(body.has('allow_promotion_codes')).toBe(false);
    expect(requests[1].headers.get('idempotency-key')).toContain('rch_site_checkout_');
  });

  it('rejects an altered Stripe price amount or recurrence before checkout exists',async()=>{
    const calls:string[]=[];
    vi.stubGlobal('fetch',vi.fn(async(input:string)=>{
      const url=new URL(input);calls.push(url.pathname);
      return new Response(JSON.stringify({id:env.RCH_SITES_PRICE_AMATEUR_MONTHLY,
        active:true,currency:'usd',unit_amount:20,recurring:{interval:'year'}}),{status:200});
    }));
    const b=await importBilling();
    await expect(b.createRchSitesCheckout({
      intentId:'11111111-1111-4111-8111-111111111111',
      organizationId:'22222222-2222-4222-8222-222222222222',
      userId:'33333333-3333-4333-8333-333333333333',
      email:'sandbox@example.test',tier:'amateur',interval:'monthly',
    })).rejects.toThrow('does not match the approved');
    expect(calls).toEqual(['/v1/prices/'+env.RCH_SITES_PRICE_AMATEUR_MONTHLY]);
  });

  it('links every paid entitlement to the exact completed Stripe Checkout and organization',async()=>{
    const billing=await importBilling();
    const expected={
      intentId:'11111111-1111-4111-8111-111111111111',
      organizationId:'22222222-2222-4222-8222-222222222222',
      sessionId:'cs_test_fixture',
      subscriptionId:'sub_fixture',
    };
    const checkout={
      id:expected.sessionId,status:'complete' as const,mode:'subscription',
      payment_status:'paid',url:null,subscription:expected.subscriptionId,
      client_reference_id:expected.organizationId,
      metadata:{rch_product:'sites',site_billing_intent_id:expected.intentId},
    };
    expect(billing.isVerifiedRchSitesCheckoutLineage(checkout,expected)).toBe(true);
    for(const altered of [
      {...checkout,status:'open' as const},
      {...checkout,mode:'payment'},
      {...checkout,payment_status:'unpaid'},
      {...checkout,subscription:'sub_unrelated'},
      {...checkout,client_reference_id:'other-organization'},
      {...checkout,metadata:{...checkout.metadata,rch_product:'network'}},
      {...checkout,metadata:{...checkout.metadata,site_billing_intent_id:'other-intent'}},
      {...checkout,id:'cs_test_unrelated'},
    ]){
      expect(billing.isVerifiedRchSitesCheckoutLineage(altered,expected)).toBe(false);
    }
  });

  it('rejects unsigned, tampered, replayed and future-signed webhook payloads',async()=>{
    const b=await importBilling();
    const at=1800000000,body=JSON.stringify({id:'evt_fixture',type:'invoice.paid'});
    const sign=(timestamp:number,text:string)=>{
      const digest=crypto.createHmac('sha256',env.RCH_SITES_STRIPE_WEBHOOK_SECRET)
        .update(timestamp+'.'+text).digest('hex');
      return 't='+timestamp+',v1='+digest;
    };
    expect(b.verifyRchSitesStripeSignature(body,null,at)).toBe(false);
    expect(b.verifyRchSitesStripeSignature(body,sign(at,body),at)).toBe(true);
    expect(b.verifyRchSitesStripeSignature(body+'!',sign(at,body),at)).toBe(false);
    expect(b.verifyRchSitesStripeSignature(body,sign(at-301,body),at)).toBe(false);
    expect(b.verifyRchSitesStripeSignature(body,sign(at+301,body),at)).toBe(false);
    expect(b.verifyRchSitesStripeSignature(body,'t='+at+',v1='+'0'.repeat(64),at)).toBe(false);
  });

  it('only grants a paid subscription after paid invoice and a future billing period',async()=>{
    const b=await importBilling();
    const future=Math.floor(Date.now()/1000)+86400;
    const subscription={
      id:'sub_fixture',status:'active',customer:'cus_fixture',
      latest_invoice:{status:'paid',paid:true},
      items:{data:[{current_period_end:future,price:{
        id:env.RCH_SITES_PRICE_PROFESSIONAL_ANNUAL,unit_amount:49000,currency:'usd',
        recurring:{interval:'year'},
      }}]},
    };
    expect(b.verifyRchSitesStripePrice(subscription)).toMatchObject({tier:'professional',interval:'annual'});
    expect(b.stripeSiteSubscriptionState(subscription)).toBe('active');
    expect(b.stripeSiteSubscriptionState({...subscription,latest_invoice:{status:'open',paid:false}})).toBe('past_due');
    expect(b.stripeSiteSubscriptionState({...subscription,status:'past_due'})).toBe('past_due');
    expect(b.stripeSiteSubscriptionState({...subscription,status:'canceled'})).toBe('canceled');
    expect(b.stripeSiteSubscriptionState({...subscription,items:{data:[{...subscription.items.data[0],current_period_end:future-172800}]}})).toBe('past_due');
    expect(b.verifyRchSitesStripePrice({...subscription,items:{data:[
      {...subscription.items.data[0],price:{...subscription.items.data[0].price,unit_amount:4900}},
    ]}})).toBeNull();
  });
});
