import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { createStripePortalSession, stripeBillingConfigured } from '@/lib/stripe-billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Membership authentication is unavailable.' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to manage billing.' }, { status: 401 });

  const db = supabase as any;
  const { data: subscription } = await db.from('member_subscriptions')
    .select('provider_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!subscription?.provider_customer_id) return NextResponse.json({ error: 'No Stripe billing profile is connected to this account.' }, { status: 404 });
  if (!stripeBillingConfigured()) return NextResponse.json({ error: 'RCL billing is not configured.' }, { status: 503 });

  try {
    const session = await createStripePortalSession(subscription.provider_customer_id);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('membership portal failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to open billing portal.' }, { status: 502 });
  }
}
