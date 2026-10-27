import {NextResponse} from 'next/server';
import {getServerSupabaseClient} from '@/lib/supabase-server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {getPublicClient} from '@/lib/public-data';
import {isRchSiteSlug} from '@/lib/rch-site-builder';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const bookingTypes=new Set(['training','program','team','tournament','league','facility']);
const durations=new Set([30,45,60,90,120]);
const managerRoles=new Set(['owner','manager']);
const headers={'Cache-Control':'private, no-store'};
function json(data:Record<string,unknown>,status=200){return NextResponse.json(data,{status,headers});}
function safeOrigin(request:Request){
  try{
    const origin=request.headers.get('origin');
    const host=request.headers.get('host');
    if(!origin||!host)return false;
    const parsed=new URL(origin);
    return (parsed.protocol==='https:'||(parsed.protocol==='http:'&&parsed.hostname==='localhost'))
      && parsed.host.toLowerCase()===host.toLowerCase();
  }catch{return false;}
}
function isApproved(org:any){
  return org?.status==='active'&&org?.is_verified===true&&org?.is_claimed===true
    &&org?.network_tier!=='flagship'&&bookingTypes.has(org?.organization_type);
}
async function signedInContext(){
  const client=await getServerSupabaseClient();
  if(!client)return null;
  const {data:{user}}=await client.auth.getUser();
  if(!user)return null;
  const db=client as any;
  const {data:assurance,error:assuranceError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assuranceError||!assurance||(assurance.nextLevel==='aal2'&&assurance.currentLevel!=='aal2'))return null;
  const {data:profile,error:profileError}=await db.from('profiles')
    .select('is_active,onboarding_complete').eq('id',user.id).maybeSingle();
  if(profileError||!profile||profile.is_active!==true||profile.onboarding_complete!==true)return null;
  return {user,db};
}
async function managedOrg(context:NonNullable<Awaited<ReturnType<typeof signedInContext>>>,id:string,admin:any){
  if(!uuid.test(id))return null;
  const {data:member}=await context.db.from('network_organization_members')
    .select('member_role,status').eq('organization_id',id).eq('profile_id',context.user.id)
    .eq('status','active').maybeSingle();
  if(!member||!managerRoles.has(member.member_role))return null;
  const {data:org}=await admin.from('network_organizations')
    .select('id,name,status,is_verified,is_claimed,network_tier,organization_type')
    .eq('id',id).maybeSingle();
  return isApproved(org)?org:null;
}
async function approvedPublished(admin:any,organizationId:string){
  const [{data:site},{data:org}]=await Promise.all([
    admin.from('rch_sites').select('status').eq('organization_id',organizationId).maybeSingle(),
    admin.from('network_organizations').select('status,is_verified,is_claimed,network_tier,organization_type')
      .eq('id',organizationId).maybeSingle(),
  ]);
  return site?.status==='published'&&isApproved(org);
}

export async function GET(request:Request){
  const url=new URL(request.url);
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return json({error:'Appointment scheduling is not configured.'},503);
  const organizationId=url.searchParams.get('organizationId');
  if(organizationId){
    const context=await signedInContext();
    if(!context)return json({error:'Sign in with a completed account to manage availability.'},401);
    if(!await managedOrg(context,organizationId,admin))return json({error:'Organization manager access required.'},403);
    const [{data:services,error:se},{data:slots,error:sl}]=await Promise.all([
      admin.from('rch_site_services').select('id,name,description,duration_minutes,price_cents,status')
        .eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(25),
      admin.from('rch_site_slots').select('id,service_id,starts_at,ends_at,status')
        .eq('organization_id',organizationId).gte('starts_at',new Date().toISOString())
        .order('starts_at',{ascending:true}).limit(200),
    ]);
    if(se||sl)return json({error:'Unable to load appointment scheduling.'},503);
    const ids=(slots??[]).map((slot:any)=>slot.id);
    const {data:bookings,error:be}=ids.length?await admin.from('rch_site_bookings')
      .select('slot_id').in('slot_id',ids).eq('status','confirmed'):{data:[],error:null};
    if(be)return json({error:'Unable to read slot reservations.'},503);
    const bookedIds=new Set((bookings??[]).map((item:any)=>item.slot_id));
    return json({services:services??[],slots:(slots??[]).map((slot:any)=>({...slot,booked:bookedIds.has(slot.id)}))});
  }

  const slug=url.searchParams.get('slug');
  if(!isRchSiteSlug(slug))return json({error:'Select a valid published organization.'},400);
  const db=getPublicClient() as any;
  if(!db)return json({error:'Booking information is unavailable.'},503);
  const {data:site,error:siteError}=await db.from('rch_sites').select('organization_id,slug')
    .eq('slug',slug).eq('status','published').maybeSingle();
  if(siteError)return json({error:'Booking information is unavailable.'},503);
  if(!site)return json({error:'Published organization website not found.'},404);
  const [{data:services,error:se},{data:slots,error:sl}]=await Promise.all([
    db.from('rch_site_services').select('id,name,description,duration_minutes,price_cents')
      .eq('organization_id',site.organization_id).eq('status','active').order('created_at').limit(20),
    db.from('rch_site_slots').select('id,service_id,starts_at,ends_at')
      .eq('organization_id',site.organization_id).eq('status','open')
      .gt('starts_at',new Date(Date.now()+3600000).toISOString())
      .lte('starts_at',new Date(Date.now()+90*86400000).toISOString())
      .order('starts_at',{ascending:true}).limit(120),
  ]);
  if(se||sl)return json({error:'Appointment availability is temporarily unavailable.'},503);
  const ids=(slots??[]).map((row:any)=>row.id);
  const {data:bookings,error:bookingError}=ids.length?await admin.from('rch_site_bookings')
    .select('slot_id').eq('organization_id',site.organization_id).eq('status','confirmed')
    .in('slot_id',ids):{data:[],error:null};
  if(bookingError)return json({error:'Appointment availability is temporarily unavailable.'},503);
  const booked=new Set((bookings??[]).map((b:any)=>b.slot_id));
  let mine:any[]=[];
  const client=await getServerSupabaseClient();
  if(client){
    const {data:{user}}=await client.auth.getUser();
    if(user){
      const {data:mineData}=await (client as any).from('rch_site_bookings')
        .select('id,slot_id,service_id,status,booked_at,slot:rch_site_slots!slot_id(starts_at,ends_at)')
        .eq('organization_id',site.organization_id).eq('client_id',user.id)
        .order('booked_at',{ascending:false}).limit(25);
      mine=mineData??[];
    }
  }
  return json({organizationId:site.organization_id,
    services:services??[],slots:(slots??[]).filter((row:any)=>!booked.has(row.id)),
    myBookings:mine});
}

export async function POST(request:Request){
  if(!safeOrigin(request))return json({error:'Invalid request origin.'},403);
  if(Number(request.headers.get('content-length')||0)>6500)return json({error:'Request too large.'},413);
  const context=await signedInContext();
  if(!context)return json({error:'Sign in and complete account security before booking.'},401);
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return json({error:'Scheduling is temporarily unavailable.'},503);
  let raw:Record<string,unknown>;
  try{
    const input:unknown=await request.json();
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid input');
    raw=input as Record<string,unknown>;
  }catch{return json({error:'Valid JSON is required.'},400);}
  const action=raw.action;
  if(!['createService','createSlot','closeSlot','book','cancelBooking'].includes(String(action)))
    return json({error:'Unsupported appointment action.'},400);

  if(action==='createService'){
    const organizationId=raw.organizationId;
    if(typeof organizationId!=='string'||!await managedOrg(context,organizationId,admin))
      return json({error:'Organization manager access required.'},403);
    const name=typeof raw.name==='string'?raw.name.replace(/<[^>]*>/g,'').trim():'';
    const description=typeof raw.description==='string'?raw.description.replace(/<[^>]*>/g,'').trim():'';
    if(name.length<3||name.length>90||description.length>500||!durations.has(Number(raw.durationMinutes)))
      return json({error:'Enter a service name, optional description, and approved duration.'},400);
    const {count,error:countError}=await admin.from('rch_site_services').select('id',{head:true,count:'exact'})
      .eq('organization_id',organizationId);
    if(countError)return json({error:'Unable to check service limits.'},503);
    if((count??0)>=20)return json({error:'This organization has reached its 20-service limit.'},409);
    const {data,error}=await admin.from('rch_site_services').insert({
      organization_id:organizationId,name,description,duration_minutes:Number(raw.durationMinutes),price_cents:0,
    }).select('id').single();
    return error?json({error:'Unable to create service.'},503):json({status:'created',id:data.id});
  }

  if(action==='createSlot'){
    const organizationId=raw.organizationId;
    if(typeof organizationId!=='string'||!await managedOrg(context,organizationId,admin))
      return json({error:'Organization manager access required.'},403);
    if(typeof raw.serviceId!=='string'||!uuid.test(raw.serviceId))
      return json({error:'Select an existing service.'},400);
    if(typeof raw.startsAt!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(raw.startsAt))
      return json({error:'Provide an exact appointment date and timezone.'},400);
    const begins=new Date(raw.startsAt);
    const starts=begins.getTime();
    if(!Number.isFinite(starts)||starts<Date.now()+2*3600000||starts>Date.now()+90*86400000)
      return json({error:'Choose a time at least 2 hours away, within the next 90 days.'},400);
    const {data:service}=await admin.from('rch_site_services')
      .select('id,duration_minutes,status').eq('id',raw.serviceId)
      .eq('organization_id',organizationId).maybeSingle();
    if(!service||service.status!=='active')return json({error:'Select an active service.'},404);
    const {count,error:countError}=await admin.from('rch_site_slots')
      .select('id',{head:true,count:'exact'}).eq('organization_id',organizationId)
      .eq('status','open').gte('starts_at',new Date().toISOString());
    if(countError)return json({error:'Unable to check calendar capacity.'},503);
    if((count??0)>=120)return json({error:'Limit of 120 upcoming appointment slots reached.'},409);
    const {data,error}=await admin.from('rch_site_slots').insert({
      organization_id:organizationId,service_id:raw.serviceId,
      starts_at:begins.toISOString(),
      ends_at:new Date(starts+service.duration_minutes*60000).toISOString(),
    }).select('id').single();
    if(error)return json({error:['23P01','23505'].includes(error.code)?'This time overlaps another available session.':'Could not add this appointment time.'},
      ['23P01','23505'].includes(error.code)?409:503);
    return json({status:'created',id:data.id});
  }

  if(action==='closeSlot'){
    const organizationId=raw.organizationId;
    if(typeof organizationId!=='string'||!await managedOrg(context,organizationId,admin))
      return json({error:'Organization manager access required.'},403);
    if(typeof raw.slotId!=='string'||!uuid.test(raw.slotId))
      return json({error:'Choose an appointment slot.'},400);
    const {data:slot,error}=await admin.from('rch_site_slots').update({status:'closed'})
      .eq('id',raw.slotId).eq('organization_id',organizationId).eq('status','open')
      .select('id').maybeSingle();
    if(error)return json({error:error.code==='23514'?'A booked appointment cannot be closed.':'Unable to close this appointment.'},error.code==='23514'?409:503);
    return slot?json({status:'closed'}):json({error:'Available slot not found.'},404);
  }

  if(action==='book'){
    if(typeof raw.slotId!=='string'||!uuid.test(raw.slotId)||typeof raw.idempotencyKey!=='string'||!uuid.test(raw.idempotencyKey))
      return json({error:'Choose a valid appointment.'},400);
    const {data:prior}=await admin.from('rch_site_bookings')
      .select('id,slot_id,status').eq('client_id',context.user.id)
      .eq('idempotency_key',raw.idempotencyKey).maybeSingle();
    if(prior)return prior.slot_id===raw.slotId?json({status:prior.status,bookingId:prior.id}):json({error:'This request was already used for another appointment.'},409);
    const {data:slot}=await admin.from('rch_site_slots')
      .select('id,organization_id,service_id,starts_at,status').eq('id',raw.slotId).maybeSingle();
    if(!slot||slot.status!=='open'||new Date(slot.starts_at).getTime()<=Date.now()+3600000)
      return json({error:'This appointment is no longer available.'},409);
    if(!await approvedPublished(admin,slot.organization_id))
      return json({error:'This organization is not accepting bookings.'},403);
    const {data:service}=await admin.from('rch_site_services')
      .select('status,price_cents').eq('id',slot.service_id)
      .eq('organization_id',slot.organization_id).maybeSingle();
    if(!service||service.status!=='active'||service.price_cents!==0)
      return json({error:'This service is not accepting free bookings.'},403);
    const {count,error:limitError}=await admin.from('rch_site_bookings')
      .select('id',{head:true,count:'exact'}).eq('client_id',context.user.id)
      .eq('status','confirmed').limit(8);
    if(limitError)return json({error:'Unable to check booking limits.'},503);
    if((count??0)>=8)return json({error:'Maximum 8 active bookings per RCH account. Cancel an old reservation first.'},409);
    const {data,error}=await admin.from('rch_site_bookings').insert({
      organization_id:slot.organization_id,service_id:slot.service_id,slot_id:slot.id,
      client_id:context.user.id,idempotency_key:raw.idempotencyKey,status:'confirmed',
    }).select('id').single();
    if(error){
      if(error.code==='23505'){
        const {data:retry}=await admin.from('rch_site_bookings').select('id,slot_id,status')
          .eq('client_id',context.user.id).eq('idempotency_key',raw.idempotencyKey).maybeSingle();
        if(retry&&retry.slot_id===raw.slotId)return json({status:retry.status,bookingId:retry.id});
        return json({error:'This appointment was just booked by someone else.'},409);
      }
      return json({error:error.code==='23514'?'This appointment is no longer available.':'Unable to confirm booking.'},error.code==='23514'?409:503);
    }
    return json({status:'confirmed',bookingId:data.id});
  }

  if(action==='cancelBooking'){
    if(typeof raw.bookingId!=='string'||!uuid.test(raw.bookingId))
      return json({error:'Choose a valid reservation.'},400);
    const {data:booking}=await admin.from('rch_site_bookings')
      .select('id,slot_id,status').eq('id',raw.bookingId).eq('client_id',context.user.id).maybeSingle();
    if(!booking)return json({error:'Reservation not found.'},404);
    if(booking.status==='cancelled')return json({status:'cancelled'});
    const {data:slot}=await admin.from('rch_site_slots').select('starts_at').eq('id',booking.slot_id).maybeSingle();
    if(!slot||new Date(slot.starts_at).getTime()<Date.now()+2*3600000)
      return json({error:'Online cancellation closes 2 hours before the session. Contact your organizer.'},409);
    const {error}=await admin.from('rch_site_bookings')
      .update({status:'cancelled',cancelled_at:new Date().toISOString()})
      .eq('id',booking.id).eq('client_id',context.user.id).eq('status','confirmed');
    return error?json({error:'Unable to cancel this appointment.'},503):json({status:'cancelled'});
  }
  return json({error:'Unknown action.'},400);
}
