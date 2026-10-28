import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const sql=read('supabase/migrations/20261029001500_rch_sites_amateur_program_operations.sql');
const api=read('src/app/api/rch-sites/amateur/route.ts');
const manager=read('src/app/network/dashboard/sites/programs/page.tsx');
const publicUi=read('src/app/sites/[slug]/programs/page.tsx');
const hq=read('src/app/network/dashboard/sites/overview/page.tsx');

describe('RCH Sites adult basketball program rollout',()=>{
  it('keeps the feature disabled on first migration and private from Data API',()=>{
    expect(sql).toContain('enabled boolean not null default false');
    for(const table of ['rch_site_amateur_rollout','rch_site_amateur_programs',
      'rch_site_amateur_registrations','rch_site_amateur_sessions']){
      expect(sql).toContain(table);
    }
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('from public,anon,authenticated');
    expect(sql).toContain('to service_role');
    expect(api).toContain("rch_site_amateur_rollout");
  });
  it('gates all paid features from verified subscription and manager membership',()=>{
    expect(api).toContain('getRchSitesBillingPrincipal');
    expect(api).toContain('verifiedRchSiteBillingOrg');
    expect(api).toContain('effectiveRchSiteBillingStatus');
    expect(api).toContain("['amateur','professional'].includes(plan.tier)");
    expect(api).toContain('rchSitesBillingOriginAllowed(request)');
    expect(api).toContain("if(!gate.ready)");
    expect(api).not.toContain("raw.tier");
    expect(api).not.toContain("network_tier==='amateur'");
  });
  it('never returns roster names or other participants from public listing',()=>{
    expect(api).toContain("url.searchParams.get('organizationId')");
    expect(api).toContain("url.searchParams.get('slug')");
    expect(api).toContain('publishedOrganization(admin,slug)');
    expect(api).toContain("select('id,name,kind,capacity')");
    expect(api).toContain("select('program_id,starts_at,ends_at')");
    expect(api).toContain(".eq('profile_id',principal.user.id)");
    expect(api).toContain("names,slug:site?.status");
    expect(api).toContain("private, no-store");
  });
  it('checks adult age twice without collecting additional birth dates or payment details',()=>{
    expect(api).toContain("select('date_of_birth')");
    expect(api).toContain("dob>maxBirth");
    expect(sql).toContain("pr.date_of_birth <= (current_date - interval '18 years')::date");
    expect(api).toContain("action==='withdraw'");
    expect(api).toContain("status:'withdrawn'");
    expect(sql).toContain('unique(program_id,profile_id)');
    expect(sql).toContain('for update');
    expect(sql).toContain('count(distinct profile_id)');
    expect(sql).toContain('tstzrange(starts_at,ends_at');
    expect(sql).not.toContain('paypal');
  });
  it('provides distinct owner and self-registration experiences',()=>{
    expect(manager).toContain('createProgram');
    expect(manager).toContain('createSession');
    expect(manager).toContain('closeProgram');
    expect(manager).toContain('cancelSession');
    expect(manager).toContain('Org');
    expect(manager).toContain('activeOrg.current');
    expect(publicUi).toContain("action:'register'|'withdraw'");
    expect(publicUi).toContain("Sign in to register");
    expect(publicUi).toContain('at least 18');
    expect(hq).toContain("href:endpoint+'/programs'");
  });
});
