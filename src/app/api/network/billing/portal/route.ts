import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { createNetworkPartnerPortalSession } from '@/lib/network-stripe-billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Partner billing authentication is unavailable.' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to manage organization billing.' }, { status: 401 });

  let input: { organizationId?: unknown } = {};
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Valid JSON is required.' }, { status: 400 }); }
  if (typeof input.organizationId !== 'string') return NextResponse.json({ error: 'Organization ID is required.' }, { status: 400 });

  const db = supabase as any;
  const { data: membership } = await db.from('network_organization_members')
    .select('member_role,status').eq('organization_id', input.organizationId).eq('profile_id', user.id).maybeSingle();
  if (!membership || membership.status !== 'active' || !['owner','manager'].includes(membership.member_role)) {
    return NextResponse.json({ error: 'Organization owner or manager access is required.' }, { status: 403 });
  }
  const { data: subscription } = await db.from('network_organization_subscriptions')
    .select('provider_customer_id').eq('organization_id', input.organizationId).maybeSingle();
  if (!subscription?.provider_customer_id) return NextResponse.json({ error: 'No Stripe customer is linked to this organization.' }, { status: 409 });

  try {
    const session = await createNetworkPartnerPortalSession(subscription.provider_customer_id);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('network partner portal failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to open billing portal.' }, { status: 502 });
  }
}
