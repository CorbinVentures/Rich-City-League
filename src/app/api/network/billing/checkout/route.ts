import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { createNetworkPartnerCheckout, networkPartnerBillingConfigured } from '@/lib/network-stripe-billing';
import { isPaidNetworkPartnerPlanCode } from '@/lib/network-partner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Partner billing authentication is unavailable.' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to manage organization billing.' }, { status: 401 });

  let input: { organizationId?: unknown; planCode?: unknown } = {};
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Valid JSON is required.' }, { status: 400 }); }
  if (typeof input.organizationId !== 'string' || !isPaidNetworkPartnerPlanCode(input.planCode)) {
    return NextResponse.json({ error: 'Choose a valid organization and partner plan.' }, { status: 400 });
  }

  const db = supabase as any;
  const { data: membership } = await db.from('network_organization_members')
    .select('member_role,status').eq('organization_id', input.organizationId).eq('profile_id', user.id).maybeSingle();
  if (!membership || membership.status !== 'active' || !['owner','manager'].includes(membership.member_role)) {
    return NextResponse.json({ error: 'Organization owner or manager access is required.' }, { status: 403 });
  }

  const { data: existing } = await db.from('network_organization_subscriptions')
    .select('status,plan_code,provider_customer_id,provider_subscription_id,current_period_end')
    .eq('organization_id', input.organizationId).maybeSingle();
  const periodValid = !existing?.current_period_end || new Date(existing.current_period_end).getTime() > Date.now();
  if (existing && ['active','trialing'].includes(existing.status) && periodValid && existing.provider_subscription_id) {
    return NextResponse.json({ error: 'manage_existing', message: 'Manage the existing partner subscription instead of starting a second one.' }, { status: 409 });
  }
  if (!networkPartnerBillingConfigured(input.planCode)) {
    return NextResponse.json({ error: 'billing_not_configured', message: 'This partner plan is not accepting checkout yet.' }, { status: 503 });
  }

  try {
    const session = await createNetworkPartnerCheckout({
      userId: user.id,
      organizationId: input.organizationId,
      email: user.email,
      planCode: input.planCode,
      customerId: existing?.provider_customer_id ?? null,
    });
    if (!session.url) return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('network partner checkout failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start checkout.' }, { status: 502 });
  }
}
