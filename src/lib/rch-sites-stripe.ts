import 'server-only';
import crypto from 'node:crypto';
import {RCH_SITE_PLANS,type RchSiteBillingInterval,type RchSitePlanTier} from '@/lib/rch-sites-plans';

export type PaidRchSiteTier=Exclude<RchSitePlanTier,'free'>;
type PriceMapping={tier:PaidRchSiteTier;interval:RchSiteBillingInterval};
type StripePrice={id:string;currency?:string;unit_amount?:number|null;recurring?:{interval?:string}};
export type RchStripeSubscription={
  id:string;status:string;customer:string|{id?:string}|null;
  metadata?:Record<string,string>;cancel_at_period_end?:boolean;
  items?:{data?:Array<{current_period_end?:number;price?:StripePrice}>};
};
const api='https://api.stripe.com/v1';
const priceKeys:Record<PaidRchSiteTier,Record<RchSiteBillingInterval,string>>={
  amateur:{monthly:'STRIPE_RCH_SITES_PRICE_AMATEUR_MONTHLY',annual:'STRIPE_RCH_SITES_PRICE_AMATEUR_ANNUAL'},
  professional:{monthly:'STRIPE_RCH_SITES_PRICE_PROFESSIONAL_MONTHLY',annual:'STRIPE_RCH_SITES_PRICE_PROFESSIONAL_ANNUAL'},
};
function secret(){return process.env.STRIPE_RCH_SITES_SECRET_KEY?.trim()||null;}
export function rchSitePriceId(tier:PaidRchSiteTier,interval:RchSiteBillingInterval){
  return process.env[priceKeys[tier][interval]]?.trim()||null;
}
export function rchSitePriceMapping(priceId:unknown):PriceMapping|null{
  if(typeof priceId!=='string'||!priceId)return null;
  for(const tier of ['amateur','professional'] as const)
    for(const interval of ['monthly','annual'] as const)
      if(rchSitePriceId(tier,interval)===priceId)return {tier,interval};
  return null;
}
export function rchSiteStripeReady(tier:PaidRchSiteTier,interval:RchSiteBillingInterval){
  return process.env.RCH_SITES_BILLING_ENABLED==='true'&&!!secret()
    &&!!process.env.STRIPE_RCH_SITES_WEBHOOK_SECRET?.trim()
    &&!!rchSitePriceId(tier,interval);
}
async function stripe<T>(path:string,body?:URLSearchParams,idempotencyKey?:string):Promise<T>{
  const key=secret();
  if(!key)throw Error('Website billing is not configured.');
  const response=await fetch(api+path,{
    method:body?'POST':'GET',cache:'no-store',
    headers:{Authorization:'Bearer '+key,
      ...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),
      ...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},
    body,
  });
  const json=await response.json().catch(()=>({})) as {error?:{message?:string}};
  if(!response.ok)throw Error(json.error?.message||'Stripe request failed.');
  return json as T;
}
function siteUrl(){
  // Fixed redirect target: never accept a caller-controlled return URL.
  return (process.env.NEXT_PUBLIC_SITE_URL||'https://richcityhoops.com').replace(/\/$/,'');
}
export function validateRchSitesPrice(price:StripePrice|undefined):PriceMapping|null{
  const mapping=rchSitePriceMapping(price?.id);
  if(!mapping||price?.currency!=='usd'||price?.recurring?.interval!==(mapping.interval==='annual'?'year':'month'))return null;
  const amount=(mapping.interval==='annual'?RCH_SITE_PLANS[mapping.tier].proposedAnnualUsd:RCH_SITE_PLANS[mapping.tier].proposedMonthlyUsd)*100;
  return price?.unit_amount===amount?mapping:null;
}
export async function createRchSitesCheckout(input:{
  organizationId:string;userId:string;email:string;tier:PaidRchSiteTier;
  interval:RchSiteBillingInterval;customerId?:string|null;
}){
  if(!rchSiteStripeReady(input.tier,input.interval))throw Error('Website subscription checkout is not active.');
  const body=new URLSearchParams();
  body.set('mode','subscription');body.set('submit_type','subscribe');
  body.set('success_url',siteUrl()+'/network/dashboard/sites/billing?checkout=success');
  body.set('cancel_url',siteUrl()+'/network/dashboard/sites/billing?checkout=cancelled');
  body.set('client_reference_id',input.organizationId);
  body.set('line_items[0][price]',rchSitePriceId(input.tier,input.interval)!);
  body.set('line_items[0][quantity]','1');
  for(const [key,value] of Object.entries({family:'rch_sites',organization_id:input.organizationId,user_id:input.userId})){
    body.set('metadata['+key+']',value);body.set('subscription_data[metadata]['+key+']',value);
  }
  if(input.customerId)body.set('customer',input.customerId);
  else body.set('customer_email',input.email);
  // A stable short-window key stops accidental repeated taps creating several sessions.
  const windowBucket=Math.floor(Date.now()/300000);
  const idem=crypto.createHash('sha256').update(['rch-sites',input.organizationId,input.tier,input.interval,windowBucket].join(':')).digest('hex');
  return stripe<{id:string;url:string|null}>('/checkout/sessions',body,'rchsites_'+idem);
}
export async function createRchSitesPortal(customerId:string){
  if(process.env.RCH_SITES_BILLING_ENABLED!=='true')throw Error('Website billing is not active.');
  const body=new URLSearchParams();
  body.set('customer',customerId);
  body.set('return_url',siteUrl()+'/network/dashboard/sites/billing');
  const config=process.env.STRIPE_RCH_SITES_PORTAL_CONFIGURATION_ID?.trim();
  if(config)body.set('configuration',config);
  return stripe<{url:string}>('/billing_portal/sessions',body);
}
export async function retrieveRchSitesSubscription(id:string){
  if(!/^sub_[a-zA-Z0-9]+$/.test(id))throw Error('Invalid subscription reference.');
  return stripe<RchStripeSubscription>('/subscriptions/'+encodeURIComponent(id)+'?expand[]=items.data.price');
}
export function parseRchSitesSubscription(sub:RchStripeSubscription){
  const item=sub.items?.data?.[0],mapping=validateRchSitesPrice(item?.price);
  const customerId=typeof sub.customer==='string'?sub.customer:sub.customer?.id||null;
  return {mapping,customerId,subscriptionId:sub.id,organizationId:sub.metadata?.organization_id||null,
    family:sub.metadata?.family||null,status:sub.status,
    priceId:item?.price?.id||null,periodEnd:item?.current_period_end?new Date(item.current_period_end*1000).toISOString():null,
    cancelAtPeriodEnd:!!sub.cancel_at_period_end};
}
export function verifyRchSitesWebhook(payload:string,header:string|null){
  const key=process.env.STRIPE_RCH_SITES_WEBHOOK_SECRET?.trim();
  if(!key||!header)return false;
  const t=header.split(',').map(s=>s.trim()).find(s=>s.startsWith('t='))?.slice(2);
  const signatures=header.split(',').map(s=>s.trim()).filter(s=>s.startsWith('v1=')).map(s=>s.slice(3));
  const timestamp=Number(t);
  if(!Number.isFinite(timestamp)||Math.abs(Date.now()/1000-timestamp)>300)return false;
  const expected=Buffer.from(crypto.createHmac('sha256',key).update(t+'.'+payload).digest('hex'),'hex');
  return signatures.some(s=>/^[a-f\d]{64}$/i.test(s)&&crypto.timingSafeEqual(Buffer.from(s,'hex'),expected));
}
