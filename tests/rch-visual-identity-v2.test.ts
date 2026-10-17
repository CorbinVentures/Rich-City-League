import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
const crew=read('src/app/crews/page.tsx');
const profile=read('src/app/social/profile/[id]/page.tsx');
const badges=read('src/app/badges/page.tsx');
const vault=read('src/components/rep/PlaceBadgeVault.tsx');
const rep=read('src/components/rep/RepExchangeClient.tsx');
const css=read('src/app/rch-identity.css');

describe('RCH identity experience v2 product contract',()=>{
 it('prioritizes crew identity before power ranking while keeping actual roster and control tools',()=>{
  expect(crew.indexOf('id="rch-crew-hq"')).toBeLessThan(crew.indexOf('id="rch-crew-rankings"'));
  expect(crew.indexOf('id="rch-crew-rankings"')).toBeLessThan(crew.indexOf('id="rch-crew-courts"'));
  expect(crew).toContain("commonwealth_crews");
  expect(crew).toContain('commonwealth_crew_members');
  expect(crew).toContain('selectedMembers.map');
  expect(crew).toContain('CrewLogoStudio');
  expect(crew).toContain('CourtDominion showTakeovers');
  expect(crew).toContain('rch-identity-crest');
  expect(crew).toContain('/runs/courts/');
  expect(crew).toContain('commonwealth_register_crew_run');
 });
 it('presents player achievements, social rep and official RCL games without fake wins',()=>{
  expect(profile).toContain('rch-identity-player-passport');
  expect(profile).toContain('allBadges.length');
  expect(profile).toContain("basketball?.games??'—'");
  expect(profile).toContain('Social reputation');
  expect(profile).toContain('PublicCrewShowcase');
  expect(profile).toContain('PlaceBadgeVault');
  expect(profile).toContain('verified Runs ratings are separate systems');
 });
 it('shows detailed true medals with provenance, earning requirement and rarity filters',()=>{
  expect(badges).toContain('rch-place-collectibles');
  expect(badges).toContain('PlaceBadgeVault');
  expect(vault).toContain('rch_place_badge_awards');
  expect(vault).toContain('rch_badge_showcase_pins');
  expect(vault).toContain('Filter badge tier');
  expect(vault).toContain('source_kind');
  expect(vault).toContain('Artifact details');
  expect(vault).toContain('How to earn');
  expect(vault).toContain('b.award_rule');
  expect(vault).toContain('togglePin');
 });
 it('keeps spendable wallet separate from achievements and provides precise purchase economics',()=>{
  expect(rep).toContain('rch_rep_wallets');
  expect(rep).toContain('rch_rep_transactions');
  expect(rep).toContain('rch_rep_orders');
  expect(rep).toContain('rch_buy_rep_reward');
  expect(rep).toContain('rch_cancel_rep_reward');
  expect(rep).toContain('Wallet after redemption');
  expect(rep).toContain('wallet.balance');
  expect(rep).toContain('selected.price');
  expect(rep).toContain('Wallet readiness');
  expect(rep).toContain('never pay-to-win');
  expect(rep).not.toContain('update run_competitive_ratings');
 });
 it('uses isolated accessible design tokens and motion controls',()=>{
  expect(css).toContain('.rch-identity-surface');
  expect(css).toContain(':focus-visible');
  expect(css).toContain('prefers-reduced-motion:reduce');
  expect(css).not.toMatch(/(^|\n)(body|html|:root)\s*\{/m);
  expect(crew).toContain('aria-label="Crew sections"');
  expect(vault).toContain('aria-pressed');
 });
});
