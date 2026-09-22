import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { fetchLeagueAppsBatch, fetchLeagueAppsLocations, fetchLeagueAppsProgramSchedule, fetchLeagueAppsProgramTeams, fetchLeagueAppsSitePrograms, getLeagueAppsConfigStatus, getLeagueAppsPublicConfigStatus, type LeagueAppsResource } from '@/lib/leagueapps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unauthorized(message = 'Admin access required.') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  const supabase = await getServerSupabaseClient(bearerToken);
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return unauthorized('Your admin session was not recognized by the server. Please sign in again.');

  const db = supabase as any;
  const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: 'Unable to verify your admin role.' }, { status: 500 });
  if (profile?.role !== 'admin') return unauthorized('Admin role required.');

  const url = new URL(request.url);
  const action = url.searchParams.get('action') ?? 'status';

  if (action === 'status') {
    const { data: state, error } = await db.from('leagueapps_sync_state').select('*').order('resource');
    return NextResponse.json({
      configured: getLeagueAppsConfigStatus(),
      publicConfigured: getLeagueAppsPublicConfigStatus(),
      state: error ? [] : (state ?? []),
      checkedAt: new Date().toISOString(),
    });
  }

  if (action === 'sync-competition') {
    try {
      const { data: approvedScope, error: scopeError } = await db.from('leagueapps_program_scope')
        .select('program_id,program_name').eq('scope', 'mens').eq('enabled', true).order('program_id');
      if (scopeError) throw new Error(scopeError.message);

      // Competition data must come from LeagueApps' current Public API program list.
      // Registrations cannot discover a brand-new program with zero registrants.
      const publicPrograms = await fetchLeagueAppsSitePrograms();
      const normalizeName = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\\s+/g, ' ');
      const approvedNames = new Set((approvedScope ?? []).map((p: any) => normalizeName(p.program_name)));
      const toMillis = (value: unknown): number | null => {
        if (typeof value === 'number' && Number.isFinite(value)) return value < 10_000_000_000 ? value * 1000 : value;
        if (typeof value === 'string' && value.trim()) {
          const n = Number(value);
          if (Number.isFinite(n) && /^\\d+$/.test(value.trim())) return n < 10_000_000_000 ? n * 1000 : n;
          const parsed = Date.parse(value);
          return Number.isNaN(parsed) ? null : parsed;
        }
        return null;
      };
      const now = Date.now();
      const discovered = publicPrograms.map((p: any) => {
        const programId = Number(p.id ?? p.programId ?? p.programID);
        const programName = String(p.name ?? p.programName ?? '').trim();
        const state = String(p.state ?? p.programState ?? p.status ?? '').trim().toLowerCase();
        const startMs = toMillis(p.startDate ?? p.startTime ?? p.programStartDate);
        const endMs = toMillis(p.endDate ?? p.endTime ?? p.programEndDate);
        return { raw: p, programId, programName, state, startMs, endMs };
      }).filter((p: any) => Number.isFinite(p.programId) && p.programName && approvedNames.has(normalizeName(p.programName)));

      const upcoming = discovered.filter((p: any) =>
        p.state.includes('upcoming') ||
        (p.startMs !== null && p.startMs >= now) ||
        (p.endMs !== null && p.endMs >= now && !p.state.includes('completed'))
      );
      // Prefer the newest approved upcoming program for each approved program name.
      const selectedByName = new Map<string, any>();
      for (const p of upcoming.sort((a: any,b: any) => (b.startMs ?? 0) - (a.startMs ?? 0))) {
        const key = normalizeName(p.programName);
        if (!selectedByName.has(key)) selectedByName.set(key, p);
      }
      const scope = [...selectedByName.values()].map((p: any) => ({ program_id: p.programId, program_name: p.programName, start_ms: p.startMs, end_ms: p.endMs }));
      if (!scope.length) throw new Error('No approved upcoming LeagueApps programs were discovered from the Public API.');

      const { data: league, error: leagueError } = await db.from('leagues').select('id').eq('is_active', true).order('created_at').limit(1).maybeSingle();
      if (leagueError || !league?.id) throw new Error(leagueError?.message ?? 'No active RCL league exists.');

      // Materialize the selected upcoming program directly from Public API metadata.
      for (const program of scope) {
        const start = program.start_ms ? new Date(program.start_ms) : new Date();
        const end = program.end_ms ? new Date(program.end_ms) : new Date(start.getTime() + 120 * 86400000);
        const startDate = start.toISOString().slice(0,10);
        const endDate = end.toISOString().slice(0,10);
        const slug = `la-${program.program_id}-${normalizeName(program.program_name).replace(/[^a-z0-9]+/g,'-').slice(0,40)}`;
        const { error: seasonUpsertError } = await db.from('seasons').upsert({
          league_id: league.id, name: program.program_name, slug,
          start_date: startDate, end_date: endDate, status: 'registration',
          leagueapps_program_id: program.program_id, updated_at: new Date().toISOString(),
        }, { onConflict: 'leagueapps_program_id' });
        if (seasonUpsertError) throw new Error(`program ${program.program_id}: ${seasonUpsertError.message}`);
      }

      const locations = await fetchLeagueAppsLocations();
      const locationMap = new Map<string, string>();
      for (const location of locations) {
        const externalId = String(location.id ?? location.locationId ?? '');
        const name = String(location.name ?? location.locationName ?? '').trim();
        if (!externalId || !name) continue;
        const { data: existing } = await db.from('venues').select('id').eq('name', name).maybeSingle();
        let venueId = existing?.id as string | undefined;
        if (!venueId) {
          const address = String(location.address ?? location.address1 ?? '').trim() || null;
          const city = String(location.city ?? '').trim() || null;
          const state = String(location.state ?? '').trim() || null;
          const postal_code = String(location.zip ?? location.zipCode ?? location.postalCode ?? '').trim() || null;
          const { data: created, error } = await db.from('venues').insert({ name, address, city, state, postal_code, amenities: { leagueapps_location_id: externalId } }).select('id').single();
          if (error) throw new Error(error.message);
          venueId = created.id;
        }
        if (venueId) locationMap.set(externalId, venueId);
      }

      let teamsSeen = 0;
      let gamesUpserted = 0;
      const currentTeamIds = new Set<string>();
      const errors: string[] = [];

      for (const program of scope ?? []) {
        const programId = Number(program.program_id);
        try {
          const [{ data: season, error: seasonError }, publicTeams, schedule] = await Promise.all([
            db.from('seasons').select('id').eq('leagueapps_program_id', programId).maybeSingle(),
            fetchLeagueAppsProgramTeams(programId),
            fetchLeagueAppsProgramSchedule(programId),
          ]);
          if (seasonError) throw new Error(seasonError.message);
          if (!season?.id) { errors.push(`${programId}: no RCL season mapping`); continue; }
          teamsSeen += publicTeams.length;

          // Materialize teams/team-seasons from the Public API itself. This is essential
          // for upcoming programs that legitimately have zero registrations.
          const { data: leagueTeams, error: leagueTeamsError } = await db.from('teams').select('id,name').eq('league_id', league.id);
          if (leagueTeamsError) throw new Error(leagueTeamsError.message);
          const existingByName = new Map<string,string>((leagueTeams ?? []).map((t: any) => [normalizeName(t.name), t.id]));
          for (const publicTeam of publicTeams) {
            const externalTeamId = Number(publicTeam.id ?? publicTeam.teamId ?? publicTeam.teamID);
            const teamName = String(publicTeam.name ?? publicTeam.teamName ?? '').trim();
            if (!Number.isFinite(externalTeamId) || !teamName) continue;
            let teamId = existingByName.get(normalizeName(teamName));
            if (!teamId) {
              const slugBase = normalizeName(teamName).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,35) || 'team';
              const { data: createdTeam, error: teamError } = await db.from('teams').insert({
                league_id: league.id, name: teamName, slug: `la-team-${externalTeamId}-${slugBase}`,
                is_active: true, leagueapps_team_id: externalTeamId,
              }).select('id').single();
              if (teamError) throw new Error(`team ${externalTeamId}: ${teamError.message}`);
              teamId = createdTeam.id;
              existingByName.set(normalizeName(teamName), teamId);
            }
            currentTeamIds.add(teamId);
            const { error: tsError } = await db.from('team_seasons').upsert({
              team_id: teamId, season_id: season.id,
            }, { onConflict: 'team_id,season_id' });
            if (tsError) throw new Error(`team-season ${externalTeamId}: ${tsError.message}`);
          }

          // LeagueApps team IDs are program-scoped/historical. Build an explicit
          // program -> external team -> RCL team mapping before importing games.
          const { data: seasonTeams, error: seasonTeamsError } = await db
            .from('team_seasons')
            .select('id,team_id,teams!inner(id,name)')
            .eq('season_id', season.id);
          if (seasonTeamsError) throw new Error(seasonTeamsError.message);

          const normalizeName = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\\s+/g, ' ');
          const seasonTeamByName = new Map<string, { teamId: string; teamSeasonId: string }>();
          for (const row of seasonTeams ?? []) {
            const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
            if (team?.id && team?.name) seasonTeamByName.set(normalizeName(team.name), { teamId: team.id, teamSeasonId: row.id });
          }

          const programTeamMap = new Map<number, string>();
          for (const publicTeam of publicTeams) {
            const externalTeamId = Number(publicTeam.id ?? publicTeam.teamId ?? publicTeam.teamID);
            const teamName = String(publicTeam.name ?? publicTeam.teamName ?? '').trim();
            if (!Number.isFinite(externalTeamId) || !teamName) continue;
            const mapped = seasonTeamByName.get(normalizeName(teamName));
            if (!mapped) {
              errors.push(`${programId} team ${externalTeamId}: no RCL team-season match for "${teamName}"`);
              continue;
            }
            programTeamMap.set(externalTeamId, mapped.teamId);
            const { error: mappingError } = await db.from('leagueapps_team_mappings').upsert({
              program_id: programId,
              leagueapps_team_id: externalTeamId,
              team_id: mapped.teamId,
              team_season_id: mapped.teamSeasonId,
              team_name: teamName,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'program_id,leagueapps_team_id' });
            if (mappingError) throw new Error(`team mapping ${externalTeamId}: ${mappingError.message}`);
          }

          for (const item of schedule) {
            const gameId = Number(item.id ?? item.gameId ?? item.gameID);
            if (!Number.isFinite(gameId)) continue;

            const homeRef = item.homeTeamId ?? item.homeTeamID ?? (item.homeTeam as Record<string, unknown> | undefined)?.id;
            const awayRef = item.awayTeamId ?? item.awayTeamID ?? (item.awayTeam as Record<string, unknown> | undefined)?.id;
            const homeId = Number(homeRef);
            const awayId = Number(awayRef);
            if (!Number.isFinite(homeId) || !Number.isFinite(awayId) || homeId === awayId) continue;

            const homeTeamId = programTeamMap.get(homeId);
            const awayTeamId = programTeamMap.get(awayId);
            if (!homeTeamId || !awayTeamId) { errors.push(`${programId} game ${gameId}: unresolved program team mapping (${homeId} vs ${awayId})`); continue; }

            const rawTime = item.startTime ?? item.startDate ?? item.gameDate ?? item.date ?? item.startsAt;
            let scheduledAt: string | null = null;
            if (typeof rawTime === 'number') { const d = new Date(rawTime < 10_000_000_000 ? rawTime * 1000 : rawTime); if (!Number.isNaN(d.getTime())) scheduledAt = d.toISOString(); }
            else if (typeof rawTime === 'string' && rawTime.trim()) {
              const numeric = Number(rawTime);
              scheduledAt = Number.isFinite(numeric) && /^\d+$/.test(rawTime)
                ? (() => { const d = new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric); return Number.isNaN(d.getTime()) ? null : d.toISOString(); })()
                : (() => { const d = new Date(rawTime); return Number.isNaN(d.getTime()) ? null : d.toISOString(); })();
            }
            if (!scheduledAt || scheduledAt === 'Invalid Date') { errors.push(`game ${gameId}: missing start time`); continue; }

            const homeScoreRaw = item.homeScore ?? item.homeTeamScore;
            const awayScoreRaw = item.awayScore ?? item.awayTeamScore;
            const homeScore = Number.isFinite(Number(homeScoreRaw)) ? Math.max(0, Number(homeScoreRaw)) : 0;
            const awayScore = Number.isFinite(Number(awayScoreRaw)) ? Math.max(0, Number(awayScoreRaw)) : 0;
            const state = String(item.status ?? item.gameStatus ?? '').toLowerCase();
            const scored = homeScoreRaw !== undefined && homeScoreRaw !== null && awayScoreRaw !== undefined && awayScoreRaw !== null;
            const status = state.includes('cancel') ? 'cancelled' : state.includes('postpon') ? 'postponed' : (state.includes('complete') || state.includes('final') || scored) ? 'completed' : 'scheduled';

            const locationRef = item.locationId ?? item.locationID ?? (item.location as Record<string, unknown> | undefined)?.id;
            const venueId = locationRef == null ? null : (locationMap.get(String(locationRef)) ?? null);
            const divisionName = String(item.divisionName ?? item.subProgramName ?? '').trim();
            let divisionId: string | null = null;
            if (divisionName) {
              const { data: division } = await db.from('divisions').select('id').eq('season_id', season.id).eq('name', divisionName).maybeSingle();
              if (division?.id) divisionId = division.id;
              else {
                const { data: created, error } = await db.from('divisions').insert({ season_id: season.id, name: divisionName, age_group: 'Adult', gender: 'Open', leagueapps_program_id: programId }).select('id').single();
                if (!error) divisionId = created.id;
              }
            }

            const { error } = await db.from('games').upsert({
              leagueapps_game_id: gameId, season_id: season.id, division_id: divisionId,
              home_team_id: homeTeamId, away_team_id: awayTeamId, venue_id: venueId,
              scheduled_at: scheduledAt, status, home_score: homeScore, away_score: awayScore,
              notes: String(item.notes ?? item.gameNotes ?? '').trim() || null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'leagueapps_game_id' });
            if (error) throw new Error(`game ${gameId}: ${error.message}`);
            gamesUpserted += 1;
          }
        } catch (programError) {
          errors.push(`${programId}: ${programError instanceof Error ? programError.message : 'sync failed'}`);
        }
      }

      // Only teams belonging to the selected upcoming LeagueApps program(s) are active
      // on current RCL public surfaces. Historical teams remain stored for history.
      if (currentTeamIds.size) {
        const { error: deactivateError } = await db.from('teams').update({ is_active: false, updated_at: new Date().toISOString() }).eq('league_id', league.id);
        if (deactivateError) errors.push(`team activation: ${deactivateError.message}`);
        const { error: activateError } = await db.from('teams').update({ is_active: true, updated_at: new Date().toISOString() }).in('id', [...currentTeamIds]);
        if (activateError) errors.push(`team activation: ${activateError.message}`);
      }

      // Standings are RCL-derived from the official completed LeagueApps results.
      for (const program of scope ?? []) {
        const programId = Number(program.program_id);
        const { data: season } = await db.from('seasons').select('id').eq('leagueapps_program_id', programId).maybeSingle();
        if (!season?.id) continue;
        const { data: teamSeasons } = await db.from('team_seasons').select('team_id,division_id').eq('season_id', season.id);
        const { data: games } = await db.from('games').select('home_team_id,away_team_id,home_score,away_score').eq('season_id', season.id).eq('status', 'completed');
        const table = new Map<string, { wins:number; losses:number; ties:number; pf:number; pa:number; division_id:string|null }>();
        for (const ts of teamSeasons ?? []) table.set(ts.team_id, { wins:0, losses:0, ties:0, pf:0, pa:0, division_id:ts.division_id ?? null });
        for (const game of games ?? []) {
          const h=table.get(game.home_team_id), a=table.get(game.away_team_id); if (!h || !a) continue;
          h.pf+=game.home_score; h.pa+=game.away_score; a.pf+=game.away_score; a.pa+=game.home_score;
          if (game.home_score>game.away_score) { h.wins++; a.losses++; } else if (game.away_score>game.home_score) { a.wins++; h.losses++; } else { h.ties++; a.ties++; }
        }
        const rows=[...table.entries()].map(([team_id,s])=>({season_id:season.id,division_id:s.division_id,team_id,wins:s.wins,losses:s.losses,ties:s.ties,points_for:s.pf,points_against:s.pa,updated_at:new Date().toISOString()}));
        if (rows.length) {
          const { error } = await db.from('standings').upsert(rows,{onConflict:'season_id,team_id'});
          if (error) errors.push(`${programId} standings: ${error.message}`);
        }
      }

      return NextResponse.json({ ok: errors.length === 0, programs: scope?.length ?? 0, locations: locations.length, teamsSeen, gamesUpserted, warnings: errors.slice(0, 50) }, { status: errors.length ? 207 : 200 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Competition sync failed.' }, { status: 502 });
    }
  }

  if (action === 'materialize-structure') {
    const { data, error } = await db.rpc('materialize_leagueapps_structure');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, result: data });
  }

  if (action !== 'sync') {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }

  const resource = url.searchParams.get('resource') as LeagueAppsResource | null;
  if (resource !== 'members-2' && resource !== 'registrations-2') {
    return NextResponse.json({ error: 'Resource must be members-2 or registrations-2.' }, { status: 400 });
  }

  const { data: previous } = await db.from('leagueapps_sync_state').select('last_updated,last_id').eq('resource', resource).maybeSingle();

  let cursor = {
    lastUpdated: Number(previous?.last_updated ?? 0),
    lastId: Number(previous?.last_id ?? 0),
  };

  let total = 0;
  let batches = 0;
  const maxBatches = 10;

  try {
    while (batches < maxBatches) {
      const records = await fetchLeagueAppsBatch(resource, cursor);
      if (!records.length) break;

      const rows = records
        .filter((record) => record.id !== undefined && record.id !== null)
        .map((record) => ({
          resource,
          external_id: String(record.id),
          last_updated: Number(record.lastUpdated ?? 0),
          payload: record,
          synced_at: new Date().toISOString(),
        }));

      if (rows.length) {
        const { error } = await db.from('leagueapps_records').upsert(rows, { onConflict: 'resource,external_id' });
        if (error) throw new Error(error.message);
      }

      total += rows.length;
      batches += 1;

      const last = records[records.length - 1];
      cursor = {
        lastUpdated: Number(last.lastUpdated ?? cursor.lastUpdated),
        lastId: Number(last.id ?? cursor.lastId),
      };

      if (records.length < 1000) break;
    }

    // Keep the public RCL player directory reconciled after registration syncs.
    // The database function is idempotent and keyed by LeagueApps userId.
    if (resource === 'registrations-2') {
      const { error: materializeError } = await db.rpc('materialize_leagueapps_players');
      if (materializeError) throw new Error(`LeagueApps player reconciliation failed: ${materializeError.message}`);
    }

    const status = batches >= maxBatches ? 'partial' : 'success';
    await db.from('leagueapps_sync_state').upsert({
      resource,
      last_updated: cursor.lastUpdated,
      last_id: cursor.lastId,
      last_synced_at: new Date().toISOString(),
      records_synced: total,
      status,
      last_error: null,
    });

    return NextResponse.json({ ok: true, resource, recordsSynced: total, batches, status, cursor });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'LeagueApps sync failed.';
    await db.from('leagueapps_sync_state').upsert({
      resource,
      last_updated: cursor.lastUpdated,
      last_id: cursor.lastId,
      last_synced_at: new Date().toISOString(),
      records_synced: total,
      status: 'error',
      last_error: message.slice(0, 500),
    });
    return NextResponse.json({ error: message, recordsSynced: total }, { status: 502 });
  }
}
