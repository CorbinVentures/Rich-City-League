import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {
  RCH_BASKETBALL_TEMPLATES,RCH_BASKETBALL_TOOLS,
  basketballSiteTypeForOrganization,basketballToolsFor,
} from '../src/lib/rch-sites-basketball-tools';
import {RCH_SITE_PLANS,RCH_SITE_RELEASED_FEATURES} from '../src/lib/rch-sites-plans';
import {RCH_SITE_TYPES} from '../src/lib/rch-site-builder';

describe('RCH Sites basketball-first tier previews',()=>{
  it('provides a safe, specific template for every supported basketball business',()=>{
    expect(Object.keys(RCH_BASKETBALL_TEMPLATES).sort()).toEqual([...RCH_SITE_TYPES].sort());
    for(const type of RCH_SITE_TYPES){
      const template=RCH_BASKETBALL_TEMPLATES[type];
      expect(template.headline.length).toBeGreaterThan(6);
      expect(template.about.length).toBeGreaterThan(10);
      expect(template.defaultSections).toContain('hero');
      expect(template.defaultSections).toContain('contact');
    }
    expect(basketballSiteTypeForOrganization('training')).toBe('trainer');
    expect(basketballSiteTypeForOrganization('team')).toBe('aau');
    expect(basketballSiteTypeForOrganization('league')).toBe('organizer');
    expect(basketballSiteTypeForOrganization('tournament')).toBe('organizer');
  });

  it('does not turn planned basketball tools into live links',()=>{
    for(const tier of ['free','amateur','professional'] as const){
      for(const type of RCH_SITE_TYPES){
        const tools=basketballToolsFor(type,tier,true,30);
        expect(tools.length).toBeGreaterThan(0);
        for(const tool of tools){
          expect(RCH_SITE_PLANS[tool.firstPlan].features).toContain(tool.feature);
          if(tool.access==='available'){
            expect(RCH_SITE_RELEASED_FEATURES.has(tool.feature)).toBe(true);
            expect(tool.href).toMatch(/^\/network\/dashboard\/sites\/(appointments|people)$/);
          }else if(!RCH_SITE_RELEASED_FEATURES.has(tool.feature)){
            expect(tool.access).toMatch(/^planned/);
            expect(tool.href).toBeNull();
          }
        }
      }
    }
  });

  it('shows Free tools and accurately distinguishes upcoming Amateur and Professional benefits',()=>{
    const free=basketballToolsFor('aau','free',false,20);
    expect(free.find(t=>t.id==='inquiries')?.access).toBe('available');
    expect(free.find(t=>t.id==='bookings')?.access).toBe('available');
    expect(free.find(t=>t.id==='registrations')?.access).toBe('planned_higher_plan');
    const amateur=basketballToolsFor('aau','amateur',true,20);
    expect(amateur.find(t=>t.id==='registrations')?.access).toBe('planned');
    expect(amateur.find(t=>t.id==='rosters')?.access).toBe('planned');
    expect(amateur.find(t=>t.id==='brackets')?.access).toBe('planned_higher_plan');
    const professional=basketballToolsFor('organizer','professional',true,20);
    expect(professional.find(t=>t.id==='brackets')?.access).toBe('planned');
    expect(professional.find(t=>t.id==='divisions')?.access).toBe('planned');
  });

  it('never hides released Free tools when a paid subscription is inactive',()=>{
    const expired=basketballToolsFor('trainer','amateur',false,20);
    expect(expired.find(t=>t.id==='bookings')?.access).toBe('available');
    expect(expired.find(t=>t.id==='inquiries')?.access).toBe('available');
  });

  it('keeps the UI scoped to existing trusted management destinations',()=>{
    expect(new Set(RCH_BASKETBALL_TOOLS.map(t=>t.id)).size).toBe(RCH_BASKETBALL_TOOLS.length);
    for(const tool of RCH_BASKETBALL_TOOLS){
      expect(tool.href===null||['/network/dashboard/sites/appointments','/network/dashboard/sites/people'].includes(tool.href)).toBe(true);
      expect(tool.name.length).toBeGreaterThan(5);
    }
    const source=(file:string)=>readFileSync(file,'utf8');
    const studio=source('src/app/network/dashboard/sites/page.tsx');
    const starter=source('src/components/sites/RchSiteStarterClient.tsx');
    const hq=source('src/app/network/dashboard/sites/overview/page.tsx');
    const pricing=source('src/components/sites/RchSitePricingCards.tsx');
    const panel=source('src/components/sites/RchSitesBasketballTools.tsx');
    expect(starter).toContain('RCH_BASKETBALL_TEMPLATES');
    expect(starter).toContain('mode="starter"');
    expect(studio).toContain('mode="builder"');
    expect(hq).toContain('isRchSitePlanTier(current.plan.tier)');
    expect(hq).toContain('mode="owner"');
    expect(hq).toContain("current.plan.billingStatus==='active'");
    expect(panel).toContain("mode==='owner'&&item.access==='available'");
    expect(panel).toContain('encodeURIComponent(organizationId!)');
    expect(pricing).toContain('Planned for this level');
  });
});
