import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const file=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=file('supabase/migrations/20261027040000_rch_sites_organization_inbox.sql');
const api=file('src/app/api/rch-sites/inquiries/route.ts');
const form=file('src/components/sites/RchSiteInquiryClient.tsx');
const inbox=file('src/app/network/dashboard/sites/people/page.tsx');
const publicPage=file('src/app/sites/[slug]/inquire/page.tsx');
const studio=file('src/app/network/dashboard/sites/page.tsx');
const view=file('src/components/sites/RchSiteView.tsx');

describe('RCH Sites Organization Hub: interest-only intake and privacy boundaries',()=>{
  it('keeps private inquiry records out of all anonymous/authenticated Data APIs',()=>{
    expect(migration).toContain('rch_site_inquiries');
    expect(migration).toContain('alter table public.rch_site_inquiries enable row level security');
    expect(migration).toContain('revoke all on public.rch_site_inquiries from public,anon,authenticated');
    expect(migration).not.toContain('grant select on public.rch_site_inquiries to authenticated');
    expect(migration).not.toContain('grant insert on public.rch_site_inquiries to authenticated');
    expect(migration).toContain('unique (organization_id,requester_id,submitted_on)');
    expect(migration).toContain('contact_consent = true');
    expect(migration).toContain('rch_site_inquiry_review_consistency');
    expect(migration).not.toContain('date_of_birth');
    expect(migration).not.toContain('medical_history text');
    expect(migration).not.toContain('payment_status');
  });
  it('checks adult verification, member roles, same-origin and publication on server',()=>{
    expect(api).toContain('sameOrigin(request)');
    expect(api).toContain('client.auth.getUser()');
    expect(api).toContain('user.email_confirmed_at');
    expect(api).toContain("db.rpc('is_my_profile_adult')");
    expect(api).toContain('getAuthenticatorAssuranceLevel()');
    expect(api).toContain('orgManager(context,organizationId,admin)');
    expect(api).toContain("['owner','manager']");
    expect(api).toContain("eq('organization_id',organizationId)");
    expect(api).toContain("eq('organization_id',input.organizationId)");
    expect(api).toContain("eq('status','published')");
    expect(api).toContain('input.contactConsent!==true');
    expect(api).toContain("error.code==='23505'");
    expect(api).toContain("status:'new'");
    expect(api).not.toContain('service_role');
    expect(api).not.toContain("status:'paid'");
  });
  it('provides minimal visitor inquiry with no minor data or false paid/confirmed registration',()=>{
    expect(form).toContain('Send inquiry');
    expect(form).toContain('contactConsent:consent');
    expect(form).toContain('at least 18');
    expect(form).toContain('No payment is collected');
    expect(form).not.toContain('athleteBirthday');
    expect(form).not.toContain('roster');
    expect(publicPage).toContain('notFound()');
    expect(publicPage).toContain("eq('status','published')");
  });
  it('gives only the organization team its inbox, filtered by tenant',()=>{
    expect(inbox).toContain('/api/rch-sites/inquiries?organizationId=');
    expect(inbox).toContain('Email contact');
    expect(inbox).toContain('Mark contacted');
    expect(inbox).toContain('contact_email');
    expect(inbox).toContain("member_role");
    expect(studio).toContain('href="/network/dashboard/sites/people"');
    expect(view).toContain('inquiryAvailable');
    expect(view).toContain('Send an inquiry');
  });
});
