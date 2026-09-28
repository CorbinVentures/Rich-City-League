import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { fetchLeagueAppsBatch, type LeagueAppsResource } from '@/lib/leagueapps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SyncResult = {
  resource: LeagueAppsResource;
  recordsSynced: number;
  batches: number;
  status: 'success' | 'partial';
};

async function syncResource(db: SupabaseClient, resource: LeagueAppsResource): Promise<SyncResult> {
  const { data: previous, error: stateError } = await db
    .from('leagueapps_sync_state')
    .select('last_updated,last_id')
    .eq('resource', resource)
    .maybeSingle();
  if (stateError) throw new Error(`${resource} state: ${stateError.message}`);

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

    if (resource === 'registrations-2') {
      const { error: materializeError } = await db.rpc('materialize_leagueapps_players');
      if (materializeError) throw new Error(`player reconciliation: ${materializeError.message}`);
    }

    const status: SyncResult['status'] = batches >= maxBatches ? 'partial' : 'success';
    const { error: saveError } = await db.from('leagueapps_sync_state').upsert({
      resource,
      last_updated: cursor.lastUpdated,
      last_id: cursor.lastId,
      last_synced_at: new Date().toISOString(),
      records_synced: total,
      status,
      last_error: null,
    });
    if (saveError) throw new Error(`sync state: ${saveError.message}`);

    return { resource, recordsSynced: total, batches, status };
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
    throw new Error(`${resource}: ${message}`);
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get('authorization');
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
  if (!cronSecret || bearer !== cronSecret) {
    return NextResponse.json({ error: 'Cron authorization required.' }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server-only Supabase credentials are required.' }, { status: 503 });
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const members = await syncResource(db, 'members-2');
    const registrations = await syncResource(db, 'registrations-2');
    return NextResponse.json({ ok: true, members, registrations, checkedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'LeagueApps people sync failed.' }, { status: 502 });
  }
}
