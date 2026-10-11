import 'server-only';

const API='https://api.stripe.com/v1';
const VERSION='2026-08-26.dahlia';

export function creatorStripeConfigured(){return Boolean(process.env.STRIPE_SECRET_KEY?.trim());}
export function creatorTransfersEnabled(){return process.env.RCH_CREATOR_STRIPE_TRANSFERS_ENABLED==='true'&&creatorStripeConfigured();}

export async function creatorStripeRequest<T>(path:string,options:{method?:'GET'|'POST';body?:URLSearchParams;idempotencyKey?:string}={}):Promise<T>{
  const key=process.env.STRIPE_SECRET_KEY?.trim();
  if(!key)throw new Error('Stripe Connect is not configured.');
  const response=await fetch(API+path,{
    method:options.method??'GET',
    headers:{
      Authorization:'Bearer '+key,'Stripe-Version':VERSION,
      ...(options.body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),
      ...(options.idempotencyKey?{'Idempotency-Key':options.idempotencyKey}:{})
    },
    body:options.body,cache:'no-store'
  });
  const payload=await response.json().catch(()=>({})) as Record<string,any>;
  if(!response.ok)throw new Error(String(payload.error?.message||'Stripe request failed'));
  return payload as T;
}
export type ConnectedAccount={id:string;details_submitted:boolean;payouts_enabled:boolean;capabilities?:{transfers?:string}};
export function creatorSiteOrigin(){
  const site=process.env.NEXT_PUBLIC_SITE_URL?.trim()||'https://richcityhoops.com';
  return site.replace(/\/$/,'');
}
export function verifySameOrigin(request:Request){
  const origin=request.headers.get('origin');
  if(!origin)return true; // Non-browser API clients still require authenticated session.
  try{return new URL(origin).host===new URL(request.url).host;}catch{return false;}
}
