import {describe,expect,it} from 'vitest';
import {
  isRchSiteSlug,normalizeRchSiteDraft,rchSitePath,rchSiteSectionsFor,RCH_SITE_THEMES,
} from '@/lib/rch-site-builder';

describe('RCH Sites safe builder contract',()=>{
  it('only allows canonical tenant slugs (not platform/admin routes)',()=>{
    expect(isRchSiteSlug('rva-elite-aau')).toBe(true);
    for(const slug of ['admin','api','billing','rch','../../admin','AAU Org','a','-foo','foo-','site?x=1','example.com']){
      expect(isRchSiteSlug(slug)).toBe(false);
    }
    expect(rchSitePath('rva-elite-aau')).toBe('/sites/rva-elite-aau');
    expect(()=>rchSitePath('../admin')).toThrow('Invalid RCH site slug');
  });
  it('keeps safe fixed templates with publishing-critical sections',()=>{
    expect(rchSiteSectionsFor('trainer')).toContain('services');
    expect(rchSiteSectionsFor('aau')).toContain('roster');
    expect(rchSiteSectionsFor('organizer')).toContain('schedule');
    expect(normalizeRchSiteDraft({sections:['media','media','made-up','schedule']} ).sections)
      .toEqual(['hero','media','schedule','contact']);
  });
  it('allows only approved presentation fields, themes and short plain-text copy',()=>{
    const result=normalizeRchSiteDraft({
      siteType:'aau',theme:'evil',
      tagline:'<img src=x onerror=alert(1)>Welcome',
      about:'A'.repeat(1100),callToAction:'Book a session',
      sections:['roster','hero','schedule'],
      adminRole:'owner',
      arbitraryCSS:'body{display:none}',
      arbitraryScript:'<script>alert(1)</script>',
    });
    expect(result.siteType).toBe('aau');
    expect(result.theme).toBe('courtside');
    expect(result.tagline).toBe('Welcome');
    expect(result.about.length).toBe(1000);
    expect(result.sections).toEqual(['roster','hero','schedule','contact']);
    expect(Object.keys(result).sort()).toEqual(['about','callToAction','sections','siteType','tagline','theme'].sort());
    expect(Object.keys(RCH_SITE_THEMES)).toHaveLength(3);
  });
  it('uses non-operator defaults for malformed data',()=>{
    const draft=normalizeRchSiteDraft(null);
    expect(draft.siteType).toBe('trainer');
    expect(draft.callToAction).toBe('Get started');
    expect(draft.sections).toEqual(['hero','about','services','schedule','media','contact']);
  });
});
