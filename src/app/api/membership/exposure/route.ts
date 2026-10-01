import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const metricTypes = new Set(['profile_view', 'passport_view', 'profile_share', 'media_view']);
const subjectTypes = new Set(['profile', 'player']);

export async function POST(request: Request) {
  let input: { subjectType?: unknown; subjectId?: unknown; metricType?: unknown } = {};
  try { input = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (typeof input.subjectType !== 'string' || !subjectTypes.has(input.subjectType) || typeof input.subjectId !== 'string' || !input.subjectId || typeof input.metricType !== 'string' || !metricTypes.has(input.metricType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = getSupabaseAdminClient() as any;
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });

  let profileId = input.subjectType === 'profile' ? input.subjectId : null;
  if (!profileId) {
    const { data: player } = await admin.from('players').select('profile_id').eq('id', input.subjectId).maybeSingle();
    profileId = player?.profile_id ?? null;
  }
  if (!profileId) return NextResponse.json({ ok: true, recorded: false });

  const auth = await getServerSupabaseClient();
  const { data: { user } } = auth ? await auth.auth.getUser() : { data: { user: null } } as any;
  if (user?.id === profileId) return NextResponse.json({ ok: true, recorded: false, self: true });

  const cookieHeader = request.headers.get('cookie') || '';
  const existingVisitor = cookieHeader.match(/(?:^|;\s*)rcl_vid=([^;]+)/)?.[1];
  const visitorId = existingVisitor ? decodeURIComponent(existingVisitor) : crypto.randomUUID();
  const metricDate = new Date().toISOString().slice(0, 10);
  const visitorHash = crypto.createHash('sha256').update(`${visitorId}|${profileId}|${input.metricType}|${metricDate}`).digest('hex');

  const { data, error } = await admin.rpc('record_profile_exposure_internal', {
    p_profile_id: profileId,
    p_metric_type: input.metricType,
    p_visitor_hash: visitorHash,
    p_metric_date: metricDate,
  });
  if (error) {
    console.error('profile exposure counter failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, recorded: Boolean(data) });
  if (!existingVisitor) {
    response.cookies.set('rcl_vid', visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }
  return response;
}
