import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const schema=read('supabase/migrations/20261016060000_crews_social_run_entries.sql');
const hq=read('src/app/crews/page.tsx');
const profile=read('src/components/commonwealth/PublicCrewShowcase.tsx');
const socialProfile=read('src/app/social/profile/[id]/page.tsx');
const runRoom=read('src/app/runs/[id]/page.tsx');
const nav=read('src/lib/member-navigation.ts');

describe('RCH crew identity and growth',()=>{
  it('keeps crew records rooted in existing Commonwealth identities, not duplicated teams',()=>{
    expect(schema).toContain('alter table public.commonwealth_crews add column if not exists logo_path');
    expect(hq).toContain("from('commonwealth_crews')");
    expect(hq).toContain("from('commonwealth_crew_members')");
    expect(nav).toContain("href:'/crews'");
  });
  it('limits logo uploads and mutation to the captain',()=>{
    expect(schema).toContain("2097152,array['image/jpeg','image/png','image/webp']");
    expect(schema).toContain('c.captain_id=(select auth.uid())');
    expect(schema).toContain("raise exception 'Only the crew captain may change the logo'");
    expect(hq).toContain("commonwealth_set_crew_logo");
  });
  it('invites teammates with explicit recipient acceptance and membership controls',()=>{
    expect(schema).toContain("commonwealth_invite_player(p_crew uuid,p_player uuid)");
    expect(schema).toContain("commonwealth_respond_invitation(p_invitation uuid,p_accept boolean)");
    expect(schema).toContain("if v_inv.inviter_id=v_captain then");
    expect(schema).toContain("public.commonwealth_join_requests");
    expect(schema).toContain("Daily invitation limit reached");
    expect(schema).toContain("public.notifications");
    expect(hq).toContain("Request to join");
  });
  it('exposes a member-curated five rather than buying ranking points',()=>{
    expect(schema).toContain("position between 1 and 5");
    expect(schema).toContain("commonwealth_set_crew_favorites(p_members uuid[])");
    expect(hq).toContain('My top five');
    expect(profile).toContain('My Crew Top 5');
    expect(socialProfile).toContain('<PublicCrewShowcase profileId={profile.id} />');
  });
  it('separates team entry from individual attendance and verified Cup scores',()=>{
    expect(schema).toContain("commonwealth_register_crew_run(p_crew uuid,p_run uuid)");
    expect(schema).toContain("r.run_type='competitive'");
    expect(schema).toContain("and r.status='open'");
    expect(schema).not.toContain("insert into public.run_players");
    expect(hq).toContain('RSVP individually');
    expect(runRoom).toContain('<RunCrewEntries runId={run.id} />');
  });
});
