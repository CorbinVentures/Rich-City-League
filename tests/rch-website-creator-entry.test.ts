import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {isBrowserPublicRoute} from '../src/lib/rch-mobile-experience';
const read=(path:string)=>readFileSync(path,'utf8');
describe('Public RCH Sites entry',()=>{
  it('opens the creator marketing page without opening private studio routes',()=>{
    expect(isBrowserPublicRoute('/website-creator')).toBe(true);
    expect(isBrowserPublicRoute('/website-creator/')).toBe(true);
    expect(isBrowserPublicRoute('/network/dashboard/sites')).toBe(false);
  });
  it('places the entry in browser navigation, the homepage, Network and the sitemap',()=>{
    expect(read('src/components/RCHPublicWebShell.tsx')).toContain("href: '/website-creator'");
    expect(read('src/components/RCHBrowserHomepage.tsx')).toContain('href="/website-creator"');
    expect(read('src/app/network/page.tsx')).toContain('href="/website-creator"');
    expect(read('src/app/sitemap.ts')).toContain("['/website-creator'");
  });
  it('keeps Free, Amateur and Professional site tiers distinct from live advertising plans',()=>{
    const page=read('src/app/website-creator/page.tsx');
    for(const tier of ['free','amateur','professional'])expect(page).toContain("id:'"+tier+"'");
    expect(page).toContain('not yet available for purchase');
    expect(page).toContain('/network/partners/apply?siteTier=');
    const application=read('src/app/network/partners/apply/page.tsx');
    const form=read('src/components/network/PartnerInterestForm.tsx');
    expect(application).toContain('initialSiteTier={siteTier}');
    expect(form).toContain('Preferred website subscription');
    expect(form).toContain("plan_interest:websiteRequest?'community':form.planInterest");
    expect(form).toContain("source:'partner-application'");
  });
});
