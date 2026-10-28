#!/usr/bin/env node
/**
 * RCH Sites sandbox-only, read-only Stripe configuration preflight.
 *
 * No Stripe POSTs, customer creation, Checkout Sessions or charges. This is
 * NOT a substitute for genuine hosted Checkout + signed webhook E2E trials.
 */
const env = process.env;
const apiKey = (env.RCH_SITES_SANDBOX_API_KEY || '').trim();
const required = [
  {name: 'AMATEUR_MONTHLY', cents: 1900, interval: 'month', tier: 'amateur'},
  {name: 'AMATEUR_ANNUAL', cents: 19000, interval: 'year', tier: 'amateur'},
  {name: 'PROFESSIONAL_MONTHLY', cents: 4900, interval: 'month', tier: 'professional'},
  {name: 'PROFESSIONAL_ANNUAL', cents: 49000, interval: 'year', tier: 'professional'},
];
const expectedWebhookEvents = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
];

function requireValue(name, prefix) {
  const value = (env[name] || '').trim();
  if (!value.startsWith(prefix) || !/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(name + ' must contain a valid sandbox-only ' + prefix + ' identifier.');
  }
  return value;
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
async function stripeGet(path) {
  const res = await fetch('https://api.stripe.com/v1/' + path, {
    method: 'GET',
    redirect: 'error',
    cache: 'no-store',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Stripe-Version': '2026-08-26.dahlia',
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Never log API keys, arbitrary returned messages or response payloads.
    throw new Error('Sandbox Stripe GET failed with HTTP ' + res.status + '.');
  }
  return data;
}
async function main() {
  // A missing or live key must fail BEFORE any network request.
  assert(/^(sk|rk)_test_[A-Za-z0-9_]+$/.test(apiKey),
    'A dedicated sandbox sk_test_/rk_test_ key is required. Live keys are forbidden.');
  assert(env.RCH_SITES_BILLING_ENABLED !== 'true',
    'Do not run this preflight with RCH_SITES_BILLING_ENABLED=true.');
  const prices = required.map(row => ({
    ...row, id: requireValue('RCH_SITES_SANDBOX_PRICE_' + row.name, 'price_'),
  }));
  assert(new Set(prices.map(row => row.id)).size === 4,
    'Every tier/interval must use a different Stripe price ID.');
  const portalId = requireValue('RCH_SITES_SANDBOX_PORTAL_ID', 'bpc_');
  const webhookId = requireValue('RCH_SITES_SANDBOX_WEBHOOK_ID', 'we_');

  const priceData = await Promise.all(prices.map(row => stripeGet('prices/' + row.id)));
  const products = new Map();
  for (let i = 0; i < prices.length; i++) {
    const row = prices[i], actual = priceData[i];
    assert(actual.id === row.id && actual.active === true && actual.livemode === false,
      row.name + ': missing, inactive or not sandbox-only.');
    assert(actual.currency === 'usd' && actual.unit_amount === row.cents &&
      actual.recurring?.interval === row.interval,
      row.name + ': wrong amount, currency or billing interval.');
    assert(typeof actual.product === 'string' && actual.product.startsWith('prod_'),
      row.name + ': unexpected product.');
    if (products.has(row.tier)) assert(products.get(row.tier) === actual.product,
      row.name + ': its monthly and annual prices belong to different products.');
    products.set(row.tier, actual.product);
    console.log('PASS ' + row.name + ': $' + (row.cents / 100) + ' / ' + row.interval);
  }
  assert(products.get('amateur') !== products.get('professional'),
    'Amateur and Professional must use separate products.');

  const portal = await stripeGet('billing_portal/configurations/' + portalId);
  assert(portal.id === portalId && portal.livemode === false && portal.active === true,
    'Sandbox portal missing or inactive.');
  assert(portal.features?.subscription_update?.enabled === false,
    'Sandbox portal must NOT allow unimplemented plan switching.');
  assert(portal.features?.subscription_cancel?.enabled === true &&
    portal.features?.subscription_cancel?.mode === 'at_period_end',
    'Sandbox cancellation must be enabled at period end.');
  assert(portal.features?.invoice_history?.enabled === true &&
    portal.features?.payment_method_update?.enabled === true,
    'Sandbox portal must permit invoices and payment method management.');
  console.log('PASS restricted sandbox customer portal');

  const webhook = await stripeGet('webhook_endpoints/' + webhookId);
  assert(webhook.id === webhookId && webhook.livemode === false &&
    webhook.status === 'enabled',
    'Sandbox webhook must exist and be enabled for actual test event deliveries.');
  const target = new URL(webhook.url);
  assert(target.protocol === 'https:' &&
    !['richcityhoops.com', 'www.richcityhoops.com'].includes(target.hostname),
    'Sandbox webhook must target an isolated HTTPS staging endpoint, not production.');
  assert(target.pathname === '/api/rch-sites/billing/webhook',
    'Sandbox webhook path must be the RCH Sites billing route.');
  for (const event of expectedWebhookEvents) {
    assert((webhook.enabled_events || []).includes(event),
      'Sandbox webhook is missing ' + event);
  }
  console.log('PASS sandbox webhook configuration and staging destination');
  console.log('Sandbox preflight PASS. Real hosted checkout, invoice and cancellation tests remain required.');
}
main().catch(error => {
  console.error('Sandbox preflight FAILED: ' + error.message);
  process.exitCode = 1;
});
