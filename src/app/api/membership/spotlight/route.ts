import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const targetTypes = new Set(['profile', 'post', 'highlight']);

export async function POST(request: Request) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Membership authentication is unavailable.' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to request an RCL Spotlight.' }, { status: 401 });

  const db = supabase as any;
  const { data: entitled, error: entitlementError } = await db.rpc('member_has_entitlement', { entitlement_key: 'monthly_spotlight' });
  if (entitlementError || entitled !== true) return NextResponse.json({ error: 'RCL All Access is required for a monthly Spotlight request.' }, { status: 403 });

  let input: { targetType?: unknown; targetId?: unknown; note?: unknown } = {};
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Valid JSON is required.' }, { status: 400 }); }
  if (typeof input.targetType !== 'string' || !targetTypes.has(input.targetType)) {
    return NextResponse.json({ error: 'Choose a profile, post or highlight to Spotlight.' }, { status: 400 });
  }
  const targetId = typeof input.targetId === 'string' && input.targetId.trim() ? input.targetId.trim() : null;
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) : null;
  if (input.targetType !== 'profile' && !targetId) return NextResponse.json({ error: 'A post or highlight ID is required.' }, { status: 400 });

  const admin = getSupabaseAdminClient() as any;
  if (!admin) return NextResponse.json({ error: 'Server database credentials are unavailable.' }, { status: 503 });
  const month = new Date();
  const requestedMonth = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}-01`;

  const { data: existing } = await admin.from('member_spotlight_requests')
    .select('id,status,created_at')
    .eq('user_id', user.id)
    .eq('requested_month', requestedMonth)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: 'monthly_limit', message: `Your ${existing.status} Spotlight request for this month already exists.`, request: existing }, { status: 409 });

  const { data, error } = await admin.from('member_spotlight_requests').insert({
    user_id: user.id,
    target_type: input.targetType,
    target_id: input.targetType === 'profile' ? user.id : targetId,
    note,
    requested_month: requestedMonth,
    status: 'pending',
  }).select('id,status,requested_month,created_at').single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'monthly_limit', message: 'Only one Spotlight request is available each calendar month.' }, { status: 409 });
    console.error('spotlight request failed', error);
    return NextResponse.json({ error: 'Unable to create Spotlight request.' }, { status: 500 });
  }
  return NextResponse.json({ request: data }, { status: 201 });
}
