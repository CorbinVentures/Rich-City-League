import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {isBrowserAccountRoute} from '../src/lib/rch-mobile-experience';
import {getBrowserPostAuthPath} from '../src/lib/auth-redirect';
const read=(p:string)=>readFileSync(p,'utf8');
describe('RCH public member activation',()=>{
  it('provides two-stage signup while keeping essential screening',()=>{
    const form=read('src/components/AuthForm.tsx');
    expect(form).toContain('if (step < 2)');
    expect(form).toContain('age < 16');
    expect(form).toContain('legal_terms_accepted_at');
    expect(form).toContain('privacy_policy_acknowledged_at');
    expect(form).toContain('Add basketball details (optional — update later)');
  });
  it('provides a safe new-member browser welcome route',()=>{
    expect(isBrowserAccountRoute('/welcome')).toBe(true);
    expect(getBrowserPostAuthPath('/welcome?next=%2Fruns','/runs')).toContain('/welcome');
    expect(read('src/components/RCHWelcomeActions.tsx')).toContain("trackRchConversion('first_action_click','welcome')");
  });
  it('features real member data without claiming made-up attendance',()=>{
    const home=read('src/app/page.tsx');
    expect(home).toContain(".eq('profile_visibility','public')");
    expect(home).toContain(".eq('is_system_account',false)");
    expect(home).toContain(".eq('is_automated', false)");
    expect(home).toContain("from('run_players')");
    expect(read('src/components/RCHBrowserHomepage.tsx')).toContain('RSVP is not check-in');
  });
  it('tracks only anonymous session actions',()=>{
    const tracker=read('src/lib/analytics/conversion.ts');
    const migration=read('supabase/migrations/20261031043000_rch_member_activation_funnel.sql');
    expect(tracker).toContain("'home_view'");
    expect(tracker).toContain("'first_action_click'");
    expect(migration).toContain('first_action_click');
    expect(migration).not.toContain('email_address');
  });
});
