import { NextRequest, NextResponse } from 'next/server';
import { AUDIOUS_APP_NAME, normalizeAudiusTrack } from '@/lib/profile-music';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') || '').trim();
  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ error: 'Search using 2 to 100 characters.' }, { status: 400 });
  }
  try {
    const url = new URL('https://api.audius.co/v1/tracks/search');
    url.searchParams.set('query', query);
    url.searchParams.set('limit', '20');
    url.searchParams.set('app_name', AUDIOUS_APP_NAME);
    const upstream = await fetch(url, { signal: AbortSignal.timeout(9000), cache: 'no-store' });
    if (!upstream.ok) throw new Error('upstream music search unavailable');
    const body: unknown = await upstream.json();
    const data = body && typeof body === 'object' && 'data' in body
      ? (body as { data: unknown }).data : null;
    if (!Array.isArray(data)) throw new Error('unexpected music catalog response');
    const tracks = data.map(normalizeAudiusTrack).filter(track => track !== null);
    return NextResponse.json({ tracks }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Music search is unavailable right now. Please try again.' }, { status: 502 });
  }
}
