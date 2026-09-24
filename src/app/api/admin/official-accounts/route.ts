import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

type OfficialAccount = { key: string; username: string; displayName: string };

const OFFICIAL_ACCOUNTS: OfficialAccount[] = [
  { key: 'rcl', username: 'RCL', displayName: 'Rich City League' },
  { key: 'rcl-gameday', username: 'RCLGameDay', displayName: 'RCL GameDay' },
  { key: 'rcl-rep', username: 'RCLRep', displayName: 'RCL REP' },
  { key: 'rcl-runs', username: 'RCLRuns', displayName: 'RCL Runs' },
  { key: 'rcl-community', username: 'RCLCommunity', displayName: 'RCL Community' },
  { key: 'rcl-fantasy', username: 'RCLFantasy', displayName: 'RCL Fantasy' },
  { key: 'rcl-history', username: 'RCLHistory', displayName: 'RCL History' },
];

export async function POST() {
  const sessionClient = await getServerSupabaseClient();
  if (!sessionClient) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: allowed, error: authError } = await sessionClient.rpc('is_staff_or_admin');
  if (authError || !allowed) return NextResponse.json({ error: 'Staff or admin access required.' }, { status: 403 });

  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server admin credentials are not configured.' }, { status: 503 });

  const results: Array<{ key: string; profileId?: string; status: string }> = [];

  for (const account of OFFICIAL_ACCOUNTS) {
    const { data: existing, error: lookupError } = await admin
      .from('profiles')
      .select('id,is_system_account,system_account_key')
      .eq('system_account_key', account.key)
      .maybeSingle();
    if (lookupError) return NextResponse.json({ error: lookupError.message, account: account.key }, { status: 500 });
    if (existing) {
      results.push({ key: account.key, profileId: existing.id, status: 'already-configured' });
      continue;
    }

    const email = `system+${account.key}@richcityhoops.com`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        username: account.username,
        display_name: account.displayName,
        requested_profile_type: 'fan',
        system_account: true,
      },
      app_metadata: { system_account: true, system_account_key: account.key },
    });
    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message ?? 'Failed to create system user.', account: account.key }, { status: 500 });
    }

    const { error: configureError } = await admin
      .from('profiles')
      .update({
        is_system_account: true,
        system_account_key: account.key,
        username: account.username,
        display_name: account.displayName,
      })
      .eq('id', created.user.id);
    if (configureError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: configureError.message, account: account.key }, { status: 500 });
    }

    results.push({ key: account.key, profileId: created.user.id, status: 'created' });
  }

  return NextResponse.json({ ok: true, accounts: results });
}
