import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
 return NextResponse.json(
  { error: 'LeagueApps synchronization has been retired. Use native RCH league management.' },
  { status: 410 }
 );
}
