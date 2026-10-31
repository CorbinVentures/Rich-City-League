import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { getRchRecordingStatus, recordingConfig, startRchRecording, stopRchRecording } from '@/lib/rch-tv-recording';
import { isRchTvMode } from '@/lib/rch-tv-broadcast';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' };
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers });

async function authorize(request: Request): Promise<boolean | 'unavailable'> {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const client = await getServerSupabaseClient(match[1]);
  if (!client) return 'unavailable';
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return false;
  const { data: allowed, error: roleError } = await client.rpc('is_admin');
  return !roleError && allowed === true;
}
async function preflight(request: Request) {
  const allowed = await authorize(request);
  if (allowed !== true) return { error: json({ error: allowed === 'unavailable' ? 'Authentication service unavailable.' : 'Administrator authorization required.' }, allowed === 'unavailable' ? 503 : 403) };
  return { error: null };
}

export async function GET(request: Request) {
  const auth = await preflight(request);
  if (auth.error) return auth.error;
  const mode = new URL(request.url).searchParams.get('mode');
  if (!isRchTvMode(mode)) return json({ error: 'Invalid recording channel.' }, 400);
  try {
    return json(await getRchRecordingStatus(mode));
  } catch {
    return json({ error: 'Unable to confirm cloud recording status. Do not assume it is active.' }, 503);
  }
}

export async function POST(request: Request) {
  const auth = await preflight(request);
  if (auth.error) return auth.error;
  const payload = await request.json().catch(() => null) as { mode?: unknown; action?: unknown } | null;
  if (!isRchTvMode(payload?.mode) || !['start', 'stop'].includes(String(payload?.action))) return json({ error: 'Invalid recording request.' }, 400);
  const config = recordingConfig(process.env);
  if (config.state !== 'available') return json({ error: 'Cloud recording is not approved/configured.', state: config.state }, 503);
  try {
    const result = payload!.action === 'start'
      ? await startRchRecording(payload!.mode, config)
      : await stopRchRecording(payload!.mode, config);
    return json(result);
  } catch (error) {
    const duplicate = error instanceof Error && error.message.startsWith('This channel already has a recording.');
    return json({ error: duplicate ? 'A recording is already active on this channel.' : 'Cloud recording action failed. Verify its state in LiveKit.' }, duplicate ? 409 : 502);
  }
}
