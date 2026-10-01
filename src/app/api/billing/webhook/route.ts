import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { parseStripeSubscription, retrieveStripeSubscription, verifyStripeWebhook } from '@/lib/stripe-billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StripeEvent = { id?: string; type?: string; data?: { object?: any } };

function normalizeStatus(value: string) {
  const allowed = new Set(['active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid','paused']);
  return allowed.has(value) ? value : 'incomplete';
}

async function syncSubscription(db: any, subscription: Awaited<ReturnType<typeof retrieveStripeSubscription>>) {
  const parsed = parseStripeSubscription(subscription);
  let userId = parsed.userId;
  if (!userId && parsed.subscriptionId) {
    const { data } = await db.from('member_subscriptions').select('user_id').eq('provider_subscription_id', parsed.subscriptionId).maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId && parsed.customerId) {
    const { data } = await db.from('member_subscriptions').select('user_id').eq('provider_customer_id', parsed.customerId).maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId || !parsed.planCode || !parsed.interval) return { synced: false, reason: 'Subscription is not linked to an RCL user or configured price.' };

  const status = normalizeStatus(parsed.status);
  const { error } = await db.from('member_subscriptions').upsert({
    user_id: userId,
    plan_code: parsed.planCode,
    status,
    billing_interval: parsed.interval,
    provider: 'stripe',
    provider_customer_id: parsed.customerId,
    provider_subscription_id: parsed.subscriptionId,
    price_cents: parsed.priceCents,
    currency: parsed.currency,
    current_period_start: parsed.currentPeriodStart,
    current_period_end: parsed.currentPeriodEnd,
    cancel_at_period_end: parsed.cancelAtPeriodEnd,
    trial_end: parsed.trialEnd,
    canceled_at: status === 'canceled' ? (parsed.canceledAt || new Date().toISOString()) : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
  return { synced: true };
}

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyStripeWebhook(body, request.headers.get('stripe-signature'))) {
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  let event: StripeEvent;
  try { event = JSON.parse(body); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!event.id || !event.type) return NextResponse.json({ error: 'Stripe event metadata is missing.' }, { status: 400 });

  const db = getSupabaseAdminClient() as any;
  if (!db) return NextResponse.json({ error: 'Server database credentials are unavailable.' }, { status: 503 });

  const { data: existing } = await db.from('membership_webhook_events').select('processing_status').eq('provider_event_id', event.id).maybeSingle();
  if (existing && ['processed','ignored'].includes(existing.processing_status)) return NextResponse.json({ received: true, duplicate: true });
  if (!existing) {
    const { error } = await db.from('membership_webhook_events').insert({
      provider: 'stripe', provider_event_id: event.id, event_type: event.type,
      processing_status: 'failed', error_message: 'Processing started.',
    });
    if (error && error.code !== '23505') return NextResponse.json({ error: 'Unable to record webhook event.' }, { status: 500 });
  }

  try {
    let subscriptionId: string | null = null;
    let subscriptionObject: any = null;
    if (event.type === 'checkout.session.completed') {
      const value = event.data?.object?.subscription;
      subscriptionId = typeof value === 'string' ? value : value?.id || null;
    } else if (event.type.startsWith('customer.subscription.')) {
      subscriptionObject = event.data?.object;
      subscriptionId = subscriptionObject?.id || null;
    } else {
      await db.from('membership_webhook_events').update({ processing_status: 'ignored', error_message: null, processed_at: new Date().toISOString() }).eq('provider_event_id', event.id);
      return NextResponse.json({ received: true, ignored: true });
    }

    if (!subscriptionId) {
      await db.from('membership_webhook_events').update({ processing_status: 'ignored', error_message: 'No subscription ID was attached.', processed_at: new Date().toISOString() }).eq('provider_event_id', event.id);
      return NextResponse.json({ received: true, ignored: true });
    }

    const subscription = subscriptionObject?.items?.data?.length ? subscriptionObject : await retrieveStripeSubscription(subscriptionId);
    const result = await syncSubscription(db, subscription);
    await db.from('membership_webhook_events').update({
      processing_status: result.synced ? 'processed' : 'ignored',
      provider_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null,
      provider_subscription_id: subscriptionId,
      error_message: result.synced ? null : result.reason,
      processed_at: new Date().toISOString(),
    }).eq('provider_event_id', event.id);
    return NextResponse.json({ received: true, synced: result.synced });
  } catch (error) {
    console.error('stripe webhook reconciliation failed', error);
    await db.from('membership_webhook_events').update({
      processing_status: 'failed',
      error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown webhook reconciliation error.',
      processed_at: new Date().toISOString(),
    }).eq('provider_event_id', event.id);
    return NextResponse.json({ error: 'Webhook reconciliation failed.' }, { status: 500 });
  }
}
