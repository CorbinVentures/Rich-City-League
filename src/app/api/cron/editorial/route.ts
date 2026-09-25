import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Story = {
  account: 'rcl-business' | 'rva-hoops';
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt?: string;
};

const allowedAccounts = new Set(['rcl-business', 'rva-hoops']);

function normalizeUrl(value: string) {
  const url = new URL(value);
  url.hash = '';
  ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid'].forEach(k => url.searchParams.delete(k));
  return url.toString();
}

function fingerprint(story: Story) {
  return crypto.createHash('sha256').update([story.account, normalizeUrl(story.sourceUrl), story.title.trim().toLowerCase()].join('|')).digest('hex');
}

export async function POST(request: Request) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || bearer !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)?.trim();
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'Server database credentials are not configured.' }, { status: 503 });

  let story: Story;
  try { story = await request.json(); } catch { return NextResponse.json({ error: 'Valid JSON is required.' }, { status: 400 }); }
  if (!allowedAccounts.has(story.account) || !story.title?.trim() || !story.summary?.trim() || !story.sourceName?.trim() || !story.sourceUrl?.trim()) {
    return NextResponse.json({ error: 'A supported account, title, summary, sourceName and sourceUrl are required.' }, { status: 400 });
  }

  let sourceUrl: string;
  try {
    sourceUrl = normalizeUrl(story.sourceUrl);
    if (!/^https?:$/.test(new URL(sourceUrl).protocol)) throw new Error('bad protocol');
  } catch {
    return NextResponse.json({ error: 'A valid HTTP(S) source URL is required.' }, { status: 400 });
  }

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const key = fingerprint({ ...story, sourceUrl });

  const { data: existing } = await db.from('editorial_publications').select('post_id').eq('fingerprint', key).maybeSingle();
  if (existing?.post_id) return NextResponse.json({ ok: true, duplicate: true, postId: existing.post_id });

  const { data: profile, error: profileError } = await db.from('profiles').select('id').eq('system_account_key', story.account).eq('is_system_account', true).eq('is_active', true).maybeSingle();
  if (profileError || !profile?.id) return NextResponse.json({ error: 'Editorial system account is unavailable.' }, { status: 503 });

  const published = story.publishedAt ? `\nPublished: ${story.publishedAt}` : '';
  const body = `${story.title.trim()}\n\n${story.summary.trim()}\n\nSource: ${story.sourceName.trim()}${published}\n${sourceUrl}`;
  const eventId = crypto.randomUUID();

  const { data: post, error: postError } = await db.from('posts').insert({
    author_id: profile.id, body, media_urls: [], status: 'published', is_automated: true,
    automation_type: story.account === 'rcl-business' ? 'daily_business_editorial' : 'rva_basketball_news',
    automation_source_id: eventId,
  }).select('id').single();
  if (postError || !post) return NextResponse.json({ error: postError?.message || 'Unable to publish.' }, { status: 500 });

  const { error: recordError } = await db.from('editorial_publications').insert({
    account_key: story.account, fingerprint: key, title: story.title.trim(), source_name: story.sourceName.trim(),
    source_url: sourceUrl, source_published_at: story.publishedAt || null, post_id: post.id,
  });
  if (recordError) {
    await db.from('posts').delete().eq('id', post.id);
    return NextResponse.json({ error: recordError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, duplicate: false, postId: post.id });
}
