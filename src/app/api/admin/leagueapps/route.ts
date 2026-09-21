import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { fetchLeagueAppsBatch, getLeagueAppsConfigStatus, type LeagueAppsResource } from '@/lib/leagueapps';

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
      state: error ? [] : (state ?? []),
      checkedAt: new Date().toISOString(),
    });
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

    // Keep the public RCL player directory reconciled after registration syncs.\n    // The database function is idempotent and keyed by LeagueApps userId.\n    if (resource === 'registrations-2') {\n      const { error: materializeError } = await db.rpc('materialize_leagueapps_players');\n      if (materializeError) throw new Error(`LeagueApps player reconciliation failed: ${materializeError.message}`);\n    }\n\n    const status = batches >= maxBatches ? 'partial' : 'success';\n    await db.from('leagueapps_sync_state').upsert({
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
