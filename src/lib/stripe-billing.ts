import 'server-only';
import crypto from 'node:crypto';
import {
  MEMBERSHIP_PLANS,
  type MembershipBillingInterval,
  type MembershipPlanCode,
} from '@/lib/membership';

type PaidPlanCode = Exclude<MembershipPlanCode, 'free'>;

type StripeSubscription = {
  id: string;
  customer: string | { id?: string } | null;
  status: string;
  cancel_at_period_end?: boolean;
  canceled_at?: number | null;
  trial_end?: number | null;
  metadata?: Record<string, string>;
  items?: {
    data?: Array<{
      current_period_start?: number;
      current_period_end?: number;
      price?: {
        id?: string;
        unit_amount?: number | null;
        currency?: string | null;
        recurring?: { interval?: string | null } | null;
      } | null;
    }>;
  };
};

const STRIPE_API = 'https://api.stripe.com/v1';
const PAID_PLAN_INTERVALS: Array<[PaidPlanCode, MembershipBillingInterval]> = [
  ['rcl_plus', 'monthly'],
  ['rcl_plus', 'annual'],
  ['all_access', 'monthly'],
  ['all_access', 'annual'],
];

function stripeSecret() {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

function envPrice(plan: PaidPlanCode, interval: MembershipBillingInterval) {
  if (plan === 'rcl_plus' && interval === 'monthly') return process.env.STRIPE_PRICE_RCL_PLUS_MONTHLY?.trim() || null;
  if (plan === 'rcl_plus' && interval === 'annual') return process.env.STRIPE_PRICE_RCL_PLUS_ANNUAL?.trim() || null;
  if (plan === 'all_access' && interval === 'monthly') return process.env.STRIPE_PRICE_ALL_ACCESS_MONTHLY?.trim() || null;
  return process.env.STRIPE_PRICE_ALL_ACCESS_ANNUAL?.trim() || null;
}

export function getStripePriceId(plan: PaidPlanCode, interval: MembershipBillingInterval) {
  return envPrice(plan, interval);
}

export function planForStripePrice(priceId: string | null | undefined): { planCode: PaidPlanCode; interval: MembershipBillingInterval } | null {
  if (!priceId) return null;
  for (const [planCode, interval] of PAID_PLAN_INTERVALS) {
    if (envPrice(planCode, interval) === priceId) return { planCode, interval };
  }
  return null;
}

export function stripeBillingConfigured(plan?: PaidPlanCode, interval?: MembershipBillingInterval) {
  if (!stripeSecret()) return false;
  if (plan && interval) return Boolean(envPrice(plan, interval));
  return PAID_PLAN_INTERVALS.every(([planCode, billingInterval]) => Boolean(envPrice(planCode, billingInterval)));
}

async function stripeRequest<T>(path: string, options: { method?: 'GET' | 'POST'; body?: URLSearchParams } = {}): Promise<T> {
  const secret = stripeSecret();
  if (!secret) throw new Error('Stripe billing is not configured.');
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: options.body,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({})) as any;
  if (!response.ok) {
    const message = payload?.error?.message || `Stripe request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload as T;
}

export async function createStripeCheckoutSession(input: {
  userId: string;
  email?: string | null;
  planCode: PaidPlanCode;
  interval: MembershipBillingInterval;
  customerId?: string | null;
}) {
  const priceId = envPrice(input.planCode, input.interval);
  if (!priceId || !stripeSecret()) throw new Error('Stripe billing is not configured for this membership.');
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://richcityhoops.com').replace(/\/$/, '');
  const body = new URLSearchParams();
  body.set('mode', 'subscription');
  body.set('origin_context', 'web');
  body.set('submit_type', 'subscribe');
  body.set('success_url', `${site}/account/membership?checkout=success`);
  body.set('cancel_url', `${site}/account/membership?checkout=cancelled`);
  body.set('client_reference_id', input.userId);
  body.set('line_items[0][price]', priceId);
  body.set('line_items[0][quantity]', '1');
  body.set('allow_promotion_codes', 'true');
  body.set('metadata[user_id]', input.userId);
  body.set('metadata[plan_code]', input.planCode);
  body.set('metadata[billing_interval]', input.interval);
  body.set('subscription_data[metadata][user_id]', input.userId);
  body.set('subscription_data[metadata][plan_code]', input.planCode);
  body.set('subscription_data[metadata][billing_interval]', input.interval);
  // Stripe's current Checkout API defaults new subscriptions to flexible billing mode.
  // Do not force a billing mode unless RCL has a specific compatibility reason to override it.
  if (input.customerId) body.set('customer', input.customerId);
  else if (input.email) body.set('customer_email', input.email);
  return stripeRequest<{ id: string; url: string | null }>('/checkout/sessions', { method: 'POST', body });
}

export async function createStripePortalSession(customerId: string) {
  if (!stripeSecret()) throw new Error('Stripe billing is not configured.');
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://richcityhoops.com').replace(/\/$/, '');
  const body = new URLSearchParams();
  body.set('customer', customerId);
  body.set('return_url', `${site}/account/membership`);
  const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim();
  if (configuration) body.set('configuration', configuration);
  return stripeRequest<{ id: string; url: string }>('/billing_portal/sessions', { method: 'POST', body });
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  return stripeRequest<StripeSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=items.data.price`);
}

export function parseStripeSubscription(subscription: StripeSubscription) {
  const item = subscription.items?.data?.[0];
  const price = item?.price;
  const configured = planForStripePrice(price?.id);
  const metadataPlan = subscription.metadata?.plan_code;
  const metadataInterval = subscription.metadata?.billing_interval;
  const planCode: PaidPlanCode | null = configured?.planCode ?? (metadataPlan === 'rcl_plus' || metadataPlan === 'all_access' ? metadataPlan : null);
  const interval: MembershipBillingInterval | null = configured?.interval ?? (metadataInterval === 'monthly' || metadataInterval === 'annual' ? metadataInterval : null);
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null;
  return {
    subscriptionId: subscription.id,
    customerId,
    status: subscription.status,
    planCode,
    interval,
    priceCents: price?.unit_amount ?? (planCode && interval ? (interval === 'annual' ? MEMBERSHIP_PLANS[planCode].annualPriceCents : MEMBERSHIP_PLANS[planCode].monthlyPriceCents) : null),
    currency: price?.currency || 'usd',
    currentPeriodStart: item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
    currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    userId: subscription.metadata?.user_id || null,
  };
}

export function verifyStripeWebhook(payload: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
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
