import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { randomUUID } from 'node:crypto';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { getPublicClient } from '@/lib/public-data';
import { isRchTvMode, parseRchTvBroadcast, RCH_TV_MODES } from '@/lib/rch-tv-broadcast';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const responseHeaders = { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { mode?: unknown; role?: unknown } | null;
  if (!isRchTvMode(body?.mode) || (body?.role !== 'viewer' && body?.role !== 'producer')) {
    return NextResponse.json({ error: 'Invalid RCH TV channel or participant role.' }, { status: 400, headers: responseHeaders });
  }

  const serverUrl = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!serverUrl || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Broadcast service is not yet connected. Configure LiveKit server credentials.' }, { status: 503, headers: responseHeaders });
  }

  let parsedUrl: URL;
  try { parsedUrl = new URL(serverUrl); } catch {
    return NextResponse.json({ error: 'Live broadcasting service URL is invalid.' }, { status: 503, headers: responseHeaders });
  }
  if (parsedUrl.protocol !== 'wss:' || parsedUrl.username || parsedUrl.password) {
    return NextResponse.json({ error: 'Live broadcasting requires a secure WebRTC connection.' }, { status: 503, headers: responseHeaders });
  }

  if (body.role === 'producer') {
    const auth = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] || null;
    const supabase = await getServerSupabaseClient(auth);
    if (!supabase) return NextResponse.json({ error: 'Authentication service unavailable.' }, { status: 503, headers: responseHeaders });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Sign in as an administrator.' }, { status: 401, headers: responseHeaders });
    const { data: allowed, error: roleError } = await supabase.rpc('is_admin');
    if (roleError || allowed !== true) {
      return NextResponse.json({ error: 'Administrator authorization is required to broadcast.' }, { status: 403, headers: responseHeaders });
    }
  } else {
    const supabase = getPublicClient();
    if (!supabase) return NextResponse.json({ error: 'Viewer service unavailable.' }, { status: 503, headers: responseHeaders });
    const { data, error } = await supabase.from('site_settings')
      .select('value').eq('key', RCH_TV_MODES[body.mode].key).maybeSingle();
    if (error || !parseRchTvBroadcast(body.mode, data?.value).active) {
      return NextResponse.json({ error: 'There is no active broadcast on this channel.' }, { status: 404, headers: responseHeaders });
    }
  }

  // Viewers receive subscribe-only tokens. No LiveKit API secret reaches the browser.
  const token = new AccessToken(apiKey, apiSecret, {
    identity: randomUUID(),
    name: body.role === 'producer' ? 'RCH TV Producer' : 'RCH TV Viewer',
    ttl: '10m',
  });
  token.addGrant({
    roomJoin: true,
    room: RCH_TV_MODES[body.mode].room,
    canPublish: body.role === 'producer',
    canPublishData: false,
    canSubscribe: body.role === 'viewer',
    roomAdmin: false,
    roomCreate: false,
  });

  return NextResponse.json({ url: serverUrl, token: await token.toJwt() }, { headers: responseHeaders });
}
