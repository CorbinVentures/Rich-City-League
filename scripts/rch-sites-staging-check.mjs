// Staging-only wrapper: credentials stay inside Vercel's secret environment.
if (process.env.VERCEL_ENV !== 'preview') throw new Error('Preview environment required');
process.env.RCH_SITES_SANDBOX_API_KEY = process.env.RCH_SITES_STRIPE_API_KEY;
for (const name of ['PRICE_AMATEUR_MONTHLY','PRICE_AMATEUR_ANNUAL','PRICE_PROFESSIONAL_MONTHLY','PRICE_PROFESSIONAL_ANNUAL']) {
  process.env['RCH_SITES_SANDBOX_' + name] = process.env['RCH_SITES_' + name];
}
process.env.RCH_SITES_SANDBOX_PORTAL_ID = process.env.RCH_SITES_STRIPE_PORTAL_CONFIGURATION_ID;
process.env.RCH_SITES_SANDBOX_WEBHOOK_ID = 'we_1UVWOREHXWVaGmOhUR0pnujS';
await import('./rch-sites-sandbox-preflight.mjs');
