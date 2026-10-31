import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const file=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=file('supabase/migrations/20261031052324_rch_weekly_hoops_brief.sql');

describe('Weekly Hoops Brief safety and member experience',()=>{
  it('only enrolls members who affirmatively opted in',()=>{
    expect(migration).toContain('weekly_digest boolean NOT NULL DEFAULT false');
    expect(migration).toContain("raw_user_meta_data->>'weekly_digest_opt_in' = 'true'");
    expect(migration).toContain('prefs.weekly_digest AND prefs.email_enabled');
    expect(migration).toContain('u.email_confirmed_at IS NOT NULL');
    expect(migration).toContain('NOT COALESCE(p.is_system_account,false)');
    expect(file('src/components/AuthForm.tsx')).toContain("const [weeklyDigestOptIn, setWeeklyDigestOptIn] = useState(false)");
  });

  it('does not send sponsor mail without mailing address and approved, paid inventory',()=>{
    expect(migration).toContain('enabled boolean NOT NULL DEFAULT false');
    expect(migration).toContain("NULLIF(trim(settings.postal_address),'') IS NULL");
    expect(migration).toContain("payment_status='paid'");
    expect(migration).toContain('reviewed_by IS NOT NULL');
    expect(migration).toContain('SPONSORED • COMMUNITY PARTNER');
  });

  it('sends each opted-in recipient at most once per weekly edition',()=>{
    expect(migration).toContain('PRIMARY KEY(recipient_id, week_start)');
    expect(migration).toContain('ON CONFLICT (recipient_id,week_start) DO NOTHING');
    expect(migration).toContain('Idempotency-Key');
    expect(migration).toContain("timezone('America/New_York',now())");
    expect(migration).toContain('rch_reconcile_weekly_digest_deliveries');
    expect(migration).toContain("status='unconfirmed'");
  });

  it('collects personal summaries from real run, badge, REP and news sources',()=>{
    for(const table of ['public.run_checkins','public.rch_run_rep_events','public.rch_run_badge_awards','public.rch_run_stat_badges','public.user_levels','public.runs','public.news','public.network_events']) {
      expect(migration).toContain(table);
    }
    expect(migration).toContain("status::text='published'");
    expect(migration).toContain("status='open'");
  });

  it('supports confirmed no-login opt-out without sending email on GET',()=>{
    expect(migration).toContain('rch_unsubscribe_weekly_digest(p_token text)');
    expect(migration).toContain('weekly_digest=false');
    expect(migration).toContain("p_token !~ '^[0-9a-f]{48}$'");
    const page=file('src/app/notifications/unsubscribe/page.tsx');
    expect(page).toContain('onClick={()=>void unsubscribe()}');
    expect(page).toContain('Do not unsubscribe on page load');
    expect(page).toContain('window.history.replaceState');
  });

  it('keeps the one-time PWA install onboarding email independent',()=>{
    const welcome=file('supabase/migrations/20261010060718_registration_welcome_email.sql');
    expect(welcome).toContain('rtrim(cfg.site_base_url,');
    expect(welcome).toContain('Add to Home Screen');
    expect(welcome).toContain('Install app');
    expect(welcome).toContain('on conflict (user_id) do nothing');
  });
});
