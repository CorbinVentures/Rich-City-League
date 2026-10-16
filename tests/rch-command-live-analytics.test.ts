import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { analyticsSection } from '../src/lib/analytics/sections';

const read=(file:string)=>readFileSync(file,'utf8');
const sql=read('supabase/migrations/20261016160000_rch_command_live_analytics.sql');
const command=read('src/components/command/CommandSiteAnalytics.tsx');
const live=read('src/components/command/CommandLiveAnalytics.tsx');
const observer=read('src/components/analytics/SiteAnalyticsObserver.tsx');

describe('RCH Command Center privacy-safe live analytics',()=>{
  it('makes live analytics the default Command report without replacing historical reports',()=>{
    expect(command).toContain("type Section = 'live'");
    expect(command).toContain("{id:'live',title:'Live Command'}");
    expect(command).toContain("useState<Section>('live')");
    expect(command).toContain("section==='live'?<CommandLiveAnalytics/>");
    for (const label of ["Executive overview","Audience & reach","Social & content","Basketball ecosystem","Revenue & operations"])
      expect(command).toContain(label);
  });

  it('aggregates only MFA-authorized administrator snapshots, not identities',()=>{
    expect(sql).toContain('get_rch_live_analytics()');
    expect(sql).toContain("auth.jwt()->>'aal'");
    expect(sql).toContain("p.role::text='admin' and p.is_active=true");
    expect(sql).toContain('security definer set search_path');
    expect(sql).toContain('alter table public.rch_live_presence enable row level security');
    expect(sql).toContain('revoke all on public.rch_live_presence from public,anon,authenticated');
    expect(sql).toContain('revoke all on function public.get_rch_live_analytics()');
    expect(sql).toContain('grant execute on function public.get_rch_live_analytics() to authenticated');
    expect(sql).not.toContain('grant select on public.rch_live_presence');
    expect(sql).not.toContain('ip_address');
    expect(sql).not.toContain('user_agent');
  });

  it('uses short-lived coarse-section heartbeats only for opted-in visible browsers',()=>{
    expect(sql).toContain('record_rch_live_heartbeat(p_session_id uuid,p_section text)');
    expect(sql).toContain('last_seen_at>=v_now-interval \'2 minutes\'');
    expect(sql).toContain("last_seen_at<now()-interval '48 hours'");
    expect(sql).toContain("grant execute on function public.record_rch_live_heartbeat(uuid,text) to anon,authenticated");
    expect(observer).toContain("privacy.doNotTrack === '1'");
    expect(observer).toContain('privacy.globalPrivacyControl === true');
    expect(observer).toContain("document.visibilityState !== 'visible'");
    expect(observer).toContain('sessionStorage.getItem(key)');
    expect(observer).toContain('record_rch_live_heartbeat');
    expect(observer).toContain('record_rch_site_visit');
    expect(observer).toContain('45_000');
    expect(observer).not.toContain('geolocation');
    expect(analyticsSection('/pulse')).toBe('social');
    expect(analyticsSection('/social')).toBe('social');
    expect(analyticsSection('/auth/sign-in')).toBeNull();
    expect(analyticsSection('/messages/private-id')).toBeNull();
    expect(analyticsSection('/command')).toBeNull();
  });

  it('compares real 15-minute actions and displays fresh-or-stale status transparently',()=>{
    expect(sql).toContain("v_now-interval '15 minutes'");
    expect(sql).toContain("date_bin('5 minutes'");
    expect(sql).toContain('is_automated is distinct from true');
    for (const table of ['public.profiles','public.posts','public.reactions','public.comments','public.run_players','public.messages'])
      expect(sql).toContain(table);
    expect(live).toContain("db.rpc('get_rch_live_analytics')");
    expect(live).toContain('30_000');
    expect(live).toContain("document.visibilityState==='visible'");
    expect(live).toContain('Showing the latest available snapshot');
    expect(live).toContain('not unique visitors');
    expect(live).toContain('Pause auto');
    expect(live).toContain('Refresh');
  });
});
