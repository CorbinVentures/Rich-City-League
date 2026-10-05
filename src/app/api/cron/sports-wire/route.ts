import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

type Desk = 'nba-news' | 'nfl-betting-stats';

type WireItem = {
  shouldPublish: boolean;
  title: string;
  summary: string;
  stats?: string[];
  sources: Array<{ name: string; url: string; publishedAt?: string | null }>;
  reason?: string;
};

const deskConfig: Record<Desk, { automationType: string; hours: number[]; label: string }> = {
  'nba-news': {
    automationType: 'nba_breaking_wire',
    hours: Array.from({ length: 17 }, (_, index) => index + 7),
    label: 'NBA News',
  },
  'nfl-betting-stats': {
    automationType: 'nfl_betting_stats_wire',
    hours: [9, 13, 17, 21],
    label: 'NFL Betting Stats',
  },
};

function easternHour(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date);
  return Number(parts.find(part => part.type === 'hour')?.value ?? -1);
}

function easternStamp(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

function extractResponseText(payload: any): string {
  if (typeof payload?.output_text === 'string') return payload.output_text.trim();
  return (payload?.output ?? [])
    .flatMap((item: any) => item?.content ?? [])
    .map((item: any) => item?.text ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function parseJsonObject(text: string) {
  const cleaned = text.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first < 0 || last <= first) throw new Error('Sports wire did not return JSON.');
  return JSON.parse(cleaned.slice(first, last + 1));
}

function normalizeUrl(value: string) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error('Unsupported source URL.');
  url.hash = '';
  ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid'].forEach(key => url.searchParams.delete(key));
  return url.toString();
}

function cleanItem(raw: any): WireItem {
  const sources = Array.isArray(raw?.sources)
    ? raw.sources.map((source: any) => {
        try {
          return {
            name: String(source?.name || new URL(String(source?.url)).hostname).trim().slice(0, 120),
            url: normalizeUrl(String(source?.url || '')),
            publishedAt: source?.publishedAt ? String(source.publishedAt).slice(0, 80) : null,
          };
        } catch {
          return null;
        }
      }).filter(Boolean).slice(0, 4)
    : [];

  return {
    shouldPublish: raw?.shouldPublish === true,
    title: String(raw?.title || '').trim().replace(/\s+/g, ' ').slice(0, 180),
    summary: String(raw?.summary || '').trim().slice(0, 1600),
    stats: Array.isArray(raw?.stats)
      ? raw.stats.map((item: any) => String(item).trim()).filter(Boolean).slice(0, 8)
      : [],
    sources,
    reason: typeof raw?.reason === 'string' ? raw.reason.trim().slice(0, 500) : undefined,
  };
}

function containsBettingAdvice(item: WireItem) {
  const text = [item.title, item.summary, ...(item.stats ?? [])].join(' ').toLowerCase();
  const banned = [
    'best bet',
    'our pick',
    'my pick',
    'lock of the',
    'is a lock',
    'sure thing',
    'guaranteed winner',
    'guaranteed outcome',
    'bet this',
    'wager on',
    'stake ',
    'units on',
    'unit play',
    'parlay',
    'chase losses',
  ];
  return banned.some(phrase => text.includes(phrase));
}

function promptFor(desk: Desk, recent: string[]) {
  const shared = [
    'You are the RCH Sports Wire, a fast but disciplined sports editor.',
    'Search the live web before answering.',
    'Return ONLY one JSON object with keys: shouldPublish, title, summary, stats, sources, reason.',
    'sources must be an array of objects with name, url and optional publishedAt.',
    'Never invent quotes, injuries, transactions, odds, scores, records, percentages or source URLs.',
    'Prefer primary/official sources plus reputable major sports reporting when available.',
    'Do not copy article wording. Summarize in original language.',
    'Do not repeat these recent RCH posts or materially duplicate the same story:',
    JSON.stringify(recent),
  ];

  if (desk === 'nba-news') {
    return [
      ...shared,
      'DESK: NBA News.',
      'Look for genuinely breaking or high-impact NBA developments from roughly the last 6 hours: trades, signings, injuries with meaningful status changes, suspensions, coaching/front-office moves, major league announcements, significant game developments, or verified star-player news.',
      'Do not publish ordinary commentary, evergreen rankings, rumor-only stories, low-impact transactions or recycled news.',
      'If one strong primary source fully establishes a straightforward official announcement, one source is acceptable; otherwise use at least two credible sources.',
      'Summary should be 2-5 short paragraphs and explain what happened, why it matters, and what is known versus still developing.',
      'stats may contain up to 5 verified quick facts relevant to the story.',
      'If nothing truly breaking is fresh enough, set shouldPublish=false.',
    ].join('\n\n');
  }

  return [
    ...shared,
    'DESK: NFL Betting Stats.',
    'This is an informational sports-data page, not a picks service.',
    'Find current publicly reported NFL market/stat information that can be verified: consensus point spreads, totals, moneylines, line movement, ATS records, over/under records, home/away splits and major injury news that materially changes published lines.',
    'Use current season data and identify the matchup/date in the title or summary. Odds and lines must include the source and should be treated as snapshots that can change.',
    'Never recommend a wager, call anything a lock, guarantee an outcome, tell users how much to bet, suggest chasing losses, or optimize staking.',
    'stats should contain 3-8 concise verified data points. If there is no meaningful current NFL market data to report, set shouldPublish=false.',
    'Use at least two credible sources whenever practical, including an official league/team/injury source when injury status is material.',
  ].join('\n\n');
}

async function generateWireItem(db: SupabaseClient, desk: Desk) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const config = deskConfig[desk];
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data: recentRows } = await db.from('posts')
    .select('body,created_at')
    .eq('automation_type', config.automationType)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(12);
  const recent = (recentRows ?? []).map((row: any) => String(row.body || '').slice(0, 500));

  const model = process.env.OPENAI_SPORTS_WIRE_MODEL?.trim() || 'gpt-6-sol';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: promptFor(desk, recent),
      tools: [{ type: 'web_search' }],
      max_output_tokens: 2600,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('[sports-wire] OpenAI error', response.status, detail);
    throw new Error(`Sports wire model request failed with status ${response.status}.`);
  }

  const item = cleanItem(parseJsonObject(extractResponseText(await response.json())));
  if (!item.shouldPublish) return item;
  if (item.title.length < 12 || item.summary.length < 80) throw new Error('Sports wire item is too thin.');
  if (!item.sources.length) throw new Error('Sports wire item has no verifiable sources.');
  if (desk === 'nfl-betting-stats' && (item.stats?.length ?? 0) < 2) throw new Error('NFL stats item does not contain enough verified data points.');
  if (desk === 'nfl-betting-stats' && containsBettingAdvice(item)) throw new Error('NFL stats item contains betting-advice language and will not publish.');
  return item;
}

function sourceId(desk: Desk, title: string) {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const hex = crypto.createHash('sha256').update(`${desk}|${normalized}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function postBody(desk: Desk, item: WireItem) {
  const sources = item.sources
    .map(source => `• ${source.name}: ${source.url}`)
    .join('\n');

  if (desk === 'nba-news') {
    const facts = item.stats?.length ? `\n\nQUICK FACTS\n${item.stats.map(stat => `• ${stat}`).join('\n')}` : '';
    return `🚨 NBA NEWS · BREAKING\n\n${item.title}\n\n${item.summary}${facts}\n\nSOURCES\n${sources}\n\nUpdated ${easternStamp()}\n\n#NBANews #RCHSports`;
  }

  const stats = (item.stats ?? []).map(stat => `• ${stat}`).join('\n');
  return `📊 NFL BETTING STATS · MARKET SNAPSHOT\n\n${item.title}\n\n${item.summary}\n\nDATA\n${stats}\n\nSOURCES\n${sources}\n\nUpdated ${easternStamp()}\nOdds and lines can change. Informational only; no guaranteed outcomes. 21+ where legal.\n\n#NFLStats #RCHSports`;
}

async function publish(db: SupabaseClient, desk: Desk, item: WireItem) {
  const config = deskConfig[desk];
  const { data: profile } = await db.from('profiles')
    .select('id')
    .eq('system_account_key', desk)
    .eq('is_system_account', true)
    .eq('is_active', true)
    .maybeSingle();
  if (!profile?.id) return { desk, ok: false, error: `${config.label} system profile is unavailable.` };

  const fingerprint = sourceId(desk, item.title);
  const { data: existing } = await db.from('posts')
    .select('id')
    .eq('automation_type', config.automationType)
    .eq('automation_source_id', fingerprint)
    .maybeSingle();
  if (existing?.id) return { desk, ok: true, duplicate: true, postId: existing.id };

  const { data: post, error } = await db.from('posts').insert({
    author_id: profile.id,
    body: postBody(desk, item),
    media_urls: [],
    status: 'published',
    is_automated: true,
    automation_type: config.automationType,
    automation_source_id: fingerprint,
  }).select('id').single();

  if (error || !post) return { desk, ok: false, error: error?.message || 'Unable to publish sports wire post.' };
  return { desk, ok: true, duplicate: false, postId: post.id };
}

export async function GET(request: Request) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || bearer !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)?.trim();
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'Server database credentials are not configured.' }, { status: 503 });

  const hour = easternHour();
  const url = new URL(request.url);
  const requestedDesk = url.searchParams.get('desk');
  const forcedDesk: Desk | null = requestedDesk === 'nba-news' || requestedDesk === 'nfl-betting-stats' ? requestedDesk : null;
  const desks: Desk[] = forcedDesk
    ? [forcedDesk]
    : (Object.keys(deskConfig) as Desk[]).filter(desk => deskConfig[desk].hours.includes(hour));

  if (!desks.length) return NextResponse.json({ ok: true, dispatched: [], reason: 'No sports wire desk is scheduled for this Eastern hour.' });

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const results = [];

  for (const desk of desks) {
    try {
      const item = await generateWireItem(db, desk);
      if (!item.shouldPublish) {
        results.push({ desk, ok: true, published: false, reason: item.reason || 'No sufficiently strong update.' });
        continue;
      }
      results.push(await publish(db, desk, item));
    } catch (error) {
      const failure = { desk, ok: false, error: error instanceof Error ? error.message : 'Unknown sports wire error.' };
      console.error('[sports-wire] failed', failure);
      results.push(failure);
    }
  }

  return NextResponse.json({ ok: results.every(result => result.ok), hour, dispatched: results });
}
