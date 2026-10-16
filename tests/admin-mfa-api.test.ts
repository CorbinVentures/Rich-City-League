import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const transfer = readFileSync(resolve(process.cwd(), 'src/app/api/admin/rch-tv/earnings/transfer/route.ts'), 'utf8');
const leagueApps = readFileSync(resolve(process.cwd(), 'src/app/api/admin/leagueapps/route.ts'), 'utf8');

describe('MFA on server-side administrator API operations', () => {
  it('refuses password-only sessions before payment service-role access', () => {
    const assurance = transfer.indexOf('auth.mfa.getAuthenticatorAssuranceLevel()');
    const deny = transfer.indexOf("assurance?.currentLevel!=='aal2'");
    const privileged = transfer.indexOf('getSupabaseAdminClient() as any');
    expect(assurance).toBeGreaterThan(-1);
    expect(deny).toBeGreaterThan(assurance);
    expect(privileged).toBeGreaterThan(deny);
    expect(transfer).toContain("Authenticator verification required for financial transfers.");
  });

  it('requires verified AAL2 for interactive LeagueApps admin operations, without granting cron admin rights', () => {
    expect(leagueApps).toContain("if (isCron) {");
    expect(leagueApps).toContain("if (action !== 'sync-competition') return unauthorized(");
    const interactive = leagueApps.indexOf('  } else {\n    const supabase = await getServerSupabaseClient(bearerToken);');
    const assurance = leagueApps.indexOf('auth.mfa.getAuthenticatorAssuranceLevel()', interactive);
    const deny = leagueApps.indexOf("assurance?.currentLevel !== 'aal2'", assurance);
    const profile = leagueApps.indexOf("from('profiles').select('role')", deny);
    expect(interactive).toBeGreaterThan(-1);
    expect(assurance).toBeGreaterThan(interactive);
    expect(deny).toBeGreaterThan(assurance);
    expect(profile).toBeGreaterThan(deny);
  });
});

describe('opted-in member MFA on service-role endpoints', () => {
  it('requires a completed challenge before spotlight writes', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/api/membership/spotlight/route.ts'), 'utf8');
    const aal = source.indexOf('auth.mfa.getAuthenticatorAssuranceLevel()');
    const deny = source.indexOf("assurance.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2'", aal);
    const service = source.indexOf('getSupabaseAdminClient() as any');
    expect(aal).toBeGreaterThan(-1);
    expect(deny).toBeGreaterThan(aal);
    expect(service).toBeGreaterThan(deny);
  });

  it('requires MFA before creator Stripe onboarding can access privileged creator data', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/api/rch-tv/creator/connect/route.ts'), 'utf8');
    const verified = source.indexOf('auth.mfa.getAuthenticatorAssuranceLevel()');
    const guard = source.indexOf("assurance.nextLevel==='aal2'&&assurance.currentLevel!=='aal2'", verified);
    const creatorRead = source.indexOf("from('rch_creator_accounts')", guard);
    const service = source.indexOf('getSupabaseAdminClient() as any', creatorRead);
    expect(verified).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(verified);
    expect(creatorRead).toBeGreaterThan(guard);
    expect(service).toBeGreaterThan(creatorRead);
  });
});
