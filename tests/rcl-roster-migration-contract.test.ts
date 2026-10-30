import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20261030232834_rcl_one_active_team_per_player_per_season.sql';
const migration = readFileSync(join(process.cwd(), migrationPath), 'utf8');

describe('RCL one active club per player per season — migration contract', () => {
  it('serializes assignments for the same player and season, regardless of roster RLS visibility', () => {
    expect(migration).toContain('private.enforce_single_active_rcl_roster()');
    expect(migration).toContain("security definer set search_path = ''");
    expect(migration).toContain('pg_catalog.pg_advisory_xact_lock');
    expect(migration).toContain('r.player_id = new.player_id');
    expect(migration).toContain('ts.season_id = target_season');
    expect(migration).toContain('r.left_at is null');
    expect(migration).toContain('r.team_season_id <> new.team_season_id');
    expect(migration).toContain("errcode = '23505'");
  });

  it('guards both inserts and reactivation, but permits completed release history', () => {
    expect(migration).toContain('if new.left_at is not null then return new; end if;');
    expect(migration).toContain('before insert or update of player_id, team_season_id, left_at');
    expect(migration).not.toMatch(/alter table public\.rosters\s+add constraint.*roster_limit/is);
  });

  it('prevents reassignment of team-season identity once history exists', () => {
    expect(migration).toContain('private.freeze_team_season_with_roster_history()');
    expect(migration).toContain('before update of season_id, team_id on public.team_seasons');
    expect(migration).toContain('where r.team_season_id = old.id');
  });

  it('restricts direct execution of privileged trigger functions', () => {
    expect(migration).toContain('revoke all on function private.enforce_single_active_rcl_roster()');
    expect(migration).toContain('revoke all on function private.freeze_team_season_with_roster_history()');
    expect(migration).toMatch(/from public, anon, authenticated;/);
  });
});
