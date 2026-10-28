/**
 * RCH Sites browser lifecycle against LOCAL disposable Supabase only.
 * Uses a real GoTrue session, the real Next.js server and real PostgREST tables.
 * Provisioned test user is deleted on completion; no production access allowed.
 */
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
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
  await page.goto(origin+'/website-creator/start',{waitUntil:'domcontentloaded',timeout:45000});
  await page.getByRole('link',{name:/i already have an account/i})
    .waitFor({state:'visible',timeout:25000});
  await page.getByRole('link',{name:/i already have an account/i}).click();
  await page.waitForURL(/\/auth\/sign-in/,{timeout:15000});
  await page.locator('#auth-email').waitFor({state:'visible',timeout:25000});
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL(/\/website-creator\/start/,{timeout:25000});
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
  const {error:pError}=await admin.from('profiles').upsert({
    id:userId,role:'player',is_active:true,onboarding_complete:true,
    first_name:'RCH',last_name:'Browser Test',
    username:'rch-test-'+crypto.randomBytes(6).toString('hex'),
  },{onConflict:'id'});
  if(pError)throw Error('Cannot complete isolated test profile: '+pError.message);
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const first=await browser.newContext({viewport:{width:390,height:844}});
  let page=await signin(first,'first session');
  await page.getByRole('button',{name:/customize my site/i}).click();
  const org='CI Trainer '+crypto.randomBytes(4).toString('hex');
  await page.getByRole('textbox',{name:/basketball business/i}).fill(org);
  await page.getByRole('button',{name:/save draft/i}).click();
  await page.getByText('Your private website draft is saved.')
    .waitFor({state:'visible',timeout:20000});
  let {data:draft,error:draftErr}=await admin.from('rch_site_starter_drafts')
    .select('organization_name,desired_slug,preferred_tier,config')
    .eq('profile_id',userId).maybeSingle();
  if(draftErr||!draft)throw Error('Private draft was not written to database: '+draftErr?.message);
  assert.equal(draft.organization_name,org);
  assert.equal(draft.preferred_tier,'free');
  assert.equal(draft.config.siteType,'trainer');
  console.log('PASS local authenticated save: actual server/API/Postgres persists private draft');

  // A completely fresh browser context is signed out by default. Sign in
  // again to simulate a returning real user without relying on localStorage.
  await first.close();
  const second=await browser.newContext({viewport:{width:1440,height:900}});
  page=await signin(second,'returning session');
  await page.getByRole('textbox',{name:/basketball business/i})
    .waitFor({state:'visible',timeout:15000});
  assert.equal(await page.getByRole('textbox',{name:/basketball business/i}).inputValue(),org);
  assert.equal(await page.getByRole('textbox',{name:/your website address/i}).inputValue(),draft.desired_slug);
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
