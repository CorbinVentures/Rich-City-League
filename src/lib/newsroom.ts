import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export type NewsBeat = 'rich-city-league' | 'richmond-basketball' | 'richmond-culture';

export type NewsSource = {
  name: string;
  url: string;
  publishedAt?: string | null;
};

export type GeneratedNewsArticle = {
  title: string;
  excerpt: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  sources: NewsSource[];
  confidence: number;
  shouldPublish: boolean;
  reason?: string;
};

const SITE = 'https://richcityhoops.com';

const beatConfig: Record<NewsBeat, {
  label: string;
  account: string;
  automationType: string;
  web: boolean;
  minSources: number;
}> = {
  'rich-city-league': {
    label: 'Rich City League',
    account: 'rcl',
    automationType: 'daily_news_rich_city_league',
    web: false,
    minSources: 1,
  },
  'richmond-basketball': {
    label: 'Richmond Basketball',
    account: 'rva-hoops',
    automationType: 'daily_news_richmond_basketball',
    web: true,
    minSources: 1,
  },
  'richmond-culture': {
    label: 'Richmond Culture',
    account: 'rcl-community',
    automationType: 'daily_news_richmond_culture',
    web: true,
    minSources: 1,
  },
};

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
  if (first < 0 || last <= first) throw new Error('The newsroom model did not return a JSON object.');
  return JSON.parse(cleaned.slice(first, last + 1));
}

function normalizeUrl(value: string) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error('Only HTTP(S) sources are supported.');
  url.hash = '';
  ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid'].forEach(key => url.searchParams.delete(key));
  return url.toString();
}

export function newsroomDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: 'year' | 'month' | 'day') => parts.find(part => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function newsroomHour(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date);
  return Number(parts.find(part => part.type === 'hour')?.value ?? -1);
}

export function scheduledBeat(hour: number): NewsBeat | null {
  if (hour === 7) return 'rich-city-league';
  if (hour === 11) return 'richmond-basketball';
  if (hour === 16) return 'richmond-culture';
  return null;
}

export function configForBeat(beat: NewsBeat) {
  return beatConfig[beat];
}

export function slugifyNews(value: string, dateKey: string) {
  const base = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 78);
  return `${base || 'rcl-news'}-${dateKey.replace(/-/g, '')}`;
}

export function deterministicUuid(seed: string) {
  const hex = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function cleanArticle(raw: any, beat: NewsBeat): GeneratedNewsArticle {
  const sources = Array.isArray(raw?.sources)
    ? raw.sources.map((source: any) => {
        try {
          return {
            name: String(source?.name || new URL(String(source?.url)).hostname).trim().slice(0, 160),
            url: normalizeUrl(String(source?.url || '')),
            publishedAt: source?.publishedAt ? String(source.publishedAt) : null,
          };
        } catch {
          return null;
        }
      }).filter(Boolean) as NewsSource[]
    : [];

  const article: GeneratedNewsArticle = {
    title: String(raw?.title || '').trim().replace(/\s+/g, ' ').slice(0, 180),
    excerpt: String(raw?.excerpt || '').trim().replace(/\s+/g, ' ').slice(0, 320),
    body: String(raw?.body || '').trim(),
    seoTitle: String(raw?.seoTitle || raw?.title || '').trim().replace(/\s+/g, ' ').slice(0, 75),
    seoDescription: String(raw?.seoDescription || raw?.excerpt || '').trim().replace(/\s+/g, ' ').slice(0, 180),
    keywords: Array.isArray(raw?.keywords)
      ? [...new Set(raw.keywords.map((item: any) => String(item).trim()).filter(Boolean))].slice(0, 10)
      : [],
    sources,
    confidence: Math.max(0, Math.min(1, Number(raw?.confidence) || 0)),
    shouldPublish: raw?.shouldPublish === true,
    reason: typeof raw?.reason === 'string' ? raw.reason.trim().slice(0, 500) : undefined,
  };

  if (beat === 'rich-city-league' && !article.sources.length) {
    article.sources = [{ name: 'Rich City League official data', url: `${SITE}/league` }];
  }
  return article;
}

function validateArticle(article: GeneratedNewsArticle, beat: NewsBeat) {
  const config = beatConfig[beat];
  if (!article.shouldPublish) throw new Error(article.reason || 'The newsroom declined to publish this beat today.');
  if (article.confidence < 0.78) throw new Error(`Editorial confidence was too low (${article.confidence.toFixed(2)}).`);
  if (article.title.length < 18) throw new Error('Headline is too thin for publication.');
  if (article.excerpt.length < 70) throw new Error('Excerpt is too thin for publication.');
  if (article.body.length < 1800) throw new Error('Article body is too thin for publication.');
  if (article.body.length > 12000) throw new Error('Article body is too long for the daily newsroom.');
  if (article.sources.length < config.minSources) throw new Error('The article did not include enough verifiable sources.');
  if (article.keywords.length < 3) throw new Error('The article did not include enough focused search topics.');

  const bodyLower = article.body.toLowerCase();
  const banned = [
    'as an ai language model',
    'i cannot verify',
    'i can\'t verify',
    'placeholder',
    'insert source',
    'lorem ipsum',
  ];
  if (banned.some(value => bodyLower.includes(value))) throw new Error('The article contains an editorial placeholder or uncertainty marker.');

  return article;
}

async function recentNewsContext(db: SupabaseClient) {
  const since = new Date(Date.now() - 21 * 86_400_000).toISOString();
  const { data } = await db.from('news')
    .select('title,category,published_at,source_urls')
    .eq('status', 'published')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(30);
  return data ?? [];
}

async function richCityLeagueContext(db: SupabaseClient) {
  const now = new Date();
  const past = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const future = new Date(now.getTime() + 14 * 86_400_000).toISOString();

  const [seasonResult, gamesResult, teamsResult, standingsResult, runsResult, recentResult] = await Promise.all([
    db.from('seasons').select('id,name,status,registration_open,start_date,end_date').in('status', ['registration','active','completed']).order('start_date', { ascending: false }).limit(3),
    db.from('games').select('id,season_id,home_team_id,away_team_id,scheduled_at,status,home_score,away_score').gte('scheduled_at', past).lte('scheduled_at', future).order('scheduled_at', { ascending: false }).limit(30),
    db.from('teams').select('id,name,slug').eq('is_active', true).order('name').limit(100),
    db.from('standings').select('season_id,team_id,wins,losses,ties,points_for,points_against,rank').order('rank', { ascending: true, nullsFirst: false }).limit(100),
    db.from('runs').select('title,court_name,location,starts_at,status,max_players').eq('status', 'open').gte('starts_at', now.toISOString()).order('starts_at', { ascending: true }).limit(8),
    db.from('news').select('title,slug,category,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(12),
  ]);

  const teams = (teamsResult.data ?? []) as Array<{ id: string; name: string; slug: string | null }>;
  const teamNames = new Map(teams.map(team => [team.id, team.name]));

  return {
    generatedAt: now.toISOString(),
    officialSite: SITE,
    seasons: seasonResult.data ?? [],
    games: (gamesResult.data ?? []).map((game: any) => ({
      scheduled_at: game.scheduled_at,
      status: game.status,
      home: teamNames.get(game.home_team_id) || game.home_team_id,
      away: teamNames.get(game.away_team_id) || game.away_team_id,
      home_score: game.home_score,
      away_score: game.away_score,
    })),
    standings: (standingsResult.data ?? []).map((row: any) => ({
      season_id: row.season_id,
      team: teamNames.get(row.team_id) || row.team_id,
      wins: row.wins,
      losses: row.losses,
      ties: row.ties,
      rank: row.rank,
      points_for: row.points_for,
      points_against: row.points_against,
    })),
    openRuns: runsResult.data ?? [],
    recentRclNews: recentResult.data ?? [],
  };
}

function editorialInstructions(beat: NewsBeat) {
  const shared = [
    'You are the RCL Newsroom: a disciplined local reporter, editor, PR strategist and search editor for Rich City League in Richmond, Virginia.',
    'The article must be useful to a real Richmond reader first. SEO is secondary to accuracy, local relevance and original analysis.',
    'Write an original reported article, not a rewritten feed item. Do not copy sentences from sources.',
    'Never invent quotes, attendance, scores, records, dates, injuries, commitments, allegations, business details or personal facts.',
    'No fake interviews. No anonymous-source language. No rumor presented as fact.',
    'Use a clear local-news voice: confident, readable, specific and not promotional hype.',
    'Body must be plain text with 7-12 substantial paragraphs separated by blank lines. Do not use Markdown headings, bullets, tables or HTML.',
    'Aim for roughly 700-1100 words only when the evidence supports that length. Do not pad.',
    'Title should be descriptive, natural and specific. Avoid clickbait.',
    'SEO title should stay near 55-65 characters when natural. SEO description should be a useful 140-165 character summary, not keyword stuffing.',
    'Keywords should be 4-8 genuine topic phrases a reader might search.',
    'Return ONLY one valid JSON object with keys: title, excerpt, body, seoTitle, seoDescription, keywords, sources, confidence, shouldPublish, reason.',
    'sources must be an array of objects with name, url and optional publishedAt. Only list sources actually used.',
    'confidence must be 0 to 1. Set shouldPublish=false if the evidence is stale, contradictory, thin, duplicated or not truly local.',
  ];

  if (beat === 'rich-city-league') {
    return [
      ...shared,
      'BEAT: Rich City League.',
      'Use ONLY the official structured RCL data included in the prompt. Do not browse or add outside facts.',
      'Choose the strongest timely RCL angle: completed games, upcoming games, standings movement, registration status, open runs, or a useful league explainer supported by the supplied data.',
      'If there is no dramatic news, write a useful verified preview or state-of-the-league piece rather than manufacturing a development.',
      'Source URLs should point to relevant richcityhoops.com pages such as /league, /games, /standings, /runs or /register.',
    ].join('\n');
  }

  if (beat === 'richmond-basketball') {
    return [
      ...shared,
      'BEAT: Richmond Basketball News.',
      'Use web search before writing. Prioritize developments from the last 72 hours, with up to 7 days allowed for a strong unresolved local story.',
      'Richmond/Central Virginia relevance is mandatory: VCU, University of Richmond, Virginia Union, Virginia State/Petersburg when regionally relevant, Henrico, Chesterfield, Hanover, local high schools, AAU, recruiting, players/coaches with a direct Richmond connection, facilities and local basketball events.',
      'Prefer primary sources (school/team/league/organizer) plus reputable local reporting when available.',
      'For a factual news story, use at least two credible sources when practical. One primary official source may be sufficient for a straightforward official announcement.',
      'Do not turn a generic national NBA or college story into Richmond news without a direct local connection.',
    ].join('\n');
  }

  return [
    ...shared,
    'BEAT: Richmond Culture News.',
    'Use web search before writing. Prioritize developments from the last 72 hours, with up to 7 days allowed for a strong local feature or event.',
    'Cover Richmond culture that fits the RCL audience: neighborhoods, arts, music, food, festivals, local creators, youth programs, recreation, small business, community spaces and city identity.',
    'Avoid partisan politics, crime, tragedy, lawsuits and celebrity gossip unless the story has an unusually strong direct RCL/community reason to exist. Prefer constructive, useful culture coverage.',
    'Richmond-area relevance is mandatory; do not publish generic Virginia or national lifestyle stories.',
    'Prefer primary event/organization/business sources plus reputable local reporting when available.',
  ].join('\n');
}

export async function generateNewsArticle(db: SupabaseClient, beat: NewsBeat) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const model = process.env.OPENAI_NEWSROOM_MODEL?.trim() || 'gpt-6-sol';
  const recent = await recentNewsContext(db);
  const context = beat === 'rich-city-league' ? await richCityLeagueContext(db) : null;

  const prompt = [
    editorialInstructions(beat),
    `TODAY (America/New_York): ${newsroomDateKey()}`,
    'Avoid duplicating these recent RCL Newsroom titles or substantially repeating the same angle:',
    JSON.stringify(recent),
    beat === 'rich-city-league'
      ? `OFFICIAL RCL DATA:\n${JSON.stringify(context)}`
      : 'Research the current web now, then choose one strong local story with enough evidence to publish.',
  ].join('\n\n');

  const requestBody: any = {
    model,
    input: prompt,
    max_output_tokens: 5000,
  };
  if (beatConfig[beat].web) requestBody.tools = [{ type: 'web_search' }];

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('[rcl-newsroom] OpenAI error', response.status, detail);
    throw new Error(`Newsroom model request failed with status ${response.status}.`);
  }

  const raw = parseJsonObject(extractResponseText(await response.json()));
  return { article: validateArticle(cleanArticle(raw, beat), beat), model };
}
