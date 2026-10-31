import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const picker = source('src/components/crews/CrewHomeCourtPicker.tsx');
const creator = source('src/components/crews/CrewCreatorFlow.tsx');
const migration = source('supabase/migrations/20261026060000_crew_home_courts_statewide.sql');

describe('Crew home-court discovery', () => {
  it('requests GPS only from an explicit player action, without persisting coordinates', () => {
    expect(picker).toContain('onClick={useMyLocation}');
    expect(picker).toContain('navigator.geolocation.getCurrentPosition(');
    expect(picker).toContain('const [devicePoint, setDevicePoint] = useState<Coordinates | null>(null)');
    expect(picker).not.toMatch(/localStorage\.setItem|sessionStorage\.setItem|saveGravityLocation/);
    expect(picker).toContain('Choose a city or search by ZIP.');
  });

  it('searches nearby courts using the existing paginated, distance-ranked directory', () => {
    expect(picker).toContain("db.rpc('search_basketball_locations'");
    expect(picker).toContain('p_lat: useDistance ? latitude : null');
    expect(picker).toContain('p_lon: useDistance ? longitude : null');
    expect(picker).toContain('p_radius_miles: radius');
    expect(picker).toContain('p_limit: 48');
    expect(picker).toContain('results.slice(0, visible)');
    expect(picker).toContain('Show more courts');
    expect(picker).toContain('aria-pressed={active}');
    expect(picker).toContain('access unconfirmed'.replace('a', 'A'));
  });

  it('does not silently default a player to a Richmond founding court', () => {
    expect(creator).toContain('useState<CrewHomeCourt | null>(null)');
    expect(creator).toContain('<CrewHomeCourtPicker selected={selectedCourt} onSelect={setSelectedCourt}/>');
    expect(creator).toContain('p_court_slug: selectedCourt!.slug');
    expect(creator).not.toContain("commonwealth_sites");
    expect(creator).toContain('!validName || !validCourt');
  });

  it('separates home identity from Cup competition-venue restrictions', () => {
    expect(migration).toContain('drop constraint if exists commonwealth_crews_season_id_home_court_slug_fkey');
    expect(migration).toContain('from public.basketball_locations l');
    expect(migration).toContain("l.is_active=true and l.region='VA'");
    expect(migration).toContain('b.postal_code ilike');
    expect(migration).not.toContain('insert into public.commonwealth_sites');
    expect(migration).not.toContain('create or replace function public.commonwealth_issue_challenge');
    expect(migration).toContain('grant execute on function public.commonwealth_found_crew');
  });
});
