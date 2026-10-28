import 'server-only';
import crypto from 'node:crypto';
import {
  isRchSiteBillingInterval,isRchSitePlanTier,RCH_SITE_PLANS,
  type RchSiteBillingInterval,type RchSitePlanTier,
} from '@/lib/rch-sites-plans';

export type PaidRchSiteTier=Exclude<RchSitePlanTier,'free'>;
const stripeApi='https://api.stripe.com/v1';
const stripeVersion='2026-08-26.dahlia';
const stripePricePattern=/^price_[a-zA-Z0-9_]+$/;
const productionUrl='https://richcityhoops.com';

function secret(){return process.env.STRIPE_SECRET_KEY?.trim()||'';}
function webhookSecret(){return process.env.RCH_SITES_STRIPE_WEBHOOK_SECRET?.trim()||'';}
function price(tier:PaidRchSiteTier,interval:RchSiteBillingInterval){
  const map={
    amateur:{monthly:process.env.RCH_SITES_PRICE_AMATEUR_MONTHLY,annual:process.env.RCH_SITES_PRICE_AMATEUR_ANNUAL},
    professional:{monthly:process.env.RCH_SITES_PRICE_PROFESSIONAL_MONTHLY,annual:process.env.RCH_SITES_PRICE_PROFESSIONAL_ANNUAL},
  };
  const id=map[tier][interval]?.trim()||'';
  return stripePricePattern.test(id)?id:null;
}
export function isPaidRchSiteTier(v:unknown):v is PaidRchSiteTier{
  return isRchSitePlanTier(v)&&v!=='free';
}
export function rchSitesBillingEnabled(){
  // A second explicit release switch is required in addition to verified pricing.
  return process.env.RCH_SITES_BILLING_ENABLED==='true'
    &&secret().startsWith('sk_')
    &&Boolean(webhookSecret())
    &&(['amateur','professional'] as const).every(t=>
      (['monthly','annual'] as const).every(interval=>Boolean(price(t,interval))));
}
export function rchSitesPrice(tier:PaidRchSiteTier,interval:RchSiteBillingInterval){
  return price(tier,interval);
}
export function rchSitesTierForPrice(priceId:unknown){
  if(typeof priceId!=='string'||!stripePricePattern.test(priceId))return null;
  for(const tier of ['amateur','professional'] as const)
    for(const interval of ['monthly','annual'] as const)
      if(price(tier,interval)===priceId)return {tier,interval};
  return null;
}
export function isValidRchBillingSelection(tier:unknown,interval:unknown){
  return isPaidRchSiteTier(tier)&&isRchSiteBillingInterval(interval);
}
export function verifyRchSitesStripeSignature(body:string,signature:string|null,nowSeconds=Math.floor(Date.now()/1000)){
  const secretValue=webhookSecret();
  if(!secretValue||!signature||body.length>250000)return false;
  const fields=signature.split(',').map(v=>v.trim().split('='));
  const timestamp=fields.find(([k])=>k==='t')?.[1]??'';
  if(!/^\d{10,}$/.test(timestamp))return false;
  const epoch=Number(timestamp);
  if(!Number.isSafeInteger(epoch)||Math.abs(nowSeconds-epoch)>300)return false;
  const expected=crypto.createHmac('sha256',secretValue)
    .update(timestamp+'.'+body,'utf8').digest();
  return fields.some(([k,v])=>{
    if(k!=='v1'||!v||!/^[0-9a-f]{64}$/i.test(v))return false;
    return crypto.timingSafeEqual(expected,Buffer.from(v,'hex'));
  });
}

async function requestStripe<T>(path:string,init:{method?:'GET'|'POST';body?:URLSearchParams;idempotencyKey?:string}={}):Promise<T>{
  const key=secret();
  if(!key)throw new Error('Stripe site subscriptions are not configured.');
  const res=await fetch(stripeApi+path,{
    method:init.method??'GET',cache:'no-store',body:init.body,
    headers:{
      Authorization:'Bearer '+key,
      'Stripe-Version':stripeVersion,
      ...(init.body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),
      ...(init.idempotencyKey?{'Idempotency-Key':init.idempotencyKey}:{})
    }
  });
  const response=await res.json().catch(()=>({})) as Record<string,any>;
  if(!res.ok)throw new Error('Stripe API error '+res.status+': '+(response.error?.code||'request_failed'));
  return response as T;
}
type StripeRef=string|{id?:string}|null|undefined;
export function stripeRefId(ref:StripeRef):string|null{
  return typeof ref==='string'?ref:(ref?.id??null);
}

export type RchStripeSubscription={
  id:string;status:string;customer:StripeRef;
  metadata?:Record<string,string>;
  cancel_at_period_end?:boolean;
  items?:{data?:Array<{current_period_start?:number;current_period_end?:number;price?:{id?:string;currency?:string;unit_amount?:number|null;recurring?:{interval?:string}}}>};
  latest_invoice?:{id?:string;status?:string;paid?:boolean}|string|null;
  current_period_end?:number;
};

export async function fetchRchSitesSubscription(id:string):Promise<RchStripeSubscription>{
  if(!/^sub_[a-zA-Z0-9_]+$/.test(id))throw new Error('Invalid Stripe subscription reference.');
  return requestStripe<RchStripeSubscription>(
    '/subscriptions/'+encodeURIComponent(id)+'?expand%5B%5D=latest_invoice');
}
export async function createRchSitesCheckout(input:{
  intentId:string;organizationId:string;email:string;userId:string;
  tier:PaidRchSiteTier;interval:RchSiteBillingInterval;customerId?:string|null;
}){
  if(!rchSitesBillingEnabled())throw new Error('Website subscriptions are not accepting checkout.');
  const priceId=rchSitesPrice(input.tier,input.interval);
  if(!priceId)throw new Error('Website plan is unavailable.');
  if(input.customerId&&!/^cus_[a-zA-Z0-9_]+$/.test(input.customerId))
    throw new Error('Invalid existing Stripe customer reference.');
  const site=(process.env.NEXT_PUBLIC_SITE_URL||productionUrl).replace(/\/$/,'');
  const body=new URLSearchParams();
  body.set('mode','subscription');
  body.set('expires_at',String(Math.floor(Date.now()/1000)+1800));
  body.set('success_url',site+'/network/dashboard/sites/billing?checkout=success');
  body.set('cancel_url',site+'/network/dashboard/sites/billing?checkout=cancelled');
  body.set('line_items[0][price]',priceId);
  body.set('line_items[0][quantity]','1');
  body.set('client_reference_id',input.organizationId);
  // Deliberately no allow_promotion_codes: founding discount is not live.
  body.set('metadata[rch_product]','sites');
  body.set('metadata[site_billing_intent_id]',input.intentId);
  body.set('subscription_data[metadata][rch_product]','sites');
  body.set('subscription_data[metadata][site_billing_intent_id]',input.intentId);
  if(input.customerId)body.set('customer',input.customerId);
  else body.set('customer_email',input.email);
  return requestStripe<{id:string;url:string|null}>('/checkout/sessions',{
    method:'POST',body,idempotencyKey:'rch_site_checkout_'+input.intentId,
  });
}
export async function createRchSitesPortal(customerId:string){
  if(!secret())throw new Error('Stripe customer portal is not configured.');
  // Dedicated portal config MUST disable switching website pricing tiers until
  // server-side plan-change reconciliation and proration policy are reviewed.
  const config=process.env.RCH_SITES_STRIPE_PORTAL_CONFIGURATION_ID?.trim()||'';
  if(!/^bpc_[a-zA-Z0-9_]+$/.test(config))throw new Error('Restricted RCH Sites portal has not been configured.');
  if(!/^cus_[a-zA-Z0-9_]+$/.test(customerId))throw new Error('Invalid Stripe customer reference.');
  const site=(process.env.NEXT_PUBLIC_SITE_URL||productionUrl).replace(/\/$/,'');
  const form=new URLSearchParams();
  form.set('configuration',config);
  form.set('customer',customerId);
  form.set('return_url',site+'/network/dashboard/sites/billing');
  return requestStripe<{url:string}>('/billing_portal/sessions',{method:'POST',body:form});
}
export function stripeSiteSubscriptionState(sub:RchStripeSubscription){
  const invoice=typeof sub.latest_invoice==='object'?sub.latest_invoice:null;
  // Do not grant paid access while first/renewal invoice is still unpaid.
  const invoicePaid=invoice?.status==='paid'||invoice?.paid===true;
  const active=sub.status==='active'&&invoicePaid;
  return active?'active':sub.status==='canceled'?'canceled':'past_due';
}

export async function retrieveRchSitesCheckout(id:string){
  if(!/^cs_(test_)?[a-zA-Z0-9_]+$/.test(id))throw new Error('Invalid checkout session reference.');
  return requestStripe<{id:string;status:'open'|'complete'|'expired';url:string|null}>(
    '/checkout/sessions/'+encodeURIComponent(id));
}
export function verifyRchSitesStripePrice(sub:RchStripeSubscription){
  const items=sub.items?.data??[];
  if(items.length!==1)return null;
  const p=items[0]?.price;
  const plan=rchSitesTierForPrice(p?.id);
  if(!p||!plan||p.currency!=='usd'
     ||p.unit_amount!==RCH_SITE_PLANS[plan.tier][plan.interval==='annual'?'proposedAnnualUsd':'proposedMonthlyUsd']*100
     ||p.recurring?.interval!==(plan.interval==='annual'?'year':'month'))return null;
  return {...plan,currentPeriodEnd:items[0].current_period_end??sub.current_period_end};
}
