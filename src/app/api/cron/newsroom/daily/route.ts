import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  configForBeat,
  deterministicUuid,
  generateNewsArticle,
  newsroomDateKey,
  newsroomHour,
  scheduledBeat,
  slugifyNews,
  type NewsBeat,
} from '@/lib/newsroom';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

function validBeat(value: string | null): value is NewsBeat {
  return value === 'rich-city-league' || value === 'richmond-basketball' || value === 'richmond-culture' || value === 'rcl-insider';
}

function categoryLabel(beat: NewsBeat) {
  if (beat === 'rich-city-league') return 'Rich City League';
  if (beat === 'richmond-basketball') return 'Richmond Basketball';
  if (beat === 'rcl-insider') return 'RCL Insider';
  return 'Richmond Culture';
}

function socialHashtags(beat: NewsBeat) {
  if (beat === 'rich-city-league') return '#RichCityLeague #RCL';
  if (beat === 'richmond-basketball') return '#RichmondBasketball #RVAHoops';
  if (beat === 'rcl-insider') return '#RichCityLeague #RCLNetwork';
  return '#RichmondVA #RVACulture';
}

export async function GET(request: Request) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || bearer !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const requestedBeat = url.searchParams.get('beat');
  const force = url.searchParams.get('force') === '1';
  const hour = newsroomHour();
  const beat = validBeat(requestedBeat) ? requestedBeat : scheduledBeat(hour);

  if (!beat) {
    return NextResponse.json({
      ok: true,
      published: false,
      reason: 'No newsroom beat is scheduled for this Eastern hour.',
      hour,
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server database credentials are not configured.' }, { status: 503 });
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
  const config = configForBeat(beat);
  const dateKey = newsroomDateKey();

  if (!force) {
    const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await db.from('news')
      .select('id,slug,title,published_at')
      .eq('status', 'published')
      .eq('is_automated', true)
      .eq('automation_type', config.automationType)
      .gte('published_at', since)
      .order('published_at', { ascending: false })
      .limit(5);
    const existing = (recent ?? []).find((item: any) => item.published_at && newsroomDateKey(new Date(item.published_at)) === dateKey);
    if (existing?.id) {
      return NextResponse.json({ ok: true, published: false, duplicate: true, beat, article: existing });
    }
  }

  const { data: author, error: authorError } = await db.from('profiles')
    .select('id')
    .eq('system_account_key', config.account)
    .eq('is_system_account', true)
    .eq('is_active', true)
    .maybeSingle();
  if (authorError || !author?.id) {
    return NextResponse.json({ error: `System newsroom account ${config.account} is unavailable.` }, { status: 503 });
  }

  let generated;
  try {
    generated = await generateNewsArticle(db, beat);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Newsroom generation failed.';
    console.error('[rcl-newsroom] generation declined', { beat, message });
    return NextResponse.json({ ok: false, published: false, beat, error: message }, { status: 422 });
  }

  const { article, model, topicId } = generated;
  const slug = slugifyNews(article.title, dateKey);
  const now = new Date().toISOString();
  const sourceUrls = article.sources.map(source => source.url);
  const sourceNames = article.sources.map(source => source.name);

  const { data: news, error: insertError } = await db.from('news').insert({
    author_id: author.id,
    title: article.title,
    slug,
    excerpt: article.excerpt,
    body: article.body,
    cover_image_url: null,
    status: 'published',
    published_at: now,
    updated_at: now,
    category: beat,
    is_automated: true,
    automation_type: config.automationType,
    source_urls: sourceUrls,
    source_names: sourceNames,
    seo_title: article.seoTitle,
    seo_description: article.seoDescription,
    seo_keywords: article.keywords,
    generated_by_model: model,
    editorial_confidence: article.confidence,
  }).select('id,slug,title,published_at').single();

  if (insertError || !news) {
    if (insertError?.code === '23505') {
      return NextResponse.json({ ok: true, published: false, duplicate: true, beat });
    }
    console.error('[rcl-newsroom] insert failed', insertError);
    return NextResponse.json({ error: insertError?.message || 'Unable to publish newsroom article.' }, { status: 500 });
  }

  if (topicId) {
    const { error: topicUpdateError } = await db.from('newsroom_product_topics')
      .update({ last_featured_at: now, updated_at: now })
      .eq('id', topicId);
    if (topicUpdateError) console.error('[rcl-newsroom] topic rotation update failed', topicUpdateError);
  }

  const articleUrl = `/news/${news.slug}`;
  const teaser = [
    `📰 ${categoryLabel(beat).toUpperCase()}`,
    '',
    article.title,
    '',
    article.excerpt,
    '',
    articleUrl,
    '',
    socialHashtags(beat),
  ].join('\n');

  const socialSourceId = deterministicUuid(`${config.automationType}|${dateKey}|social`);
  const { error: postError } = await db.from('posts').insert({
    author_id: author.id,
    body: teaser,
    media_urls: [],
    status: 'published',
    is_automated: true,
    automation_type: `${config.automationType}_promo`,
    automation_source_id: socialSourceId,
  });
  if (postError && postError.code !== '23505') {
    console.error('[rcl-newsroom] social teaser failed', postError);
  }

  return NextResponse.json({
    ok: true,
    published: true,
    beat,
    article: news,
    confidence: article.confidence,
    sources: article.sources,
    model,
  });
}
