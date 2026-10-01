import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { createStripeCheckoutSession, stripeBillingConfigured } from '@/lib/stripe-billing';
import { isMembershipBillingInterval, isPaidMembershipPlanCode } from '@/lib/membership';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Membership authentication is unavailable.' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to manage an RCL membership.' }, { status: 401 });

  let input: { planCode?: unknown; interval?: unknown } = {};
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Valid JSON is required.' }, { status: 400 }); }
  if (!isPaidMembershipPlanCode(input.planCode) || !isMembershipBillingInterval(input.interval)) {
    return NextResponse.json({ error: 'Choose a valid paid membership and billing interval.' }, { status: 400 });
  }

  const db = supabase as any;
  const { data: existing } = await db.from('member_subscriptions')
    .select('status,plan_code,provider_customer_id,provider_subscription_id,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  const periodValid = !existing?.current_period_end || new Date(existing.current_period_end).getTime() > Date.now();
  if (existing && ['active', 'trialing'].includes(existing.status) && periodValid && existing.provider_subscription_id) {
    return NextResponse.json({ error: 'manage_existing', message: 'Manage your existing RCL membership instead of starting a second subscription.' }, { status: 409 });
  }

  if (!stripeBillingConfigured(input.planCode, input.interval)) {
    return NextResponse.json({ error: 'billing_not_configured', message: 'RCL paid memberships are not accepting checkout yet.' }, { status: 503 });
  }

  try {
    const session = await createStripeCheckoutSession({
      userId: user.id,
      email: user.email,
      planCode: input.planCode,
      interval: input.interval,
      customerId: existing?.provider_customer_id ?? null,
    });
    if (!session.url) return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('membership checkout failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start checkout.' }, { status: 502 });
  }
}
