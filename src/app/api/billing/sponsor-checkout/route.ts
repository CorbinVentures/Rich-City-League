import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createStripeSponsorCheckoutSession } from '@/lib/stripe-billing';
import { isSelfServeSponsorProduct, sponsorInventoryByCode } from '@/lib/sponsorship';
import { NETWORK_REGIONS } from '@/lib/network-taxonomy';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const AGREEMENT_VERSION='rch-digital-sponsor-v1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CheckoutInput={
  organizationId?:unknown;
  productCode?:unknown;
  region?:unknown;
  headline?:unknown;
  destinationUrl?:unknown;
  agreementAccepted?:unknown;
};

export async function POST(request:Request){
  const supabase=await getServerSupabaseClient();
  if(!supabase)return NextResponse.json({error:'Sponsor checkout is temporarily unavailable.'},{status:503});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Sign in to purchase an RCH campaign.'},{status:401});

  let input:CheckoutInput={};
  try{input=await request.json();}catch{return NextResponse.json({error:'Valid JSON is required.'},{status:400});}
  const organizationId=typeof input.organizationId==='string'?input.organizationId.trim():'';
  const productCode=typeof input.productCode==='string'?input.productCode.trim():'';
  const region=typeof input.region==='string'?input.region.trim():'';
  const headline=typeof input.headline==='string'?input.headline.trim():'';
  const destinationUrl=typeof input.destinationUrl==='string'?input.destinationUrl.trim():'';

  if(!UUID.test(organizationId))return NextResponse.json({error:'Choose a valid sponsor organization.'},{status:400});
  const product=sponsorInventoryByCode(productCode);
  if(!product||!isSelfServeSponsorProduct(product)||!product.durationDays||!product.startingPriceCents){
    return NextResponse.json({error:'That sponsorship package is not available for direct checkout.'},{status:400});
  }
  if(!NETWORK_REGIONS.some(item=>item.value===region))return NextResponse.json({error:'Choose a valid Virginia target region.'},{status:400});
  if(headline.length<4||headline.length>160)return NextResponse.json({error:'Headline must be between 4 and 160 characters.'},{status:400});
  if(destinationUrl.length>1200)return NextResponse.json({error:'Destination link is too long.'},{status:400});
  let parsedUrl:URL;
  try{parsedUrl=new URL(destinationUrl);}catch{return NextResponse.json({error:'Enter a valid HTTPS destination link.'},{status:400});}
  if(parsedUrl.protocol!=='https:'||parsedUrl.username||parsedUrl.password)return NextResponse.json({error:'Destination links must use HTTPS and cannot contain embedded credentials.'},{status:400});
  if(input.agreementAccepted!==true)return NextResponse.json({error:'Confirm the digital campaign terms before checkout.'},{status:400});

  const userDb=supabase as any;
  const {data:membership,error:membershipError}=await userDb.from('network_organization_members')
    .select('organization_id,member_role,status')
    .eq('organization_id',organizationId)
    .eq('profile_id',user.id)
    .eq('status','active')
    .maybeSingle();
  if(membershipError)return NextResponse.json({error:'Unable to verify sponsor organization access.'},{status:500});
  if(!membership||!['owner','manager'].includes(membership.member_role))return NextResponse.json({error:'An active organization owner or manager is required to purchase a campaign.'},{status:403});

  const {data:organization,error:organizationError}=await userDb.from('network_organizations')
    .select('id,name,status')
    .eq('id',organizationId)
    .eq('status','active')
    .maybeSingle();
  if(organizationError)return NextResponse.json({error:'Unable to verify the sponsor organization.'},{status:500});
  if(!organization)return NextResponse.json({error:'This organization is not available for sponsorship checkout.'},{status:404});

  const admin=getSupabaseAdminClient() as any;
  if(!admin)return NextResponse.json({error:'Sponsor order storage is temporarily unavailable.'},{status:503});

  const campaignId=crypto.randomUUID();
  const acceptedAt=new Date().toISOString();
  const startsAt=new Date();
  const endsAt=new Date(startsAt.getTime()+product.durationDays*24*60*60*1000);
  const {error:campaignError}=await admin.from('network_campaigns').insert({
    id:campaignId,
    organization_id:organizationId,
    name:(product.name+' — '+headline).slice(0,180),
    objective:product.objective,
    package:product.package,
    requested_placement:product.placement,
    destination_url:destinationUrl,
    headline,
    requested_starts_at:startsAt.toISOString(),
    requested_ends_at:endsAt.toISOString(),
    requested_budget_cents:product.startingPriceCents,
    target_regions:region==='statewide'?['statewide']:[region],
    status:'pending',
    created_by:user.id,
    entitlement_source:'purchase',
    payment_status:'pending',
  });
  if(campaignError){
    console.error('Unable to create sponsor checkout campaign',campaignError);
    return NextResponse.json({error:'Unable to reserve this campaign. Please try again.'},{status:500});
  }

  try{
    const session=await createStripeSponsorCheckoutSession({
      campaignId,
      productCode:product.code,
      productName:product.name,
      description:product.description,
      durationDays:product.durationDays,
      priceCents:product.startingPriceCents,
      email:user.email,
      agreementVersion:AGREEMENT_VERSION,
      agreementAcceptedAt:acceptedAt,
    });
    if(!session.url)throw new Error('Stripe did not return a checkout URL.');
    const {data:updated,error:updateError}=await admin.from('network_campaigns')
      .update({stripe_checkout_session_id:session.id})
      .eq('id',campaignId)
      .eq('payment_status','pending')
      .select('id')
      .maybeSingle();
    if(updateError||!updated)throw updateError||new Error('Campaign checkout could not be linked.');
    return NextResponse.json({url:session.url,campaignId});
  }catch(error){
    await admin.from('network_campaigns').update({status:'cancelled'}).eq('id',campaignId);
    console.error('Unable to create sponsor checkout session',error);
    return NextResponse.json({error:'Secure checkout could not be started. No charge was made.'},{status:502});
  }
}
