/**
 * Browser-based public onboarding smoke check.
 * Against a real deployed RCH Site URL. Never logs in, writes private data,
 * provisions production accounts, or silently mocks the API.
 *
 * For completed-member save/resume/publish checks, use a separately provisioned,
 * owner-controlled TEST account; this file intentionally does not fake success.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');

const base=process.env.RCH_E2E_BASE_URL||'https://richcityhoops.com';
const uri=new URL(base);
if(uri.protocol!=='https:')throw Error('Browser smoke requires HTTPS');
if(!['richcityhoops.com','www.richcityhoops.com'].includes(uri.hostname) &&
   !uri.hostname.endsWith('.vercel.app'))throw Error('Unexpected RCH target domain');

const artifacts='artifacts/rch-sites-browser';
mkdirSync(artifacts,{recursive:true});

async function verify(condition,message){
  const success=await condition;
  assert.ok(success,message);
}
async function run(){
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const device of [
      {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
      {name:'desktop',viewport:{width:1440,height:900},isMobile:false,hasTouch:false},
    ]){
      const context=await browser.newContext({
        viewport:device.viewport,isMobile:device.isMobile,
        hasTouch:device.hasTouch,
        userAgent:device.isMobile
          ?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
          :undefined,
      });
      const page=await context.newPage();
      const runtimeErrors=[];
      page.on('pageerror',error=>runtimeErrors.push(error.message));
      const landing=await page.goto(base+'/website-creator',{waitUntil:'domcontentloaded',timeout:45000});
      assert.equal(landing?.status(),200,'Public Website Creator route must be reachable');
      await page.getByRole('heading',{level:1}).first().waitFor({timeout:15000});
      const startLink=page.getByRole('link',{name:/get started/i}).first();
      await startLink.waitFor({timeout:15000});
      await startLink.click();
      await page.waitForURL(/\/website-creator\/start(?:\?|$)/,{timeout:15000});
      try{
        await page.getByRole('heading',{name:/your website starts here/i})
          .waitFor({state:'visible',timeout:20000});
      }catch(error){
        await page.screenshot({path:artifacts+'/failed-get-started-'+device.name+'.png',fullPage:true});
        console.error('DEBUG route:',page.url());
        console.error('DEBUG visible page:',(await page.locator('body').innerText()).slice(0,1200));
        console.error('DEBUG page errors:',runtimeErrors);
        throw error;
      }
      await verify(page.getByRole('link',{name:/create a free account/i}).isVisible(),
        'Guests must have a create-account action');
      await verify(page.getByRole('link',{name:/i already have an account/i}).isVisible(),
        'Guests must have an existing-account action');
      await page.screenshot({path:artifacts+'/get-started-'+device.name+'.png',fullPage:true});
      const signInHref=await page.getByRole('link',{name:/i already have an account/i}).getAttribute('href');
      assert.ok(signInHref?.startsWith('/auth/sign-in?next='),'Sign-in must preserve next URL');
      assert.ok(decodeURIComponent(signInHref).includes('/website-creator/start'),
        'Sign-in must return to Get Started');

      const signupHref=await page.getByRole('link',{name:/create a free account/i}).getAttribute('href');
      assert.ok(signupHref?.startsWith('/auth/sign-up?next='),
        'Sign-up must preserve next URL');
      await page.getByRole('link',{name:/create a free account/i}).click();
      await page.waitForURL(/\/auth\/sign-up/,{timeout:15000});
      await verify(!(await page.getByText(/install the app to continue/i).isVisible().catch(()=>false)),
        'Browser sign-up should not be blocked by PWA installation prompt');
      try{
        await page.getByRole('heading',{level:1}).first()
          .waitFor({state:'visible',timeout:20000});
        await page.locator('#auth-email').waitFor({state:'visible',timeout:20000});
      }catch(error){
        await page.screenshot({path:artifacts+'/failed-signup-'+device.name+'.png',fullPage:true});
        console.error('DEBUG signup route:',page.url());
        console.error('DEBUG signup page:',(await page.locator('body').innerText()).slice(0,1000));
        console.error('DEBUG page errors:',runtimeErrors);
        throw error;
      }
      assert.deepEqual(runtimeErrors,[],'No uncaught browser Javascript errors');
      console.log('PASS '+device.name+': public creator → Get Started → account sign-up; redirect intact');
      await context.close();
    }
    const isolated=await browser.newContext();
    const pg=await isolated.newPage();
    const legacy=await pg.goto(base+'/network/partners/apply?siteTier=professional',
      {waitUntil:'domcontentloaded',timeout:45000});
    await pg.waitForURL(/\/website-creator\/start\?tier=professional/,{timeout:15000});
    assert.equal(legacy?.status(),200,'Legacy Website Creator link must redirect into setup');
    const reply=await pg.request.get(base+'/api/rch-sites/starter');
    assert.equal(reply.status(),401,'Guests must not read private saved website drafts');
    await isolated.close();
    console.log('PASS legacy tier link redirects; unauthenticated starter API returns 401');
    console.log('NOT VERIFIED: authenticated save, sign out, sign in and resume require a real isolated test account.');
    console.log('RCH Sites public browser smoke succeeded.');
  }finally{await browser.close();}
}
run().catch(err=>{console.error('FAIL browser smoke:',err);process.exitCode=1;});
