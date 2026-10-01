import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { createNetworkBoostCheckout, networkBoostCheckoutConfigured } from '@/lib/network-stripe-billing';
import { isNetworkCreditType } from '@/lib/network-partner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Partner billing authentication is unavailable.' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to purchase RCL Reach exposure.' }, { status: 401 });
  let input: { organizationId?: unknown; creditType?: unknown } = {};
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Valid JSON is required.' }, { status: 400 }); }
  if (typeof input.organizationId !== 'string' || !isNetworkCreditType(input.creditType)) return NextResponse.json({ error: 'Choose a valid organization and Boost placement.' }, { status: 400 });

  const db = supabase as any;
  const { data: membership } = await db.from('network_organization_members').select('member_role,status').eq('organization_id', input.organizationId).eq('profile_id', user.id).maybeSingle();
  if (!membership || membership.status !== 'active' || !['owner','manager'].includes(membership.member_role)) return NextResponse.json({ error: 'Organization owner or manager access is required.' }, { status: 403 });
  if (!networkBoostCheckoutConfigured(input.creditType)) return NextResponse.json({ error: 'boost_checkout_not_configured', message: 'One-time checkout for this Boost is not active yet. You can still request the placement through RCL Reach.' }, { status: 503 });
  const { data: subscription } = await db.from('network_organization_subscriptions').select('provider_customer_id').eq('organization_id', input.organizationId).maybeSingle();
  try {
    const session = await createNetworkBoostCheckout({ userId: user.id, organizationId: input.organizationId, email: user.email, creditType: input.creditType, customerId: subscription?.provider_customer_id ?? null });
    if (!session.url) return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('network Boost checkout failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start Boost checkout.' }, { status: 502 });
  }
}
