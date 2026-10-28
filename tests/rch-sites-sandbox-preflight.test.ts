import {spawnSync} from 'node:child_process';
import {describe,expect,it} from 'vitest';

const sandboxVariables=[
  'RCH_SITES_SANDBOX_PRICE_AMATEUR_MONTHLY',
  'RCH_SITES_SANDBOX_PRICE_AMATEUR_ANNUAL',
  'RCH_SITES_SANDBOX_PRICE_PROFESSIONAL_MONTHLY',
  'RCH_SITES_SANDBOX_PRICE_PROFESSIONAL_ANNUAL',
  'RCH_SITES_SANDBOX_PORTAL_ID',
  'RCH_SITES_SANDBOX_WEBHOOK_ID',
];

function run(key:string,enabled='false'){
  const env:NodeJS.ProcessEnv={...process.env,RCH_SITES_SANDBOX_API_KEY:key,
    RCH_SITES_BILLING_ENABLED:enabled};
  for(const name of sandboxVariables)env[name]='';
  return spawnSync(process.execPath,['scripts/rch-sites-sandbox-preflight.mjs'],{
    encoding:'utf8',env,timeout:5000,
  });
}

describe('RCH Sites sandbox preflight — never touch live Stripe',()=>{
  it('rejects absent server credentials before any network activity',()=>{
    const result=run('');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Live keys are forbidden');
  });

  it('rejects live-mode API credentials and never prints them',()=>{
    const liveKey='sk_live_fictitious_no_charge';
    const result=run(liveKey);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Live keys are forbidden');
    expect(result.stderr).not.toContain(liveKey);
  });

  it('rejects sandbox preflight while billing release switch is enabled',()=>{
    const result=run('sk_test_fictitious_no_charge','true');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('RCH_SITES_BILLING_ENABLED=true');
  });

  it('rejects incomplete sandbox catalog before contacting Stripe',()=>{
    const result=run('rk_test_fictitious_no_charge');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('RCH_SITES_SANDBOX_PRICE_AMATEUR_MONTHLY');
  });
});
