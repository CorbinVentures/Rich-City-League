import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isBrowserPublicRoute} from '../src/lib/rch-mobile-experience';

const file=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=file('supabase/migrations/20261028001200_rch_site_self_serve_starter_drafts.sql');
const api=file('src/app/api/rch-sites/starter/route.ts');
const screen=file('src/components/sites/RchSiteStarterClient.tsx');
const start=file('src/app/website-creator/start/page.tsx');
const marketing=file('src/app/website-creator/page.tsx');
const legacy=file('src/app/network/partners/apply/page.tsx');

describe('RCH Sites Get Started: design-first private onboarding',()=>{
  it('opens the builder in the normal browser without unlocking private dashboard URLs',()=>{
    expect(isBrowserPublicRoute('/website-creator/start')).toBe(true);
    expect(isBrowserPublicRoute('/network/dashboard/sites')).toBe(false);
    expect(start).toContain('robots:{index:false,follow:false}');
    expect(marketing).toContain('Get Started');
    expect(marketing).toContain('/website-creator/start?tier=');
    expect(marketing).not.toContain('Register interest');
    expect(legacy).toContain("redirect('/website-creator/start?tier='+siteTier)");
  });
  it('provides a real multi-step wizard with private save, preview, and verification last',()=>{
    for(const label of ['Your site','Make it yours','Finish setup']){
      expect(screen).toContain(label);
    }
    expect(screen).toContain('RchSiteView preview');
    expect(screen).toContain("action:'save'");
    expect(screen).toContain("action:'requestVerification'");
    expect(screen).toContain("action:'import'");
    expect(screen).toContain('Create a free account');
    expect(screen).toContain('Private setup');
    expect(screen).not.toContain('Request free access');
    expect(screen).toContain('Organization verification happens before publishing');
  });
  it('never conflates a tier preference with payment or automatically publishes',()=>{
    expect(api).toContain('isRchSitePlanTier(raw.tier)');
    expect(api).toContain('preferred_tier:raw.tier');
    expect(api).toContain("plan_interest:'community'");
    expect(api).toContain("source:'partner-application'");
    expect(api).toContain('server-side');
    expect(api).not.toContain("from('rch_sites').insert");
    expect(api).not.toContain("network_tier:'professional'");
    expect(api).not.toContain('stripe_checkout');
    expect(migration).not.toContain('grant insert on public.rch_site_starter_drafts to authenticated');
  });
  it('requires verified organization membership to hand off into the existing studio',()=>{
    expect(api).toContain("eq('profile_id',context.user.id)");
    expect(api).toContain("eq('status','active')");
    expect(api).toContain("ownerRoles.has(member.member_role)");
    expect(api).toContain("org.is_verified!==true");
    expect(api).toContain("org.is_claimed!==true");
    expect(api).toContain("org.network_tier==='flagship'");
    expect(api).toContain("from('rch_site_drafts').insert");
    expect(api).not.toContain("from('network_organization_members').insert");
    expect(api).not.toContain("from('network_organizations').insert");
  });
  it('never exposes another account starter via Data API',()=>{
    expect(migration).toContain('profile_id uuid primary key');
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('revoke all on public.rch_site_starter_drafts from public,anon,authenticated');
    expect(migration).toContain('grant select on public.rch_site_starter_drafts to authenticated');
    expect(migration).toContain('profile_id=(select auth.uid())');
    expect(migration).toContain("preferred_tier in ('free','amateur','professional')");
    expect(api).toContain("client.auth.getUser()");
    expect(api).toContain('validOrigin(request)');
    expect(api).toContain('user.email_confirmed_at');
    expect(api).toContain('getAuthenticatorAssuranceLevel()');
    expect(api).toContain('normalizeRchSiteDraft');
    expect(api).toContain("if(starter.verification_inquiry_id)");
  });
});
