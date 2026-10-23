import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
const page=read('src/app/runs/page.tsx');
const hero=read('src/components/runs/RunArenaHero.tsx');
const styles=read('src/app/runs/visual-experience.css');
const court=read('src/app/runs/courts/[slug]/page.tsx');
const social=read('src/components/social/NetworkHome.tsx');
const nav=read('src/lib/member-navigation.ts');
const components=read('src/components/runs/arena-ui.tsx');

describe('RCH Visual Experience v1 product contract',()=>{
 it('has a compact find-first Runs lobby with a genuine host action',()=>{
  expect(hero).toContain('YOUR COURT.');
  expect(hero).toContain('Find a Run');
  expect(hero).toContain('Host a Run');
  expect(hero).toContain("activeMode==='all'");
  expect(hero).toContain('aria-pressed');
  expect(page).toContain('onFind={() =>');
  expect(page).toContain("document.getElementById('rch-upcoming-runs')");
  expect(page.indexOf('<RunArenaHero')).toBeLessThan(page.indexOf('<RunDailyCircuit'));
 });
 it('places real availability above optional deep competition with one primary card CTA',()=>{
  expect(page.indexOf('id="rch-upcoming-runs"')).toBeLessThan(page.indexOf('id="rch-competition"'));
  expect(page).toContain('RCHStatusChip');
  expect(page).toContain('RCHRunDetails');
  expect(page).toContain('RCHEmptyState');
  expect(page).toContain('canJoin');
  expect(page).toContain('run.status');
  expect(page).toContain('run.partner.price_cents');
  expect(page).toContain('onJoin(run)');
  expect(page).toContain('ShareRunButton');
  expect(page).toContain('<RunPassport />');
  expect(page).toContain('showTakeovers');
  expect(page).toContain('<RunRankedLadder/>');
 });
 it('keeps the approved four destinations and scopes the Runs geometry',()=>{
  for(const route of ['/social','/runs','/community','/social/profile/me'])expect(nav).toContain("href:'"+route+"'");
  expect(page).toContain("import './visual-experience.css'");
  expect(styles).toContain('.rch-arena-shell');
  expect(styles).not.toMatch(/(^|\n)(body|html|:root|main|button)\s*\{/m);
  expect(styles).toContain('prefers-reduced-motion:reduce');
  expect(styles).toContain(':focus-visible');
 });
 it('never grants titles or fake games from appearance and keeps court pages sourced',()=>{
  expect(court).toContain("get_rch_court_crew_standings");
  expect(court).toContain('CourtMasterTitles');
  expect(court).toContain("from('runs')");
  expect(court).toContain("eq('location_slug',slug)");
  expect(court).toContain("eq('is_active',true)");
  expect(court).toContain('The territory is unclaimed');
  expect(court).toContain('No scheduled games');
  expect(court).toContain('rch_set_run_daily_preferences');
  expect(court).toContain('Watch court');
  expect(components).toContain("status==='verified'");
  expect(components).toContain('Registration open');
 });
 it('brings real Today context above stories while preserving the timeline and composer',()=>{
  expect(social).toContain('Your next move starts here.');
  expect(social.indexOf('<TodayPanel')).toBeLessThan(social.indexOf('<StoryRail'));
  expect(social).toContain('<NetworkPostCard');
  expect(social).toContain('rch-pulse-compose-strip');
  expect(social).toContain('RCHPulseMoment');
 });
});
