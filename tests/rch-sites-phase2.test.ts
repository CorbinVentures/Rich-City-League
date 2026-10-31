import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const get=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=get('supabase/migrations/20261027021500_rch_sites_free_appointments.sql');
const api=get('src/app/api/rch-sites/appointments/route.ts');
const customer=get('src/components/sites/RchSiteBookingClient.tsx');
const manager=get('src/app/network/dashboard/sites/appointments/page.tsx');
const view=get('src/components/sites/RchSiteView.tsx');
const site=get('src/app/sites/[slug]/page.tsx');

describe('RCH Sites booking: zero-cost secure rollout',()=>{
  it('only creates free and isolated scheduling records with secure RLS',()=>{
    expect(migration).toContain('check (price_cents = 0)');
    expect(migration).toContain('rch_site_services');
    expect(migration).toContain('rch_site_slots');
    expect(migration).toContain('rch_site_bookings');
    for(const table of ['rch_site_services','rch_site_slots','rch_site_bookings']){
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke all on public.${table} from public,anon,authenticated`);
    }
    expect(migration).toContain('grant select on public.rch_site_bookings to authenticated');
    expect(migration).toContain('client_id=(select auth.uid())');
    expect(migration).not.toContain('grant insert on public.rch_site_bookings to authenticated');
  });
  it('stops overlapping slots and duplicate confirmed bookings at database level',()=>{
    expect(migration).toContain('exclude using gist');
    expect(migration).toContain('rch_site_bookings_exclusive_slot');
    expect(migration).toContain("where (status='confirmed')");
    expect(migration).toContain('rch_site_booking_validate()');
    expect(migration).toContain('for update');
    expect(migration).toContain('rch_site_slot_close_validate()');
    expect(migration).toContain('unique (client_id,idempotency_key)');
    expect(migration).toContain('foreign key (slot_id,organization_id)');
  });
  it('requires a verified published site and server-side identity for booking',()=>{
    expect(api).toContain('safeOrigin(request)');
    expect(api).toContain('client.auth.getUser()');
    expect(api).toContain('getAuthenticatorAssuranceLevel()');
    expect(api).toContain('profile.is_active!==true');
    expect(api).toContain('managedOrg(context,organizationId,admin)');
    expect(api).toContain('approvedPublished(admin,slot.organization_id)');
    expect(api).toContain("price_cents!==0");
    expect(api).toContain('idempotencyKey');
    expect(api).toContain("error.code==='23505'");
    expect(api).toContain("action==='cancelBooking'");
    expect(api).not.toContain("from('site_settings').update");
    expect(api).not.toContain("from('network_organizations').update");
  });
  it('gives customers no access to names, contact information, money or medical records',()=>{
    expect(customer).toContain("Book free");
    expect(customer).toContain('Sign in / Join Free');
    expect(customer).toContain('My reservations');
    expect(customer).toContain('cancelBooking');
    expect(manager).toContain('Manage organization');
    expect(manager).toContain("createService");
    expect(manager).toContain("createSlot");
    expect(manager).not.toContain('patient');
    expect(api).not.toContain('medical_history');
    expect(api).not.toContain('card_number');
  });
  it('only links public booking from real active offerings',()=>{
    expect(view).toContain('bookingAvailable');
    expect(view).toContain('Book a session');
    expect(site).toContain("from('rch_site_services')");
    expect(site).toContain("eq('status','active')");
  });
});
