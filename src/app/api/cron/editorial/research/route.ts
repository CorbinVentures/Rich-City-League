import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type EditorialAccount = 'rcl-business' | 'rva-hoops';

type FeedItem = {
  title: string;
  link: string;
  publishedAt?: string;
  sourceName: string;
};

const queries: Record<EditorialAccount, string> = {
  'rva-hoops': [
    'basketball Richmond Virginia',
    '(VCU OR "University of Richmond" OR "Virginia Union") basketball',
    'Richmond Virginia high school basketball',
  ].join(' OR '),
  'rcl-business': [
    '"basketball business"',
    'basketball NIL sponsorship sports marketing',
    'basketball media business',
  ].join(' OR '),
};

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

function buildSummary(account: EditorialAccount, item: FeedItem) {
  const headline = cleanTitle(item.title);
  if (account === 'rva-hoops') {
    return `RVA Hoops morning desk: ${headline}. This is a sourced Richmond-area basketball update selected from current coverage. Follow the original report below for the full details; RCL is linking to the source rather than reproducing its reporting.`;
  }
  return `RCL Business watch: ${headline}. This development is worth tracking for people building around basketball because changes in sponsorship, NIL, media, marketing and league economics can shape how local basketball organizations create value. Read the original reporting below for the underlying facts and context.`;
}

export async function POST(request: Request) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || bearer !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let payload: { account?: EditorialAccount };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Valid JSON is required.' }, { status: 400 }); }
  if (payload.account !== 'rcl-business' && payload.account !== 'rva-hoops') {
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
  if (!response.ok) return NextResponse.json({ error: 'Current-source lookup failed.' }, { status: 503 });

  const xml = await response.text();
  const fresh = parseFeed(xml).filter(item => ageHours(item.publishedAt) <= 36);
  const item = fresh[0];
  if (!item) return NextResponse.json({ error: 'No sufficiently fresh sourced story was found. Nothing should publish.' }, { status: 404 });

  return NextResponse.json({
    account: payload.account,
    title: cleanTitle(item.title),
    summary: buildSummary(payload.account, item),
    sourceName: item.sourceName,
    sourceUrl: item.link,
    publishedAt: item.publishedAt,
  });
}
