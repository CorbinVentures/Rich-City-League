import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { recordingConfig } from '@/lib/rch-tv-recording';
import { emergencyShutdown, recordingDashboard, startSafeRecording, stopSafeRecording } from '@/lib/rch-tv-recording-safety';
import { isRchTvMode } from '@/lib/rch-tv-broadcast';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' };
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers });

async function authorize(request: Request): Promise<string | false | 'unavailable'> {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const client = await getServerSupabaseClient(match[1]);
  if (!client) return 'unavailable';
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return false;
  const { data: allowed, error: roleError } = await client.rpc('is_admin');
  return !roleError && allowed === true ? user.id : false;
}
async function preflight(request: Request) {
  const allowed = await authorize(request);
  if (!allowed || allowed === 'unavailable') return { error: json({ error: allowed === 'unavailable' ? 'Authentication service unavailable.' : 'Administrator authorization required.' }, allowed === 'unavailable' ? 503 : 403), userId: null };
  return { error: null, userId: allowed };
}

export async function GET(request: Request) {
  const auth = await preflight(request);
  if (auth.error) return auth.error;
  const mode = new URL(request.url).searchParams.get('mode');
  if (!isRchTvMode(mode)) return json({ error: 'Invalid recording channel.' }, 400);
  try {
    return json(await recordingDashboard(mode));
  } catch {
    return json({ error: 'Unable to confirm cloud recording status. Do not assume it is active.' }, 503);
  }
}

export async function POST(request: Request) {
  const auth = await preflight(request);
  if (auth.error) return auth.error;
  const payload = await request.json().catch(() => null) as { mode?: unknown; action?: unknown } | null;
  if (!isRchTvMode(payload?.mode) || !['start', 'stop', 'emergency'].includes(String(payload?.action))) return json({ error: 'Invalid recording request.' }, 400);
  const config = recordingConfig(process.env);
  if (payload!.action !== 'emergency' && config.state !== 'available')
    return json({ error: 'Cloud recording is not approved/configured.', state: config.state }, 503);
  try {
    const result = payload!.action === 'emergency'
      ? await emergencyShutdown(payload!.mode)
      : payload!.action === 'start'
        ? await startSafeRecording(payload!.mode, auth.userId!)
        : await stopSafeRecording(payload!.mode);
    return json(result);
  } catch (error) {
    // The API only exposes a bounded set of operator-safe messages.
    const message = error instanceof Error ? error.message : '';
    const safe = /^(A recording is already|Another recording reserved|Daily recording-minute budget reached|Recording start could not be confirmed|Recording safety service is unavailable|Safety limits missing)/.test(message);
    return json({ error: safe ? message : 'Recording action failed. Verify LiveKit and the Game Day safety dashboard.' }, safe ? 409 : 502);
  }
}
