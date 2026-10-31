/** Strict independent PayPal Business Payment Links. These are EXTERNAL checkout URLs.
 * No OAuth, no tokens, no recipient routing, no payment-status inference.
 * Do not use generic PayPal.me personal transfers for service checkout.
 */
export function normalizeOrganizationPayPalLink(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 240) return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'www.paypal.com' ||
        url.username || url.password || url.port || url.search || url.hash) return null;
    if (!/^\/ncp\/payment\/[A-Za-z0-9-]{8,64}$/.test(url.pathname)) return null;
    return 'https://www.paypal.com' + url.pathname;
  } catch { return null; }
}
export const MAX_PAYPAL_OFFERINGS = 12;
export function normalizePayPalOffering(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const data = input as Record<string, unknown>;
  const title = typeof data.title === 'string' ? data.title.replace(/<[^>]*>/g, '').trim().slice(0, 90) : '';
  const description = typeof data.description === 'string' ? data.description.replace(/<[^>]*>/g, '').trim().slice(0, 350) : '';
  const cents = data.amountCents;
  const url = normalizeOrganizationPayPalLink(data.paymentUrl);
  if (!title || title.length < 3 || typeof cents !== 'number' || !Number.isSafeInteger(cents) ||
      cents < 100 || cents > 1_000_000 || !url) return null;
  return { title, description, amount_cents: cents, currency: 'USD' as const, payment_url: url };
}
