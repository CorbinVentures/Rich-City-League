import 'server-only';
import crypto from 'node:crypto';
import { NETWORK_PARTNER_PLANS, type NetworkCreditType, type PaidNetworkPartnerPlanCode } from '@/lib/network-partner';

const STRIPE_API = 'https://api.stripe.com/v1';
const STRIPE_VERSION = '2026-08-26.dahlia';

type StripeSubscription = {
  id: string;
  customer: string | { id?: string } | null;
  status: string;
  cancel_at_period_end?: boolean;
  canceled_at?: number | null;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ current_period_start?: number; current_period_end?: number; price?: { id?: string; unit_amount?: number | null; currency?: string | null } | null }> };
};

function stripeSecret() { return process.env.STRIPE_SECRET_KEY?.trim() || null; }

function integrationIdentifier() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const bytes = crypto.randomBytes(8);
  let suffix = '';
  for (let i = 0; i < 8; i += 1) suffix += alphabet[bytes[i] % alphabet.length];
  return `rcl_network_${suffix}`;
}

function subscriptionPrice(plan: PaidNetworkPartnerPlanCode) {
  if (plan === 'amplify') return process.env.STRIPE_PRICE_NETWORK_AMPLIFY_MONTHLY?.trim() || null;
  return process.env.STRIPE_PRICE_NETWORK_PREMIER_MONTHLY?.trim() || null;
}

function boostPrice(type: NetworkCreditType) {
  if (type === 'event-spotlight') return process.env.STRIPE_PRICE_NETWORK_EVENT_SPOTLIGHT?.trim() || null;
  if (type === 'regional-feature') return process.env.STRIPE_PRICE_NETWORK_REGIONAL_FEATURE?.trim() || null;
  if (type === 'statewide-feature') return process.env.STRIPE_PRICE_NETWORK_STATEWIDE_FEATURE?.trim() || null;
  if (type === 'social-feed') return process.env.STRIPE_PRICE_NETWORK_SOCIAL_FEED?.trim() || null;
  return process.env.STRIPE_PRICE_NETWORK_MEDIA_FEATURE?.trim() || null;
}

export function networkPartnerBillingConfigured(plan?: PaidNetworkPartnerPlanCode) {
  if (!stripeSecret()) return false;
  if (plan) return Boolean(subscriptionPrice(plan));
  return Boolean(subscriptionPrice('amplify') && subscriptionPrice('premier'));
}

export function networkBoostCheckoutConfigured(type: NetworkCreditType) {
  return Boolean(stripeSecret() && boostPrice(type));
}

async function stripeRequest<T>(path: string, options: { method?: 'GET' | 'POST'; body?: URLSearchParams } = {}): Promise<T> {
  const secret = stripeSecret();
  if (!secret) throw new Error('Stripe billing is not configured.');
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Stripe-Version': STRIPE_VERSION,
      ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: options.body,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({})) as any;
  if (!response.ok) throw new Error(payload?.error?.message || `Stripe request failed (${response.status}).`);
  return payload as T;
}

export async function createNetworkPartnerCheckout(input: { userId: string; organizationId: string; email?: string | null; planCode: PaidNetworkPartnerPlanCode; customerId?: string | null }) {
  const priceId = subscriptionPrice(input.planCode);
  if (!priceId || !stripeSecret()) throw new Error('Stripe billing is not configured for this partner plan.');
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://richcityhoops.com').replace(/\/$/, '');
  const body = new URLSearchParams();
  body.set('mode', 'subscription');
  body.set('origin_context', 'web');
  body.set('integration_identifier', integrationIdentifier());
  body.set('success_url', `${site}/network/dashboard/billing?checkout=success`);
  body.set('cancel_url', `${site}/network/dashboard/billing?checkout=cancelled`);
  body.set('client_reference_id', input.organizationId);
  body.set('line_items[0][price]', priceId);
  body.set('line_items[0][quantity]', '1');
  body.set('allow_promotion_codes', 'true');
  body.set('metadata[organization_id]', input.organizationId);
  body.set('metadata[user_id]', input.userId);
  body.set('metadata[plan_code]', input.planCode);
  body.set('subscription_data[metadata][organization_id]', input.organizationId);
  body.set('subscription_data[metadata][user_id]', input.userId);
  body.set('subscription_data[metadata][plan_code]', input.planCode);
  if (input.customerId) body.set('customer', input.customerId);
  else if (input.email) body.set('customer_email', input.email);
  return stripeRequest<{ id: string; url: string | null }>('/checkout/sessions', { method: 'POST', body });
}

export async function createNetworkBoostCheckout(input: { userId: string; organizationId: string; email?: string | null; creditType: NetworkCreditType; customerId?: string | null }) {
  const priceId = boostPrice(input.creditType);
  if (!priceId || !stripeSecret()) throw new Error('One-time Boost checkout is not configured for this placement.');
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://richcityhoops.com').replace(/\/$/, '');
  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('origin_context', 'web');
  body.set('integration_identifier', integrationIdentifier());
  body.set('success_url', `${site}/network/dashboard/reach?boost=success`);
  body.set('cancel_url', `${site}/network/dashboard/reach?boost=cancelled`);
  body.set('client_reference_id', input.organizationId);
  body.set('line_items[0][price]', priceId);
  body.set('line_items[0][quantity]', '1');
  body.set('metadata[organization_id]', input.organizationId);
  body.set('metadata[user_id]', input.userId);
  body.set('metadata[purchase_kind]', 'boost_credit');
  body.set('metadata[credit_type]', input.creditType);
  if (input.customerId) body.set('customer', input.customerId);
  else if (input.email) body.set('customer_email', input.email);
  return stripeRequest<{ id: string; url: string | null }>('/checkout/sessions', { method: 'POST', body });
}

export async function createNetworkPartnerPortalSession(customerId: string) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://richcityhoops.com').replace(/\/$/, '');
  const body = new URLSearchParams();
  body.set('customer', customerId);
  body.set('return_url', `${site}/network/dashboard/billing`);
  const configuration = process.env.STRIPE_NETWORK_PORTAL_CONFIGURATION_ID?.trim() || process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim();
  if (configuration) body.set('configuration', configuration);
  return stripeRequest<{ id: string; url: string }>('/billing_portal/sessions', { method: 'POST', body });
}

export async function retrieveNetworkStripeSubscription(subscriptionId: string) {
  return stripeRequest<StripeSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=items.data.price`);
}

export function parseNetworkStripeSubscription(subscription: StripeSubscription) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.id || null;
  let planCode: PaidNetworkPartnerPlanCode | null = null;
  if (priceId && priceId === subscriptionPrice('amplify')) planCode = 'amplify';
  else if (priceId && priceId === subscriptionPrice('premier')) planCode = 'premier';
  else if (subscription.metadata?.plan_code === 'amplify' || subscription.metadata?.plan_code === 'premier') planCode = subscription.metadata.plan_code;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null;
  return {
    subscriptionId: subscription.id,
    customerId,
    organizationId: subscription.metadata?.organization_id || null,
    planCode,
    status: subscription.status,
    priceId,
    priceCents: item?.price?.unit_amount ?? (planCode ? NETWORK_PARTNER_PLANS[planCode].monthlyPriceCents : null),
    currency: item?.price?.currency || 'usd',
    currentPeriodStart: item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
    currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
  };
}

export function verifyNetworkStripeWebhook(payload: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_NETWORK_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;
  const values = signatureHeader.split(',').map((part) => part.trim());
  const timestamp = values.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = values.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  if (!timestamp || !signatures.length) return false;
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`, 'utf8').digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const candidate = Buffer.from(signature, 'hex');
    return candidate.length === expectedBuffer.length && crypto.timingSafeEqual(candidate, expectedBuffer);
  });
}
