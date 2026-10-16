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
