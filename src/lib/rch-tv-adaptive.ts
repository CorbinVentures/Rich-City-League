/**
 * Host-generated Cloudflare Stream embeds support provider-managed ABR.
 * This is deliberately not a generic iframe URL acceptor.
 */
export const RCH_TV_ADAPTIVE_PREFIX = 'cloudflare-stream:';
const UID = /^[a-f0-9]{32}$/i;
const CUSTOMER = /^[a-z0-9]{8,64}$/i;
const EMBED = /^https:\/\/customer-[a-z0-9]{8,64}\.cloudflarestream\.com\/[a-f0-9]{32}\/iframe$/i;

export function cloudflareVideoUid(value: string): string | null {
  const uid = value.trim().toLowerCase();
  return UID.test(uid) ? uid : null;
}
export function resolveRchAdaptiveEmbed(storagePath: string, customerCode: string | undefined): string | null {
  if (!storagePath.startsWith(RCH_TV_ADAPTIVE_PREFIX)) return null;
  const uid = cloudflareVideoUid(storagePath.slice(RCH_TV_ADAPTIVE_PREFIX.length));
  const customer = (customerCode ?? '').trim().toLowerCase();
  if (!uid || !CUSTOMER.test(customer)) return null;
  return 'https://customer-' + customer + '.cloudflarestream.com/' + uid + '/iframe';
}
export function isRchAdaptiveEmbedUrl(url: string): boolean {
  return EMBED.test(url);
}
export function estimatedStreamMonthlyCost(storedMinutes: number, deliveredMinutes: number) {
  if (![storedMinutes,deliveredMinutes].every(n=>Number.isFinite(n)&&n>=0)) return null;
  return {
    // Billing: prepaid blocks of 1,000 storage minutes, usage per 1,000 delivered minutes.
    storageUsd: Math.ceil(storedMinutes / 1000) * 5,
    deliveryUsd: deliveredMinutes / 1000,
    totalUsd: Math.ceil(storedMinutes / 1000) * 5 + deliveredMinutes / 1000,
  };
}
