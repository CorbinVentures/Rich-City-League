import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyticsSection } from '../src/lib/analytics/sections';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('RCH Command executive sitewide analytics',()=>{
  const sql=read('supabase/migrations/20261016070000_rch_executive_site_analytics.sql');
  const dashboard=read('src/components/command/CommandDashboard.tsx');
  const analytics=read('src/components/command/CommandSiteAnalytics.tsx');
  const observer=read('src/components/analytics/SiteAnalyticsObserver.tsx');
  const layout=read('src/app/layout.tsx');

  it('connects a dedicated lazily loaded Command Center module',()=>{
    expect(dashboard).toContain("id:'analytics',name:'Sitewide Analytics'");
    expect(dashboard).toContain("analytics:<CommandSiteAnalytics/>");
    expect(dashboard).toContain("type Area = 'overview'|'analytics'");
  });

  it('uses a single administrator-only, MFA-protected database aggregator',()=>{
    expect(sql).toContain('get_rch_executive_analytics(p_days integer default 30)');
    expect(sql).toContain("auth.jwt()->>'aal'");
    expect(sql).toContain("p.role::text='admin' and p.is_active=true");
    expect(sql).toContain('security definer set search_path');
    expect(sql).toContain('revoke all on public.rch_site_section_visits');
    expect(sql).toContain('revoke all on function public.get_rch_executive_analytics');
    expect(sql).toContain('grant execute on function public.get_rch_executive_analytics(integer) to authenticated');
    expect(sql).not.toContain('grant select on public.rch_site_section_visits');
  });

  it('measures only broad first-party sections, never raw private URLs or positions',()=>{
    expect(layout).toContain('<SiteAnalyticsObserver />');
    expect(observer).toContain("document.visibilityState !== 'visible'");
    expect(observer).toContain("privacy.doNotTrack === '1'");
    expect(observer).toContain("privacy.globalPrivacyControl === true");
    expect(observer).toContain("sessionStorage.getItem(key)");
    expect(observer).toContain("record_rch_site_visit");
    expect(observer).not.toContain('geolocation');
    expect(sql).not.toContain('ip_address');
    expect(sql).not.toContain('user_agent');
    for(const url of ['/admin','/admin/users','/account/security','/settings','/auth/sign-in','/command','/messages','/social/profile/secret']) {
      if(url.startsWith('/social'))continue; // social profiles are intentionally grouped as 'social'
      expect(analyticsSection(url),url).toBeNull();
    }
    expect(analyticsSection('/social/profile/an-id')).toBe('social');
    expect(analyticsSection('/runs/123')).toBe('runs');
    expect(analyticsSection('/news/example?query=private')).toBe('news');
    expect(analyticsSection('/command/analytics')).toBeNull();
  });

  it('distinguishes real financial records, automated content and observed traffic',()=>{
    expect(analytics).toContain('Traffic history begins');
    expect(analytics).toContain('not unique people');
    expect(analytics).toContain('not bank-verified cash');
    expect(analytics).toContain('not an audited profit-and-loss statement');
    expect(analytics).toContain("get_rch_executive_analytics");
    expect(analytics).toContain('Export CSV');
    expect(sql).toContain("is_automated is distinct from true");
    expect(sql).toContain("state='reconciled'");
    expect(sql).toContain("status in ('active','trialing')");
    expect(sql).toContain("bucket_at");
  });
});
