import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { isNetworkCreditType } from '@/lib/network-partner';
import { parseNetworkStripeSubscription, retrieveNetworkStripeSubscription, verifyNetworkStripeWebhook } from '@/lib/network-stripe-billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StripeEvent = { id?: string; type?: string; data?: { object?: any } };

function normalizeStatus(value: string) {
  if (value === 'active' || value === 'trialing' || value === 'past_due' || value === 'unpaid' || value === 'canceled') return value;
  if (value === 'incomplete' || value === 'incomplete_expired' || value === 'paused') return 'incomplete';
  return 'inactive';
}

function invoiceSubscriptionId(invoice: any) {
  const direct = invoice?.subscription;
  if (typeof direct === 'string') return direct;
  if (direct?.id) return direct.id as string;
  const nested = invoice?.parent?.subscription_details?.subscription;
  if (typeof nested === 'string') return nested;
  if (nested?.id) return nested.id as string;
  return null;
}

async function allocateCycleCredits(db: any, input: { organizationId: string; planCode: 'amplify' | 'premier'; subscriptionId: string; cycleStart: string | null; cycleEnd: string | null }) {
  if (!input.cycleStart || !input.cycleEnd) return;
  const { data: entitlements, error } = await db.from('network_partner_plan_entitlements')
    .select('entitlement_code,monthly_quantity').eq('plan_code', input.planCode).eq('enabled', true).not('monthly_quantity', 'is', null);
  if (error) throw error;
  const rows = (entitlements ?? []).filter((row: any) => Number(row.monthly_quantity) > 0 && isNetworkCreditType(row.entitlement_code)).map((row: any) => ({
    organization_id: input.organizationId,
    plan_code: input.planCode,
    credit_type: row.entitlement_code,
    quantity: Number(row.monthly_quantity),
    cycle_start: input.cycleStart,
    cycle_end: input.cycleEnd,
    reason: 'Monthly partner plan allocation',
    allocation_key: `${input.subscriptionId}:${input.cycleStart}:${row.entitlement_code}`,
  }));
  if (!rows.length) return;
  const { error: insertError } = await db.from('network_partner_credit_ledger').upsert(rows, { onConflict: 'allocation_key', ignoreDuplicates: true });
  if (insertError) throw insertError;
}

async function syncSubscription(db: any, subscription: Awaited<ReturnType<typeof retrieveNetworkStripeSubscription>>) {
  const parsed = parseNetworkStripeSubscription(subscription);
  let organizationId = parsed.organizationId;
  if (!organizationId) {
    const query = parsed.subscriptionId
      ? db.from('network_organization_subscriptions').select('organization_id').eq('provider_subscription_id', parsed.subscriptionId).maybeSingle()
      : null;
    if (query) organizationId = (await query).data?.organization_id ?? null;
  }
  if (!organizationId && parsed.customerId) {
    organizationId = (await db.from('network_organization_subscriptions').select('organization_id').eq('provider_customer_id', parsed.customerId).maybeSingle()).data?.organization_id ?? null;
  }
  if (!organizationId || !parsed.planCode) return { synced: false, reason: 'Subscription is not linked to an RCL Network organization or configured price.', organizationId };

  const status = normalizeStatus(parsed.status);
  const { error } = await db.from('network_organization_subscriptions').upsert({
    organization_id: organizationId,
    plan_code: parsed.planCode,
    status,
    provider: 'stripe',
    provider_customer_id: parsed.customerId,
    provider_subscription_id: parsed.subscriptionId,
    provider_price_id: parsed.priceId,
    price_cents: parsed.priceCents,
    currency: parsed.currency,
    current_period_start: parsed.currentPeriodStart,
    current_period_end: parsed.currentPeriodEnd,
    cancel_at_period_end: parsed.cancelAtPeriodEnd,
    started_at: status === 'active' || status === 'trialing' ? (parsed.currentPeriodStart || new Date().toISOString()) : undefined,
    canceled_at: status === 'canceled' ? (parsed.canceledAt || new Date().toISOString()) : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id' });
  if (error) throw error;

  if (status === 'active' || status === 'trialing') {
    const { error: tierError } = await db.from('network_organizations').update({ network_tier: parsed.planCode, updated_at: new Date().toISOString() }).eq('id', organizationId).neq('network_tier', 'flagship');
    if (tierError) throw tierError;
    await allocateCycleCredits(db, { organizationId, planCode: parsed.planCode, subscriptionId: parsed.subscriptionId, cycleStart: parsed.currentPeriodStart, cycleEnd: parsed.currentPeriodEnd });
  } else if (status === 'canceled' || status === 'unpaid') {
    const { error: tierError } = await db.from('network_organizations').update({ network_tier: 'network', updated_at: new Date().toISOString() }).eq('id', organizationId).neq('network_tier', 'flagship');
    if (tierError) throw tierError;
  }
  return { synced: true, organizationId };
}

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyNetworkStripeWebhook(body, request.headers.get('stripe-signature'))) return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  let event: StripeEvent;
  try { event = JSON.parse(body); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!event.id || !event.type) return NextResponse.json({ error: 'Stripe event metadata is missing.' }, { status: 400 });
  const db = getSupabaseAdminClient() as any;
  if (!db) return NextResponse.json({ error: 'Server database credentials are unavailable.' }, { status: 503 });

  const { data: existing } = await db.from('network_partner_billing_events').select('processing_status').eq('id', event.id).maybeSingle();
  if (existing && ['processed','ignored'].includes(existing.processing_status)) return NextResponse.json({ received: true, duplicate: true });
  if (!existing) {
    const { error } = await db.from('network_partner_billing_events').insert({ id: event.id, event_type: event.type, processing_status: 'processing' });
    if (error && error.code !== '23505') return NextResponse.json({ error: 'Unable to record webhook event.' }, { status: 500 });
  } else {
    await db.from('network_partner_billing_events').update({ processing_status: 'processing', error_message: null }).eq('id', event.id);
  }

  try {
    if (event.type === 'checkout.session.completed' && event.data?.object?.mode === 'payment') {
      const session = event.data.object;
      const organizationId = session?.metadata?.organization_id;
      const creditType = session?.metadata?.credit_type;
      if (session?.metadata?.purchase_kind !== 'boost_credit' || session?.payment_status !== 'paid' || typeof organizationId !== 'string' || !isNetworkCreditType(creditType)) {
        await db.from('network_partner_billing_events').update({ processing_status: 'ignored', error_message: 'Checkout was not a paid RCL Network Boost purchase.', processed_at: new Date().toISOString() }).eq('id', event.id);
        return NextResponse.json({ received: true, ignored: true });
      }
      const { error: creditError } = await db.from('network_partner_credit_ledger').upsert({
        organization_id: organizationId,
        credit_type: creditType,
        quantity: 1,
        reason: 'Stripe Boost purchase',
        allocation_key: `stripe_checkout:${session.id}:${creditType}`,
      }, { onConflict: 'allocation_key', ignoreDuplicates: true });
      if (creditError) throw creditError;
      await db.from('network_partner_billing_events').update({ processing_status: 'processed', organization_id: organizationId, provider_customer_id: typeof session.customer === 'string' ? session.customer : null, processed_at: new Date().toISOString() }).eq('id', event.id);
      return NextResponse.json({ received: true, credited: true });
    }

    let subscriptionId: string | null = null;
    let subscriptionObject: any = null;
    if (event.type === 'checkout.session.completed') {
      const value = event.data?.object?.subscription;
      subscriptionId = typeof value === 'string' ? value : value?.id || null;
    } else if (event.type?.startsWith('customer.subscription.')) {
      subscriptionObject = event.data?.object;
      subscriptionId = subscriptionObject?.id || null;
    } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      subscriptionId = invoiceSubscriptionId(event.data?.object);
    } else {
      await db.from('network_partner_billing_events').update({ processing_status: 'ignored', error_message: null, processed_at: new Date().toISOString() }).eq('id', event.id);
      return NextResponse.json({ received: true, ignored: true });
    }
    if (!subscriptionId) {
      await db.from('network_partner_billing_events').update({ processing_status: 'ignored', error_message: 'No subscription ID was attached.', processed_at: new Date().toISOString() }).eq('id', event.id);
      return NextResponse.json({ received: true, ignored: true });
    }
    const subscription = subscriptionObject?.items?.data?.length ? subscriptionObject : await retrieveNetworkStripeSubscription(subscriptionId);
    const result = await syncSubscription(db, subscription);
    await db.from('network_partner_billing_events').update({
      processing_status: result.synced ? 'processed' : 'ignored',
      organization_id: result.organizationId,
      provider_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null,
      provider_subscription_id: subscriptionId,
      error_message: result.synced ? null : result.reason,
      processed_at: new Date().toISOString(),
    }).eq('id', event.id);
    return NextResponse.json({ received: true, synced: result.synced });
  } catch (error) {
    console.error('network partner webhook reconciliation failed', error);
    await db.from('network_partner_billing_events').update({ processing_status: 'failed', error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown reconciliation error.', processed_at: new Date().toISOString() }).eq('id', event.id);
    return NextResponse.json({ error: 'Webhook reconciliation failed.' }, { status: 500 });
  }
}
