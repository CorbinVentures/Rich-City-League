import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type EditorialAccount = 'rcl-business' | 'rva-hoops' | 'rcl-community';

type FeedItem = {
  title: string;
  link: string;
  publishedAt?: string;
  sourceName: string;
};

const queries: Record<EditorialAccount, string> = {
  'rva-hoops': [
    '"Richmond Virginia" basketball',
    '(VCU OR "University of Richmond" OR "Virginia Union") basketball',
    '(Henrico OR Chesterfield OR Petersburg OR Hanover) basketball Virginia',
    '"Central Virginia" basketball',
    'Richmond Virginia AAU basketball',
    'Richmond Virginia basketball recruiting commitment transfer',
    'Richmond Virginia gym court recreation basketball',
  ].join(' OR '),
  'rcl-business': [
    '"basketball business"',
    'basketball NIL sponsorship sports marketing',
    'basketball media business',
  ].join(' OR '),
  'rcl-community': [
    '"Richmond Virginia" community',
    'Richmond Virginia recreation parks youth programs',
    '(Henrico OR Chesterfield OR Petersburg OR Hanover) community Virginia',
    'Richmond Virginia small business community events',
    'Richmond Virginia schools youth programs',
    'Richmond Virginia recreation center gym court',
  ].join(' OR '),
};

const freshnessHours: Record<EditorialAccount, number> = {
  'rva-hoops': 72,
  'rcl-business': 36,
  'rcl-community': 48,
};

const localTerms = [
  'richmond', 'rva', '804', 'henrico', 'chesterfield', 'petersburg', 'hanover',
  'central virginia', 'vcu', 'virginia union', 'university of richmond', 'spiders',
];

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decodeXml(match[1].trim()) : '';
}

function parseFeed(xml: string): FeedItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(match => {
    const block = match[1];
    const title = tag(block, 'title');
    const link = tag(block, 'link');
    const publishedAt = tag(block, 'pubDate');
    const sourceName = tag(block, 'source') || 'Google News';
    return { title, link, publishedAt: publishedAt || undefined, sourceName };
  }).filter(item => item.title && item.link);
}

function ageHours(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? (Date.now() - timestamp) / 3_600_000 : Number.POSITIVE_INFINITY;
}

function cleanTitle(title: string) {
  return title.replace(/\s+-\s+[^-]+$/, '').trim();
}

function localRelevance(item: FeedItem) {
  const haystack = `${item.title} ${item.sourceName}`.toLowerCase();
  return localTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function selectCandidate(account: EditorialAccount, items: FeedItem[]) {
  const fresh = items.filter(item => ageHours(item.publishedAt) <= freshnessHours[account]);
  const eligible = account === 'rcl-business' ? fresh : fresh.filter(item => localRelevance(item) > 0);
  return eligible.sort((a, b) => {
    const relevanceDifference = localRelevance(b) - localRelevance(a);
    if (relevanceDifference !== 0) return relevanceDifference;
    return ageHours(a.publishedAt) - ageHours(b.publishedAt);
  })[0];
}

function easternDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = (type: 'year' | 'month' | 'day') => parts.find(part => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function buildSummary(account: EditorialAccount, item: FeedItem) {
  const headline = cleanTitle(item.title);
  if (account === 'rva-hoops') {
    return `RVA Hoops desk: ${headline}. This sourced update was selected from Richmond, Central Virginia or basketball coverage with a direct local connection. Follow the original report below for the full details; RCL is linking to the source rather than reproducing its reporting.`;
  }
  if (account === 'rcl-community') {
    return `RCL Community desk: ${headline}. This sourced Richmond-area update was selected because it touches community life, recreation, youth, schools, local business, events or neighborhood resources across Richmond and surrounding localities. Follow the original source below for the full report.`;
  }
  return `RCL Business watch: ${headline}. This development is worth tracking for people building around basketball because changes in sponsorship, NIL, media, marketing and league economics can shape how local basketball organizations create value. Read the original reporting below for the underlying facts and context.`;
}

export async function POST(request: Request) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || bearer !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let payload: { account?: EditorialAccount };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Valid JSON is required.' }, { status: 400 }); }
  if (payload.account !== 'rcl-business' && payload.account !== 'rva-hoops' && payload.account !== 'rcl-community') {
    return NextResponse.json({ error: 'Unsupported editorial account.' }, { status: 400 });
  }

  const feedUrl = new URL('https://news.google.com/rss/search');
  feedUrl.searchParams.set('q', queries[payload.account]);
  feedUrl.searchParams.set('hl', 'en-US');
  feedUrl.searchParams.set('gl', 'US');
  feedUrl.searchParams.set('ceid', 'US:en');

  let response: Response;
  try {
    response = await fetch(feedUrl, {
      headers: { 'user-agent': 'RichCityLeagueEditorial/1.0' },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Current-source lookup failed.' }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json({ error: 'Current-source lookup failed.' }, { status: 503 });
  }

  const xml = await response.text();
  const item = selectCandidate(payload.account, parseFeed(xml));
  if (!item) {
    return NextResponse.json({ account: payload.account, candidate: false, reason: 'No sufficiently fresh sourced story was found. Nothing should publish.' });
  }

  return NextResponse.json({
    account: payload.account,
    title: cleanTitle(item.title),
    summary: buildSummary(payload.account, item),
    sourceName: item.sourceName,
    sourceUrl: item.link,
    publishedAt: item.publishedAt,
  });
}
