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
 it('opens Runs with a genuine host action and real games before optional extras',()=>{
  expect(page).toContain('Host a run');
  expect(page).toContain('onClick={() => openCreateForCourt');
  expect(page).toContain('id="rch-upcoming-runs"');
  expect(page).toContain('href="/runs?view=world"');
  expect(page).toContain('My run recommendations');
  expect(page).not.toContain('<RunArenaHero');
  expect(page.indexOf('Host a run')).toBeLessThan(page.indexOf('My run recommendations'));
  // The immersive world is still a supported, accessible alternative experience.
  expect(hero).toContain('YOUR COURT.');
  expect(hero).toContain('Find a Run');
  expect(hero).toContain('Host a Run');
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
 it('keeps Home focused on posts, stories and the composer',()=>{
  expect(social).not.toContain('<TodayPanel');
  expect(social).not.toContain('RCHPulseMoment');
  expect(social).not.toContain('RCHFirstSessionDiscovery');
  expect(social).toContain('<StoryRail');
  expect(social).toContain('<NetworkPostCard');
  expect(social).toContain('rch-pulse-compose-strip');
 });
});
