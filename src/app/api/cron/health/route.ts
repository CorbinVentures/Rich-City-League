import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Protected diagnostics for the newsroom and sports wire.
 * Never returns credentials or private member data.
 */
export async function GET(request: Request) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || bearer !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const aiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)?.trim();
  const databaseConfigured = Boolean(supabaseUrl && serviceKey);
  const checks = {
    aiModelConfigured: aiConfigured,
    databaseConfigured,
    newsroomSchedule: '07:00 / 11:00 / 13:00 / 16:00 America/New_York',
    sportsWireScheduled: true,
  };

  if (!databaseConfigured || !supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, checks, issue: 'Database server configuration is missing.' }, { status: 503 });
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const [newsResult, automatedNewsResult, wireResult] = await Promise.all([
      db.from('news').select('id,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(1),
      db.from('news').select('id,published_at').eq('status', 'published').eq('is_automated', true).order('published_at', { ascending: false }).limit(1),
      db.from('posts').select('id,created_at').eq('status', 'published').in('automation_type', ['nba_breaking_wire','nfl_betting_stats_wire']).order('created_at', { ascending: false }).limit(1),
    ]);

    const dbError = newsResult.error || automatedNewsResult.error || wireResult.error;
    if (dbError) throw dbError;

    const latestAutomatedNews = automatedNewsResult.data?.[0]?.published_at ?? null;
    const hoursSinceAutomatedNews = latestAutomatedNews
      ? Math.round((Date.now() - new Date(latestAutomatedNews).getTime()) / 3_600_000)
      : null;

    return NextResponse.json({
      ok: aiConfigured,
      checkedAt: new Date().toISOString(),
      checks,
      latestPublishedNews: newsResult.data?.[0]?.published_at ?? null,
      latestAutomatedNews,
      latestSportsWirePost: wireResult.data?.[0]?.created_at ?? null,
      hoursSinceAutomatedNews,
      warning: !aiConfigured ? 'Configure OPENAI_API_KEY as a sensitive production environment variable and redeploy.'
        : hoursSinceAutomatedNews === null || hoursSinceAutomatedNews > 48
          ? 'No recent generated newsroom article. Check cron logs and editorial validation.'
          : null,
    }, { status: aiConfigured ? 200 : 503 });
  } catch (error) {
    console.error('[cron-health] newsroom health query failed', error);
    return NextResponse.json({ ok: false, checks, issue: 'Unable to check newsroom publication history.' }, { status: 503 });
  }
}
