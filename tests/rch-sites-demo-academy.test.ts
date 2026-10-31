import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {
  RCH_DEMO_ORGANIZATION,RCH_DEMO_PROGRAMS,RCH_DEMO_SESSIONS,RCH_DEMO_COACHES,
  demoProgramLabel,
} from '../src/lib/rch-sites-demo';

const source=(path:string)=>readFileSync(path,'utf8');
describe('Fictional RCH Sites example academy',()=>{
  it('clearly labels the academy as an example, never a verified or paying organization',()=>{
    expect(RCH_DEMO_ORGANIZATION.name.toLowerCase()).toContain('demo');
    expect(RCH_DEMO_ORGANIZATION.description.toLowerCase()).toContain('fictional');
    expect(RCH_DEMO_ORGANIZATION.subscription).toBe('Amateur');
    expect(RCH_DEMO_ORGANIZATION.status).toContain('no real registration or payments');
  });

  it('contains useful sample adult basketball programs and sessions',()=>{
    expect(RCH_DEMO_PROGRAMS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(RCH_DEMO_PROGRAMS.map(p=>p.id)).size).toBe(RCH_DEMO_PROGRAMS.length);
    for(const p of RCH_DEMO_PROGRAMS){
      expect(['training','team','tryout','camp']).toContain(p.kind);
      expect(demoProgramLabel(p.kind).length).toBeGreaterThan(2);
      expect(p.capacity).toBeGreaterThan(0);
      expect(p.capacity).toBeLessThanOrEqual(100);
      expect(p.participants.length).toBeLessThanOrEqual(p.capacity);
    }
    for(const session of RCH_DEMO_SESSIONS){
      expect(RCH_DEMO_PROGRAMS.some(p=>p.id===session.programId)).toBe(true);
      expect(RCH_DEMO_COACHES).toContain(session.coach as typeof RCH_DEMO_COACHES[number]);
    }
  });

  it('is an isolated, noindex, client-only walkthrough without a production write path',()=>{
    const page=source('src/app/website-creator/demo/page.tsx');
    const client=source('src/components/sites/RchSitesDemoClient.tsx');
    const fixture=source('src/lib/rch-sites-demo.ts');
    const entry=source('src/app/website-creator/page.tsx');
    expect(page).toContain('robots:{index:false,follow:false,nocache:true}');
    expect(entry).toContain('href="/website-creator/demo"');
    expect(client).toContain("'use client'");
    expect(client).toContain("DEMO ONLY");
    expect(client).toContain('Simulate registration');
    expect(client).toContain('Reset sample');
    expect(client).toContain('No real participant was registered');
    expect(client).not.toMatch(/fetch\s*\(|\.from\s*\(|getSupabaseAdminClient|service_role|payment_url/);
    expect(page).not.toMatch(/fetch\s*\(|\.from\s*\(|getSupabaseAdminClient/);
    expect(fixture).not.toMatch(/from\s+['"]@\/lib\/supabase/);
    expect(client).not.toContain('localStorage');
    expect(client).not.toContain('sessionStorage');
  });
});
