import { NextRequest, NextResponse } from 'next/server';
import { AUDIOUS_APP_NAME, normalizeAudiusTrack, profileTrackId } from '@/lib/profile-music';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const id = profileTrackId('audius:' + (request.nextUrl.searchParams.get('id') || ''));
  if (!id) return NextResponse.json({ error: 'Invalid music selection.' }, { status: 400 });
  try {
    const upstream = await fetch(
      `https://api.audius.co/v1/tracks/${encodeURIComponent(id)}?app_name=${AUDIOUS_APP_NAME}`,
      { signal: AbortSignal.timeout(9000), cache: 'no-store' },
    );
    if (!upstream.ok) throw new Error('track unavailable');
    const body: unknown = await upstream.json();
    const data = body && typeof body === 'object' && 'data' in body
      ? (body as { data: unknown }).data : null;
    const track = normalizeAudiusTrack(data);
    if (!track) return NextResponse.json({ error: 'This song is no longer available for streaming.' }, { status: 404 });
    return NextResponse.json({ track }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Unable to load this song right now.' }, { status: 502 });
  }
}
