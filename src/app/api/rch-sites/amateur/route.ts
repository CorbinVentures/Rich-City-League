import {NextResponse} from 'next/server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {getRchSitesBillingPrincipal,isRchSiteUuid,rchSitesBillingOriginAllowed,
  verifiedRchSiteBillingOrg} from '@/lib/rch-sites-billing-auth';
import {effectiveRchSiteBillingStatus,type RchSiteBillingStatus} from '@/lib/rch-sites-plans';
import {isRchSiteSlug} from '@/lib/rch-site-builder';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const send=(data:Record<string,unknown>,status=200)=>NextResponse.json(data,{status,headers});
const programTypes=new Set(['training','team','tryout','camp']);
const durations=new Set([30,45,60,90,120,180,240]);
function normalizedName(value:unknown){return typeof value==='string'
  ?value.replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,90):'';}
function problem(err:{code?:string}|null,defaultMessage:string){
  if(err?.code==='P0001')return send({error:'Program capacity or website plan allowance reached.'},409);
  if(['23505','23514','23P01','23503'].includes(err?.code??''))
    return send({error:'This program, participant, coach or session is unavailable.'},409);
  return send({error:defaultMessage},503);
}
/** Paid website entitlement is never inferred from the starter wizard or Network tier. */
async function activeOperations(admin:any,organizationId:string){
  const [{data:flag,error:flagError},{data:plan,error:planError}]=await Promise.all([
    admin.from('rch_site_amateur_rollout').select('enabled,pilot_organization_id').eq('id',true).maybeSingle(),
    admin.from('rch_site_subscriptions').select('tier,billing_status,current_period_end')
      .eq('organization_id',organizationId).maybeSingle(),
  ]);
  if(flagError||planError||!flag)return {ready:false,reason:'unavailable' as const};
  if(!flag.enabled||flag.pilot_organization_id!==organizationId)
    return {ready:false,reason:'pilot' as const};
  const active=plan&&['amateur','professional'].includes(plan.tier)&&
    effectiveRchSiteBillingStatus(plan.tier,
      plan.billing_status as RchSiteBillingStatus,plan.current_period_end)==='active';
  return active?{ready:true,reason:'ok' as const,tier:plan.tier as 'amateur'|'professional'}
    :{ready:false,reason:'subscription' as const};
}
async function publishedOrganization(admin:any,slug:string){
  const {data:site,error}=await admin.from('rch_sites')
    .select('organization_id').eq('slug',slug).eq('status','published').maybeSingle();
  if(error||!site)return null;
  const {data:org, error:orgError}=await admin.from('network_organizations')
    .select('id,status,is_verified,is_claimed,network_tier,organization_type')
    .eq('id',site.organization_id).maybeSingle();
  if(orgError||!org||org.status!=='active'||!org.is_verified||!org.is_claimed
    ||org.network_tier==='flagship'||!['training','program','team','tournament','league','facility'].includes(org.organization_type))return null;
  return site.organization_id as string;
}
async function entitledManager(orgId:string){
  const principal=await getRchSitesBillingPrincipal();
  if(!principal||!isRchSiteUuid(orgId))return null;
  const org=await verifiedRchSiteBillingOrg(principal,orgId);
  return org?{principal,org}:null;
}

export async function GET(request:Request){
  const url=new URL(request.url);
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return send({error:'Basketball program services are unavailable.'},503);
  const organizationId=url.searchParams.get('organizationId');
  if(organizationId!==null){
    const manager=await entitledManager(organizationId);
    if(!manager)return send({error:'Verified organization manager access required.'},403);
    const gate=await activeOperations(admin,organizationId);
    if(!gate.ready)return send({available:false,reason:gate.reason,programs:[],registrations:[],sessions:[],coaches:[]});
    const [{data:programs,error:pErr},{data:registrations,error:rErr},
      {data:sessions,error:sErr},{data:members,error:mErr},{data:site}]=await Promise.all([
      admin.from('rch_site_amateur_programs').select('id,name,kind,capacity,status,created_at')
        .eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(100),
      admin.from('rch_site_amateur_registrations').select('id,program_id,profile_id,status,registered_at')
        .eq('organization_id',organizationId).order('registered_at',{ascending:false}).limit(1500),
      admin.from('rch_site_amateur_sessions').select('id,program_id,coach_profile_id,starts_at,ends_at,status')
        .eq('organization_id',organizationId).gte('starts_at',new Date(Date.now()-86400000).toISOString())
        .order('starts_at',{ascending:true}).limit(600),
      admin.from('network_organization_members').select('profile_id,member_role')
        .eq('organization_id',organizationId).eq('status','active').in('member_role',['owner','manager','editor']).limit(100),
      admin.from('rch_sites').select('slug,status').eq('organization_id',organizationId).maybeSingle(),
    ]);
    if(pErr||rErr||sErr||mErr)return send({error:'Could not read this organization’s program records.'},503);
    const ids=[...new Set([...(registrations??[]).map((r:any)=>r.profile_id),
      ...(members??[]).map((m:any)=>m.profile_id)])] as string[];
    const {data:people,error:peopleError}=ids.length
      ?await admin.from('profiles').select('id,display_name').in('id',ids.slice(0,1500))
      :{data:[],error:null};
    if(peopleError)return send({error:'Could not read program roster names.'},503);
    const names=Object.fromEntries((people??[]).map((p:any)=>[p.id,p.display_name||'RCH member']));
    return send({available:true,tier:gate.tier,programs:programs??[],registrations:registrations??[],
      sessions:sessions??[],coaches:(members??[]).map((m:any)=>({...m,name:names[m.profile_id]||'Coach'})),
      names,slug:site?.status==='published'?site.slug:null});
  }
  const slug=url.searchParams.get('slug');
  if(!isRchSiteSlug(slug))return send({error:'Choose an organization website.'},400);
  const orgId=await publishedOrganization(admin,slug);
  if(!orgId)return send({error:'Published organization website not found.'},404);
  const gate=await activeOperations(admin,orgId);
  // An adult must retain access to their own withdrawal controls after
  // the paid subscription ends or the pilot is paused.
  const principal=await getRchSitesBillingPrincipal();
  let mine:string[]=[];
  let myPrograms:Array<{id:string;name:string}>=[];
  if(principal&&gate.reason!=='unavailable'){
    const {data,error:mineError}=await admin.from('rch_site_amateur_registrations')
      .select('program_id').eq('organization_id',orgId)
      .eq('profile_id',principal.user.id).eq('status','registered').limit(100);
    if(mineError)return send({error:'Could not load your registrations.'},503);
    mine=(data??[]).map((x:any)=>x.program_id);
    if(mine.length){
      const {data:owned,error:ownedError}=await admin.from('rch_site_amateur_programs')
        .select('id,name').eq('organization_id',orgId).in('id',mine);
      if(ownedError)return send({error:'Could not load your registrations.'},503);
      myPrograms=owned??[];
    }
  }
  if(!gate.ready)return send({available:false,reason:gate.reason,programs:[],sessions:[],
    myProgramIds:mine,myPrograms});
  const [{data:programs,error:pErr},{data:sessions,error:sErr}]=await Promise.all([
    admin.from('rch_site_amateur_programs').select('id,name,kind,capacity')
      .eq('organization_id',orgId).eq('status','open').order('created_at',{ascending:false}).limit(60),
    admin.from('rch_site_amateur_sessions').select('program_id,starts_at,ends_at')
      .eq('organization_id',orgId).eq('status','scheduled')
      .gte('starts_at',new Date().toISOString()).order('starts_at',{ascending:true}).limit(100),
  ]);
  if(pErr||sErr)return send({error:'Unable to list basketball programs.'},503);
  return send({available:true,programs:programs??[],sessions:sessions??[],
    myProgramIds:mine,myPrograms});
}

export async function POST(request:Request){
  if(!rchSitesBillingOriginAllowed(request))return send({error:'Invalid request origin.'},403);
  if(Number(request.headers.get('content-length')||0)>4096)return send({error:'Request too large.'},413);
  let raw:Record<string,unknown>;
  try{
    const parsed:unknown=await request.json();
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Invalid');
    raw=parsed as Record<string,unknown>;
  }catch{return send({error:'Valid JSON is required.'},400);}
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return send({error:'Basketball program services are unavailable.'},503);
  const action=raw.action;
  if(action==='register'||action==='withdraw'){
    const principal=await getRchSitesBillingPrincipal();
    if(!principal)return send({error:'An active, confirmed RCH account is required.'},401);
    if(!isRchSiteUuid(raw.programId))return send({error:'Choose a valid basketball program.'},400);
    if(action==='withdraw'){
      // Withdrawal is possible even after subscriptions expire or rollout is stopped.
      const {data,error}=await admin.from('rch_site_amateur_registrations')
        .update({status:'withdrawn'}).eq('program_id',raw.programId)
        .eq('profile_id',principal.user.id).eq('status','registered').select('id').maybeSingle();
      if(error)return problem(error,'Unable to withdraw registration.');
      return data?send({status:'withdrawn'}):send({error:'Active registration not found.'},404);
    }
    if(!isRchSiteSlug(raw.slug))return send({error:'Choose a published organization.'},400);
    const orgId=await publishedOrganization(admin,raw.slug);
    if(!orgId)return send({error:'Organization website not available.'},404);
    const gate=await activeOperations(admin,orgId);
    if(!gate.ready)return send({error:'This organization is not accepting program registrations.'},403);
    const {data:profile,error:profileError}=await admin.from('profiles')
      .select('date_of_birth').eq('id',principal.user.id).maybeSingle();
    const dob=profile?.date_of_birth;
    const today=new Date(),maxBirth=new Date(Date.UTC(today.getUTCFullYear()-18,today.getUTCMonth(),today.getUTCDate())).toISOString().slice(0,10);
    if(profileError||typeof dob!=='string'||dob>maxBirth)
      return send({error:'Only adult RCH accounts with a completed date of birth may register.'},403);
    const {data:program,error:programError}=await admin.from('rch_site_amateur_programs')
      .select('id,status').eq('id',raw.programId).eq('organization_id',orgId).maybeSingle();
    if(programError||!program||program.status!=='open')return send({error:'Program registration is closed.'},409);
    const {data:previous}=await admin.from('rch_site_amateur_registrations')
      .select('id,status').eq('program_id',program.id).eq('profile_id',principal.user.id).maybeSingle();
    if(previous?.status==='registered')return send({status:'registered'});
    const write=previous?
      await admin.from('rch_site_amateur_registrations').update({status:'registered'})
        .eq('id',previous.id).eq('organization_id',orgId).eq('profile_id',principal.user.id).select('id').single():
      await admin.from('rch_site_amateur_registrations').insert({
        organization_id:orgId,program_id:program.id,profile_id:principal.user.id,status:'registered',
      }).select('id').single();
    if(write.error)return problem(write.error,'Unable to register for this program.');
    return send({status:'registered'});
  }
  if(!isRchSiteUuid(raw.organizationId))return send({error:'Choose an organization.'},400);
  const manager=await entitledManager(raw.organizationId);
  if(!manager)return send({error:'Verified organization manager access required.'},403);
  const gate=await activeOperations(admin,raw.organizationId);
  // Keep safety-critical closure/cancellation available to verified managers
  // after a paid-period lapse or pilot rollback. DB triggers allow only
  // open→closed and scheduled→cancelled in those circumstances.
  const safeClosure=action==='closeProgram'||action==='cancelSession';
  if(!gate.ready&&!safeClosure)
    return send({error:'Amateur basketball operations are not enabled for this website plan.'},403);
  const organizationId=raw.organizationId;
  if(action==='createProgram'){
    const name=normalizedName(raw.name),kind=raw.kind;
    const capacity=Number(raw.capacity);
    if(name.length<3||name.length>90||!programTypes.has(String(kind))
      ||!Number.isSafeInteger(capacity)||capacity<1||capacity>100)
      return send({error:'Choose a program name, basketball type and capacity from 1 to 100.'},400);
    const {data,error}=await admin.from('rch_site_amateur_programs').insert({
      organization_id:organizationId,name,kind,capacity,
    }).select('id').single();
    return error?problem(error,'Unable to create basketball program.'):send({status:'created',id:data.id});
  }
  if(action==='closeProgram'){
    if(!isRchSiteUuid(raw.programId))return send({error:'Choose a program.'},400);
    const {data,error}=await admin.from('rch_site_amateur_programs').update({status:'closed'})
      .eq('id',raw.programId).eq('organization_id',organizationId).eq('status','open')
      .select('id').maybeSingle();
    return error?problem(error,'Unable to close program.'):data?send({status:'closed'}):send({error:'Open program not found.'},404);
  }
  if(action==='createSession'){
    if(!isRchSiteUuid(raw.programId)||!isRchSiteUuid(raw.coachProfileId))
      return send({error:'Choose a program and authorized coach.'},400);
    if(typeof raw.startsAt!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(raw.startsAt))
      return send({error:'Choose a time with a timezone.'},400);
    const start=Date.parse(raw.startsAt),duration=Number(raw.durationMinutes);
    if(!Number.isFinite(start)||start<Date.now()+7200000||start>Date.now()+180*86400000
      ||!durations.has(duration))return send({error:'Schedule a 30–240 minute session within 180 days.'},400);
    const {data,error}=await admin.from('rch_site_amateur_sessions').insert({
      organization_id:organizationId,program_id:raw.programId,coach_profile_id:raw.coachProfileId,
      starts_at:new Date(start).toISOString(),ends_at:new Date(start+duration*60000).toISOString(),
    }).select('id').single();
    return error?problem(error,'Unable to schedule the basketball session.'):send({status:'scheduled',id:data.id});
  }
  if(action==='cancelSession'){
    if(!isRchSiteUuid(raw.sessionId))return send({error:'Choose a session.'},400);
    const {data,error}=await admin.from('rch_site_amateur_sessions').update({status:'cancelled'})
      .eq('id',raw.sessionId).eq('organization_id',organizationId).eq('status','scheduled')
      .select('id').maybeSingle();
    return error?problem(error,'Unable to cancel this session.'):data?send({status:'cancelled'}):send({error:'Scheduled session not found.'},404);
  }
  return send({error:'Unsupported basketball program action.'},400);
}
