import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type EditorialAccount = 'rcl-business' | 'rva-hoops' | 'rcl-community';

function easternHour(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  return Number(parts.find(part => part.type === 'hour')?.value ?? -1);
}

function editorialOrigin() {
  const configured = process.env.EDITORIAL_SITE_ORIGIN?.trim().replace(/\/+$/, '');
  if (configured) {
    try {
      const url = new URL(configured);
      if (/^https?:$/.test(url.protocol)) return url.origin;
    } catch {
      // Fall through to the canonical production host.
    }
  }
  // Do not derive this from request.url. Vercel Cron can execute on a protected
  // deployment hostname, which makes same-deployment server-to-server fetches
  // fail with Vercel Authentication before they ever reach these routes.
  return 'https://www.richcityhoops.com';
}

function requirementsFor(account: EditorialAccount) {
  if (account === 'rva-hoops') {
    return [
      'Richmond/Central Virginia basketball first',
      'include local high school, college, AAU, recruiting, facilities and players with a Richmond connection',
      'current source required when reporting outside facts',
      'no rumors as fact',
      'avoid unnecessary minor PII',
    ];
  }
  if (account === 'rcl-community') {
    return [
      'Richmond-area community relevance required',
      'prioritize recreation, youth, schools, small business, events, neighborhood resources and community development',
      'avoid generic national stories',
      'current source required for factual news claims',
      'concise neutral summary with source attribution',
    ];
  }
  return [
    'basketball business focus',
    'current source required for factual news claims',
    'original concise analysis',
    'no copied article text',
  ];
}

export async function GET(request: Request) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || bearer !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hour = easternHour();
  const accounts: EditorialAccount[] = [];
  // RVA Hoops morning desk. Vercel cron runs in UTC; timezone conversion keeps DST correct.
  if (hour === 8) accounts.push('rva-hoops');
  // RCL Business publishes throughout the day so the business desk stays active.
  if (hour === 10 || hour === 12 || hour === 14 || hour === 17) accounts.push('rcl-business');
  // RCL Community handles broader Richmond-area community coverage.
  if (hour === 16) accounts.push('rcl-community');

  if (!accounts.length) {
    return NextResponse.json({ ok: true, dispatched: [], reason: 'No editorial desk scheduled for this Eastern hour.' });
  }

  // Research is deliberately delegated to a configured server-side provider.
  // The provider must return sourced candidates; the publisher independently
  // requires source attribution and deduplicates before anything goes live.
  const origin = editorialOrigin();
  const configuredResearchUrl = process.env.EDITORIAL_RESEARCH_ENDPOINT?.trim();
  const researchUrl = configuredResearchUrl || `${origin}/api/cron/editorial/research`;
  // The built-in research route authenticates with CRON_SECRET. Only use a
  // separate research secret when dispatching to an explicitly configured
  // external research provider.
  const researchSecret = configuredResearchUrl
    ? (process.env.EDITORIAL_RESEARCH_SECRET?.trim() || secret)
    : secret;
  const results = [];

  for (const account of accounts) {
    const research = await fetch(researchUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${researchSecret}` },
      body: JSON.stringify({
        account,
        market: 'Richmond, Virginia',
        requirements: requirementsFor(account),
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!research.ok) {
      const detail = await research.json().catch(() => ({}));
      const failure = { account, ok: false, stage: 'research', status: research.status, ...detail };
      console.error('[editorial-dispatch] research failed', failure);
      results.push(failure);
      continue;
    }

    const candidate = await research.json();
    if (candidate?.candidate === false) {
      // An empty, current-source search is not a production error.
      results.push({ account, ok: true, published: false, reason: candidate.reason || 'No verifiable update today.' });
      continue;
    }
    const publish = await fetch(`${origin}/api/cron/editorial`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
      body: JSON.stringify({ ...candidate, account }),
      signal: AbortSignal.timeout(30_000),
    });
    const outcome = await publish.json().catch(() => ({}));
    const result = { account, ok: publish.ok, stage: 'publish', status: publish.status, ...outcome };
    if (publish.ok) console.info('[editorial-dispatch] published', result);
    else console.error('[editorial-dispatch] publish failed', result);
    results.push(result);
  }

  return NextResponse.json({ ok: results.every(result => result.ok), dispatched: results });
}
