import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isRchSiteSlug,normalizeRchSiteDraft} from '../src/lib/rch-site-builder';

const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
const migration=read('supabase/migrations/20261026213500_rch_sites_phase1_publishing.sql');
const api=read('src/app/api/rch-sites/route.ts');
const publicRoute=read('src/app/sites/[slug]/page.tsx');
const studio=read('src/app/network/dashboard/sites/page.tsx');
const shell=read('src/components/RCHExperienceGate.tsx');
const dashboard=read('src/app/network/dashboard/page.tsx');
const site=read('src/components/sites/RchSiteView.tsx');
const sitemap=read('src/app/sitemap.ts');

describe('RCH Sites Phase 1 release boundaries',()=>{
  it('gates published snapshots while keeping private drafts inaccessible to the public',()=>{
    expect(migration).toContain('public.rch_site_drafts');
    expect(migration).toContain('public.rch_sites');
    expect(migration).toContain('alter table public.rch_site_drafts enable row level security');
    expect(migration).toContain('alter table public.rch_sites enable row level security');
    expect(migration).toContain('revoke all on public.rch_site_drafts from public, anon, authenticated');
    expect(migration).toContain('revoke all on public.rch_sites from public, anon, authenticated');
    expect(migration).toContain('grant select on public.rch_site_drafts to authenticated');
    expect(migration).toContain('grant select on public.rch_sites to anon, authenticated');
    expect(migration).toContain("status = 'published'");
    expect(migration).toContain("m.profile_id = (select auth.uid())");
    expect(migration).not.toContain('grant insert on public.rch_sites to authenticated');
  });
  it('requires verified membership, owner role for publish, and safe origin for any mutation',()=>{
    expect(api).toContain('originVerified(request)');
    expect(api).toContain('client.auth.getUser()');
    expect(api).toContain('getAuthenticatorAssuranceLevel()');
    expect(api).toContain("member_role");
    expect(api).toContain("managerRoles.has(member.member_role)");
    expect(api).toContain('profile.is_active!==true');
    expect(api).toContain('eligible(org as Org)');
    expect(api).toContain('normalizeRchSiteDraft(raw.config)');
    expect(api).toContain('isRchSiteSlug(raw.slug)');
    expect(api).toContain("admin.from('rch_site_drafts').upsert");
    expect(api).toContain("admin.from('rch_sites').upsert");
    expect(api).toContain("action==='unpublish'");
    expect(api).not.toContain("from('site_settings').update");
  });
  it('does not expose unpublished records in the public site or sitemap',()=>{
    expect(publicRoute).toContain("eq('status','published')");
    expect(publicRoute).not.toContain('rch_site_drafts');
    expect(publicRoute).toContain('notFound()');
    expect(publicRoute).toContain('generateMetadata');
    expect(publicRoute).toContain("'@type':'Organization'");
    expect(sitemap).toContain("from('rch_sites').select('slug,updated_at').eq('status', 'published')");
  });
  it('renders safe predefined templates rather than embedded user code or youth rosters',()=>{
    expect(site).toContain('RCH_SITE_THEMES[config.theme]');
    expect(site).toContain("sections.includes(key)");
    expect(site).toContain('Athlete and family records remain private.');
    expect(site).toContain("Powered by Rich City Hoops");
    expect(site).toContain('safeUrl(');
    const config=normalizeRchSiteDraft({siteType:'aau',sections:['roster','contact','script'],theme:'courtside'});
    expect(config.sections).toEqual(['hero','roster','contact']);
    expect(isRchSiteSlug('../admin')).toBe(false);
  });
  it('integrates the builder in operator navigation without changing RCH application chrome',()=>{
    expect(studio).toContain("RCH Sites · Website Studio");
    expect(studio).toContain("submit('publish')");
    expect(studio).toContain('RchSiteView');
    expect(studio).toContain("member_role==='owner'");
    expect(dashboard).toContain('href="/network/dashboard/sites"');
    expect(shell).toContain("pathname.startsWith('/sites/')");
    expect(shell).toContain('return <>{publicContent}</>');
  });
});
