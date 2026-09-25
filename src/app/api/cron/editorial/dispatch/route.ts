import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type EditorialAccount = 'rcl-business' | 'rva-hoops';

function easternHour(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  return Number(parts.find(part => part.type === 'hour')?.value ?? -1);
}

export async function GET(request: Request) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || bearer !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hour = easternHour();
  const accounts: EditorialAccount[] = [];
  // RVA Hoops morning desk. Vercel cron runs in UTC; timezone conversion keeps DST correct.
  if (hour === 8) accounts.push('rva-hoops');
  // RCL Business daily feature follows later in the morning.
  if (hour === 10 || hour === 12) accounts.push('rcl-business');

  if (!accounts.length) {
    return NextResponse.json({ ok: true, dispatched: [], reason: 'No editorial desk scheduled for this Eastern hour.' });
  }

  // Research is deliberately delegated to a configured server-side provider.
  // The provider must return sourced candidates; the publisher independently
  // requires source attribution and deduplicates before anything goes live.
  const origin = new URL(request.url).origin;
  const researchUrl = process.env.EDITORIAL_RESEARCH_ENDPOINT?.trim() || `${origin}/api/cron/editorial/research`;
  const researchSecret = process.env.EDITORIAL_RESEARCH_SECRET?.trim() || secret;
  const results = [];

  for (const account of accounts) {
    const research = await fetch(researchUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${researchSecret}` },
      body: JSON.stringify({
        account,
        market: 'Richmond, Virginia',
        requirements: account === 'rva-hoops'
          ? ['basketball only', 'current source required', 'local/high school/college/pro coverage', 'no rumors as fact', 'avoid unnecessary minor PII']
          : ['basketball business focus', 'current source required for factual news claims', 'original concise analysis', 'no copied article text'],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!research.ok) {
      results.push({ account, ok: false, stage: 'research', status: research.status });
      continue;
    }

    const candidate = await research.json();
    const publish = await fetch(`${origin}/api/cron/editorial`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
      body: JSON.stringify({ ...candidate, account }),
      signal: AbortSignal.timeout(30_000),
    });
    const outcome = await publish.json().catch(() => ({}));
    results.push({ account, ok: publish.ok, stage: 'publish', status: publish.status, ...outcome });
  }

  return NextResponse.json({ ok: results.every(result => result.ok), dispatched: results });
}
