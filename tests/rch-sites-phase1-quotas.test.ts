import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=read('supabase/migrations/20261027205500_rch_site_subscription_booking_quotas.sql');
const pgTap=read('supabase/tests/rch_sites_subscription_booking_quotas_test.sql');
const api=read('src/app/api/rch-sites/appointments/route.ts');
const ui=read('src/app/network/dashboard/sites/appointments/page.tsx');
const plans=read('src/lib/rch-sites-plans.ts');

describe('RCH Sites Phase 1: staged website subscription + booking quotas',()=>{
  it('keeps website subscriptions distinct from partner advertising and organization PayPal',()=>{
    expect(migration).toContain('public.rch_site_subscriptions');
    expect(migration).toContain('public.rch_site_plan_limits');
    expect(migration).not.toContain("update public.network_organizations set network_tier");
    expect(migration).not.toContain('stripe_connect');
    expect(migration).not.toContain('paypal_account');
    expect(migration).toContain("tier in ('free','amateur','professional')");
    expect(migration).toContain('rch_site_subscription_paid_requires_reference');
  });
  it('locks down both new sensitive tables and guards mutation at the database',()=>{
    for(const name of ['rch_site_subscriptions','rch_site_plan_limits']){
      expect(migration).toContain('alter table public.'+name+' enable row level security');
      expect(migration).toContain('revoke all on public.'+name+' from public,anon,authenticated');
      expect(migration).not.toContain('grant select on public.'+name+' to anon');
    }
    expect(migration).toContain('security invoker');
    expect(migration).not.toContain('security definer');
    expect(migration).toContain('for update');
    expect(migration).toContain('on conflict (organization_id) do nothing');
    expect(migration).toContain('v_month_start');
    for(const resource of ['rch_site_services','rch_site_slots','rch_site_bookings']){
      expect(migration).toContain('create trigger '+resource+'_plan_quota');
    }
  });
  it('serializes actual inserts and treats canceled bookings as consumed monthly capacity',()=>{
    expect(migration).toContain("v_key:='booking_services'");
    expect(migration).toContain("v_key:='upcoming_slots'");
    expect(migration).toContain("v_key:='confirmed_bookings_monthly'");
    expect(migration).toContain('from public.rch_site_bookings');
    expect(migration).toContain('booked_at>=v_month_start');
    expect(migration).toContain("raise exception 'RCH Sites % quota reached'");
    expect(pgTap).toContain('Cancelling a booking does not reset monthly usage');
    expect(pgTap).toContain('A second service exceeds first organization quota');
    expect(pgTap).toContain('New future open slot is blocked at quota');
    expect(pgTap).toContain('Past-due paid subscription cannot create bookable services');
    expect(pgTap).toContain('Ordinary site users cannot upgrade themselves');
  });
  it('has application handling for DB 409s instead of racy API-only old limits',()=>{
    expect(api).toContain("error.code==='P0001'");
    expect(api).toContain("from('rch_site_subscriptions')");
    expect(api).toContain("from('rch_site_plan_limits')");
    expect(api).toContain("from('rch_site_services').select('id',{head:true,count:'exact'})");
    expect(api).toContain('confirmedBookingsMonthly');
    expect(api).not.toContain('20-service limit');
    expect(api).not.toContain('120 upcoming appointment slots reached');
    expect(ui).toContain('websitePlan.usage.services');
    expect(ui).toContain('websitePlan.usage.confirmedBookingsMonthly');
    expect(ui).toContain('Paid plan enrollment is not available yet.');
    expect(plans).toContain('evaluateRchSiteFeature');
  });
});
