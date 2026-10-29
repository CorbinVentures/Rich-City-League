/**
 * RCH Sites browser lifecycle against LOCAL disposable Supabase only.
 * Uses a real GoTrue session, the real Next.js server and real PostgREST tables.
 * Provisioned test user is deleted on completion; no production access allowed.
 */
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const {createClient}=require('@supabase/supabase-js');

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const origin=process.env.RCH_LOCAL_E2E_ORIGIN||'http://127.0.0.1:3000';
if(!url||!key)throw Error('Isolated E2E requires local Supabase credentials');
if(!['localhost','127.0.0.1'].includes(new URL(url).hostname) ||
   !['localhost','127.0.0.1'].includes(new URL(origin).hostname))
  throw Error('Refusing to create any test account outside localhost');
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const email='rch-browser-'+crypto.randomUUID().slice(0,10)+'@example.test';
const password='RchE2E!'+crypto.randomBytes(18).toString('base64url');
let userId=null;
let browser=null;

async function signin(ctx,label){
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const consoleErrors=[];
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,200));});
  await page.goto(origin+'/website-creator/start',{waitUntil:'domcontentloaded',timeout:45000});
  await page.getByRole('link',{name:/i already have an account/i})
    .waitFor({state:'visible',timeout:25000});
  await page.getByRole('link',{name:/i already have an account/i}).click();
  await page.waitForURL(/\/auth\/sign-in/,{timeout:15000});
  await page.locator('#auth-email').waitFor({state:'visible',timeout:25000});
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(password);
  const authStatuses=[];
  const failedRequests=[];
  page.on('response',response=>{
    if(response.url().includes('/auth/v1/token'))authStatuses.push(response.status());
  });
  page.on('requestfailed',request=>{
    if(request.url().includes(':54321'))failedRequests.push(request.failure()?.errorText||'unknown');
  });
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  try{
    await page.waitForURL(/\/website-creator\/start/,{timeout:25000});
  }catch(error){
    console.error('DEBUG after sign-in:',{url:page.url(),authStatuses,failedRequests,consoleErrors,
      page:(await page.locator('body').innerText()).slice(0,1200),
      pageErrors:errors});
    throw error;
  }
  await page.getByRole('heading',{name:/let.s build your website/i})
    .waitFor({state:'visible',timeout:30000});
  assert.equal(errors.length,0,label+' uncaught page errors: '+errors.join('; '));
  return page;
}

async function main(){
  const create=await admin.auth.admin.createUser({
    email,password,email_confirm:true,
    user_metadata:{first_name:'RCH',last_name:'Test',username:'rch-browser-e2e'},
  });
  if(create.error||!create.data.user)throw Error('Cannot provision local user: '+create.error?.message);
  userId=create.data.user.id;
  // Profile grants are intentionally restrictive in RCH. Only the ephemeral
  // local Postgres test fixture (never app-level or production service_role)
  // may complete the synthetic account's onboarding in this test.
  assert.match(userId,/^[0-9a-f-]{36}$/i);
  const containers=execFileSync('docker',['ps','--format','{{.Names}}'],{encoding:'utf8'});
  const db=containers.split('\n').find(name=>/^supabase_db_[a-z0-9_-]+$/.test(name));
  if(!db)throw Error('No disposable local Supabase container found');
  const username='rch-test-'+crypto.randomBytes(6).toString('hex');
  const sql="insert into public.profiles(id,role,is_active,onboarding_complete,first_name,last_name,username)"+
    " values('"+userId+"','player',true,true,'RCH','Browser Test','"+username+"')"+
    " on conflict(id) do update set is_active=true,onboarding_complete=true";
  execFileSync('docker',['exec',db,'psql','-X','-U','postgres','-d','postgres',
    '-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8'});
  // Validate the real temporary credentials directly with LOCAL GoTrue first,
  // isolating fixture failures from browser routing/cookie regressions.
  const publicKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!publicKey)throw Error('Local anon key is missing');
  const verifier=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error:authError}=await verifier.auth.signInWithPassword({email,password});
  if(authError)throw Error('Local GoTrue credential preflight failed: '+authError.status+' '+authError.message);
  await verifier.auth.signOut();
  console.log('PASS local GoTrue credential preflight');
  const {data:starterProbe,error:starterError}=await admin.from('rch_site_starter_drafts')
    .select('profile_id').eq('profile_id',userId).maybeSingle();
  if(starterError)throw Error('Local RCH starter DB privilege preflight: '+starterError.code+' '+starterError.message);
  console.log('PASS local starter draft table access',starterProbe===null?'empty':'existing');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  // Local Supabase uses http://127.0.0.1:54321, which is intentionally not
  // allowed by RCH production CSP (https://*.supabase.co only). Disable CSP
  // solely for the disposable local browser fixture, never in the website.
  const first=await browser.newContext({viewport:{width:390,height:844},bypassCSP:true});
  let page=await signin(first,'first session');
  // Billing must never authorize an unverified/non-owned organization, even
  // from a valid paid-plan-interested user with a complete RCH profile.
  const deniedBilling=await page.evaluate(async()=>{
    const org='b6220000-0000-4000-8000-000000000099';
    const [checkout,portal,summary]=await Promise.all([
      fetch('/api/rch-sites/billing/checkout',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({organizationId:org,tier:'professional',interval:'annual'}),
      }),
      fetch('/api/rch-sites/billing/portal',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({organizationId:org}),
      }),
      fetch('/api/rch-sites/billing/checkout?organizationId='+org),
    ]);
    return {checkout:checkout.status,portal:portal.status,summary:summary.status};
  });
  assert.deepEqual(deniedBilling,{checkout:403,portal:403,summary:403},
    'Completed user without organization ownership must never access billing routes');
  const unsignedWebhook=await page.request.post(origin+'/api/rch-sites/billing/webhook',{
    data:JSON.stringify({id:'evt_untrusted',type:'invoice.paid'}),
    headers:{'Content-Type':'application/json'},
  });
  assert.equal(unsignedWebhook.status(),400,'Unsigned payment webhooks cannot alter entitlements');
  console.log('PASS isolated billing authorization and unsigned-webhook rejection');
  await page.getByRole('button',{name:/professional/i}).click();
  await page.getByRole('button',{name:/yearly.*save 2 months/i}).click();
  await page.getByRole('button',{name:/customize my site/i}).click();
  const org='CI Trainer '+crypto.randomBytes(4).toString('hex');
  await page.getByRole('textbox',{name:/basketball business/i}).fill(org);
  await page.getByRole('button',{name:/save draft/i}).click();
  await page.getByText('Your private website draft is saved.')
    .waitFor({state:'visible',timeout:20000});
  let {data:draft,error:draftErr}=await admin.from('rch_site_starter_drafts')
    .select('organization_name,desired_slug,preferred_tier,preferred_billing_interval,config')
    .eq('profile_id',userId).maybeSingle();
  if(draftErr||!draft)throw Error('Private draft was not written to database: '+draftErr?.message);
  assert.equal(draft.organization_name,org);
  assert.equal(draft.preferred_tier,'professional');
  assert.equal(draft.preferred_billing_interval,'annual');
  const {count:paidRecords,error:subscriptionError}=await admin.from('rch_site_subscriptions')
    .select('organization_id',{count:'exact',head:true}).eq('tier','professional');
  if(subscriptionError)throw Error('Could not inspect paid entitlements');
  assert.equal(paidRecords,0,'Choosing a price must never create an active paid subscription');
  assert.equal(draft.config.siteType,'trainer');
  console.log('PASS local authenticated save: actual server/API/Postgres persists private draft');

  // A completely fresh browser context is signed out by default. Sign in
  // again to simulate a returning real user without relying on localStorage.
  await first.close();
  const second=await browser.newContext({viewport:{width:1440,height:900},bypassCSP:true});
  page=await signin(second,'returning session');
  await page.getByRole('textbox',{name:/basketball business/i})
    .waitFor({state:'visible',timeout:15000});
  assert.equal(await page.getByRole('textbox',{name:/basketball business/i}).inputValue(),org);
  assert.equal(await page.getByRole('textbox',{name:/your website address/i}).inputValue(),draft.desired_slug);
  await page.getByRole('button',{name:/1\. Your site/i}).click();
  await page.getByRole('button',{name:/professional/i}).waitFor({state:'visible'});
  assert.equal(await page.getByRole('button',{name:/professional/i}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByRole('button',{name:/yearly.*save 2 months/i}).getAttribute('aria-pressed'),'true');
  console.log('PASS local save/resume: fresh authenticated session restores original organization draft');

  // Production/other-tenant URLs must never be available to an unapproved user.
  const attempted=await page.evaluate(async()=>{
    const resp=await fetch('/api/rch-sites/starter',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'import',organizationId:'00000000-0000-4000-8000-000000000001'}),
    });
    return {status:resp.status,json:await resp.json()};
  });
  assert.equal(attempted.status,403,'Import must deny an account without verified org ownership');

  // Organization HQ is tenant-private. An authenticated user with no owned
  // organization must see only the verification/start message, not other
  // organizations' inbox, bookings, prices, customer emails or activity.
  await page.goto(origin+'/network/dashboard/sites/overview',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:/your day, at a glance/i})
    .waitFor({state:'visible',timeout:30000});
  await page.getByRole('heading',{name:/your website starts here/i})
    .waitFor({state:'visible',timeout:20000});
  assert.equal(await page.getByText('New inquiries',{exact:true}).count(),0,
    'An unverified account must not see private organization metrics');
  const rejected=await page.evaluate(async()=>{
    const org='b6220000-0000-4000-8000-000000000099';
    const endpoints=[
      '/api/rch-sites/inquiries?organizationId='+org,
      '/api/rch-sites/appointments?organizationId='+org,
      '/api/rch-sites/paypal?organizationId='+org,
    ];
    return Promise.all(endpoints.map(async url=>(await fetch(url)).status));
  });
  assert.ok(rejected.every(status=>status===401||status===403),
    'Private organization activity APIs must deny unapproved users: '+rejected);
  console.log('PASS local organization HQ: unapproved operator sees no private data; all APIs deny');

  // Free toolkit acceptance: real logged-in owner, real API and disposable DB.
  // This runs only on localhost; never create any organization or submission in production.
  const siteOrg=crypto.randomUUID();
  const outsiderOrg=crypto.randomUUID();
  const siteSlug='toolkit-test-'+crypto.randomBytes(5).toString('hex');
  // Organization verification tables are deliberately server-restricted.
  // Seed ONLY into the disposable local database using its own postgres role.
  const fixtureSql=[
    "insert into public.network_organizations "+
      "(id,slug,name,organization_type,is_claimed,is_verified,status) values "+
      "('"+siteOrg+"','"+siteSlug+"','Toolkit E2E A','training',true,true,'active'),"+
      "('"+outsiderOrg+"','"+siteSlug+"-other','Toolkit E2E B','training',true,true,'active');",
    "insert into public.network_organization_members "+
      "(organization_id,profile_id,member_role,status) values "+
      "('"+siteOrg+"','"+userId+"','owner','active');",
    "insert into public.rch_sites (organization_id,slug,config,status) values "+
      "('"+siteOrg+"','"+siteSlug+"','{\"tagline\":\"Toolkit Test\"}'::jsonb,'published');",
  ].join(' ');
  execFileSync('docker',['exec',db,'psql','-X','-U','postgres','-d','postgres',
    '-v','ON_ERROR_STOP=1','-c',fixtureSql],{encoding:'utf8'});
    async function postToolkit(action,value,revision,extra={}){
    return page.evaluate(async ({organizationId,action,value,revision,extra})=>{
      const response=await fetch('/api/rch-sites/toolkit',{method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({organizationId,action,value,revision,...extra})});
      return {status:response.status,body:await response.json()};
    },{organizationId:siteOrg,action,value,revision,extra});
  }
  const deniedToolkit=await page.evaluate(async id=>
    (await fetch('/api/rch-sites/toolkit?organizationId='+id)).status,outsiderOrg);
  assert.equal(deniedToolkit,403,'Toolkit private data must reject owner from unrelated organization');
  const initial=await page.evaluate(async id=>{
    const r=await fetch('/api/rch-sites/toolkit?organizationId='+id);
    return {status:r.status,body:await r.json()};
  },siteOrg);
  assert.equal(initial.status,200,'Verified Free owner can load toolkit without paying');
  assert.equal(initial.body.project.revision,0);
  const rosters=[
    {id:'team1',name:'Test Lions',players:[{id:'adult1',name:'Test Adult',number:'7'}]},
    {id:'team2',name:'Test Hawks',players:[]},
    {id:'team3',name:'Test Storm',players:[]},
    {id:'team4',name:'Test Thunder',players:[]},
  ];
  let saved=await postToolkit('saveTeams',rosters,0);
  assert.equal(saved.status,200,JSON.stringify(saved.body));
  const games=[
    {id:'game1',homeId:'team1',awayId:'team2',date:'2026-11-03',time:'18:30',court:'Main Court'},
    {id:'game2',homeId:'team3',awayId:'team4',date:'2026-11-03',time:'19:30',court:'Main Court'},
  ];
  saved=await postToolkit('saveGames',[games[0],{...games[1],time:'19:00'}],1);
  assert.equal(saved.status,400,'Half-hour court conflict must be rejected');
  saved=await postToolkit('saveGames',games,1);
  assert.equal(saved.status,200,JSON.stringify(saved.body));
  saved=await postToolkit('publishSchedule',null,2);
  assert.equal(saved.status,200,JSON.stringify(saved.body));
  const publicSchedule=await page.request.get(
    origin+'/api/rch-sites/toolkit/schedule?slug='+siteSlug);
  assert.equal(publicSchedule.status(),200);
  const publicGames=await publicSchedule.json();
  assert.equal(publicGames.games.length,2);
  assert.ok(!JSON.stringify(publicGames).includes('Test Adult'),
    'Public schedule must not expose private player roster details');
  saved=await postToolkit('saveForm',{title:'Adult Basketball Interest',open:true},3);
  assert.equal(saved.status,200,JSON.stringify(saved.body));
  const formResponse=await page.request.get(
    origin+'/api/rch-sites/toolkit/registration?slug='+siteSlug);
  assert.equal(formResponse.status(),200,'The real published Free form is accessible');
  const registrationHeaders={Origin:origin,'Content-Type':'application/json',
    'x-forwarded-for':'203.0.113.123'};
  async function submitContact(i){
    return page.request.post(origin+'/api/rch-sites/toolkit/registration',{
      headers:registrationHeaders,data:JSON.stringify({
        slug:siteSlug,name:'Adult Interest '+i,email:'adult'+i+'@example.test',
        isAdult:true,privacyConsent:true,website:'',
      }),
    });
  }
  for(let i=0;i<5;i++){
    const submitted=await submitContact(i);
    assert.equal(submitted.status(),200,'Interest submission '+i+' should pass');
  }
  const throttled=await submitContact(5);
  assert.equal(throttled.status(),429,'Sixth attempt from one visitor must be throttled');
  const invalidOrigin=await page.request.post(origin+'/api/rch-sites/toolkit/registration',{
    headers:{...registrationHeaders,Origin:'https://attacker.example'},
    data:JSON.stringify({slug:siteSlug,name:'Invalid Request',email:'bad@example.test',
      isAdult:true,privacyConsent:true}),
  });
  assert.equal(invalidOrigin.status(),403,'CSRF origin mismatch must be rejected');
  const contacts=await admin.from('rch_site_toolkit_registrations').select('id,name,email')
    .eq('organization_id',siteOrg);
  assert.ifError(contacts.error);
  assert.equal(contacts.data.length,5);
  const deleted=await postToolkit('deleteRegistration',null,4,
    {registrationId:contacts.data[0].id});
  assert.equal(deleted.status,200,'Owner must be able to delete a contact');
  const {count:remaining,error:remainingError}=await admin.from('rch_site_toolkit_registrations')
    .select('id',{head:true,count:'exact'}).eq('organization_id',siteOrg);
  assert.ifError(remainingError);assert.equal(remaining,4);
  const budget={gymHours:10,gymRateCents:7500,games:10,refsPerGame:2,
    refereeFeeCents:4000,uniforms:0,uniformCostCents:0,otherCents:0,
    teams:8,entryFeeCents:25000};
  saved=await postToolkit('saveBudget',budget,4);
  assert.equal(saved.status,200,JSON.stringify(saved.body));
  await page.goto(origin+'/network/dashboard/sites/toolkit?organizationId='+siteOrg,
    {waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Basketball Toolkit'}).waitFor({timeout:30000});
  await page.getByRole('tab',{name:'Game Day'}).click();
  await page.getByRole('button',{name:'Print / Save as PDF'}).waitFor({state:'visible'});
  assert.equal(await page.getByText('Test Lions vs Test Hawks').count(),1,
    'Game Day Pack must render stored teams and schedule');
  await page.getByRole('tab',{name:'Budget'}).click();
  await page.getByText('Projected cost').waitFor({state:'visible'});
  assert.ok((await page.locator('body').innerText()).includes('$1,550.00'),
    'Budget should show computed expense totals');
  await page.getByRole('tab',{name:'Registration'}).click();
  assert.ok((await page.locator('svg').count())>0,
    'Registration page should render QR code for published site');
  console.log('PASS isolated Free toolkit: owner and tenant permissions, schedule, QR, adult intake throttling, contact deletion, Game Day Pack, and budget');
  await second.close();
  console.log('PASS local authorization: unauthorized import rejected with HTTP 403');
  console.log('Isolated RCH Sites save/resume browser lifecycle passed.');
}
main().catch(error=>{
  console.error('FAIL isolated browser lifecycle:',error.message);
  process.exitCode=1;
}).finally(async()=>{
  if(browser)await browser.close();
  if(userId){
    const {error}=await admin.auth.admin.deleteUser(userId);
    if(error){console.error('Failed to cleanup local test user:',error.message);process.exitCode=1;}
  }
});
