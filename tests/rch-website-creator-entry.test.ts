import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {isBrowserPublicRoute} from '../src/lib/rch-mobile-experience';
const read=(path:string)=>readFileSync(path,'utf8');
describe('Public RCH Sites entry',()=>{
  it('opens the creator marketing page without opening private studio routes',()=>{
    expect(isBrowserPublicRoute('/website-creator')).toBe(true);
    expect(isBrowserPublicRoute('/website-creator/')).toBe(true);
    expect(isBrowserPublicRoute('/website-creator/start')).toBe(true);
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
    expect(page).toContain('<RchSitePricingCards/>');
    expect(page).toContain('not active paid subscriptions');
    const pricing=read('src/components/sites/RchSitePricingCards.tsx');
    expect(pricing).toContain('RCH_SITE_PLAN_TIERS.map');
    expect(pricing).toContain('/website-creator/start?tier=');
    expect(pricing).toContain('Planned for this level');
    expect(pricing).toContain('Available now');
    expect(pricing).toContain('Yearly · 2 months free');
    expect(page).not.toContain('Register interest');
    expect(page).not.toContain('Request free access');
    const application=read('src/app/network/partners/apply/page.tsx');
    expect(application).toContain("redirect('/website-creator/start?tier='+siteTier)");
    expect(application).toContain('initialSiteTier={siteTier}');
  });
});
