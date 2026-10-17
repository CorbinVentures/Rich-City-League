import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
const ledger=read('supabase/migrations/20261017004000_rch_rep_exchange_ledger.sql');
const badges=read('supabase/migrations/20261017004010_rch_place_specific_collectibles.sql');
const loop=read('supabase/migrations/20261017004020_rch_rep_promotion_engagement_cap.sql');
const frame=read('supabase/migrations/20261017004030_rch_rep_profile_frame_public_check.sql');
const exchange=read('src/components/rep/RepExchangeClient.tsx');
const medal=read('src/components/rep/PlaceBadgeVault.tsx');
const promos=read('src/components/rep/RepPromotedPlacement.tsx');
const staff=read('src/app/rep/operations/page.tsx');

describe('RCH REP Exchange economy',()=>{
 it('uses a nonnegative wallet and immutable, idempotent server-owned transactions',()=>{
  expect(ledger).toContain('balance bigint not null default 0 check(balance>=0)');
  expect(ledger).toContain('source_key text not null unique');
  expect(ledger).toContain("revoke insert,update,delete,truncate on public.xp_transactions");
  expect(ledger).toContain('rch_rep_verified_earnings');
  expect(ledger).toContain('on conflict(source_key) do nothing');
  expect(ledger).toContain('for update');
  expect(ledger).toContain('Not enough available REP');
  expect(ledger).toContain('Three REP redemptions per 24 hours');
  expect(ledger).toContain('rch_cancel_rep_reward');
  expect(ledger).toContain('rch_review_rep_reward');
 });
 it('sells only legitimately fulfillable perks; a manual promotion cannot activate without staff review',()=>{
  expect(ledger).toContain("v_reward.delivery='instant'");
  expect(ledger).toContain("'pending_review'");
  expect(ledger).toContain('The promoted post is no longer eligible');
  expect(ledger).toContain("Staff may not approve their own REP purchase");
  expect(exchange).toContain("rch_buy_rep_reward");
  expect(exchange).toContain("rch_cancel_rep_reward");
  expect(staff).toContain("rch_review_rep_reward");
  expect(promos).toContain("Sponsored with REP");
  expect(ledger).toContain('rch_active_rep_promotions');
 });
 it('allows only earned court medals tied to verified local outcomes',()=>{
  expect(badges).toContain('21–0 Park Domination');
  expect(badges).toContain("new.status<>'verified'");
  expect(badges).toContain("new.game_format='1v1'");
  expect(badges).toContain("new.home_score=21");
  expect(badges).toContain("count(distinct l.locality)");
  expect(badges).toContain('rch_badge_from_master_crown');
  expect(badges).toContain('rch_badge_from_crew_takeover');
  expect(badges).toContain('rch_certify_community_badge');
  expect(badges).toContain('Independent staff verification');
  expect(medal).toContain('PlaceBadgeMedal');
  expect(medal).toContain('ROCKWOOD PARK');
 });
 it('limits promotional engagement rebates to 20% with unique real-member reactions',()=>{
  expect(loop).toContain('(v_order.price_paid/5)');
  expect(loop).toContain('primary key(order_id,actor_id,interaction)');
  expect(loop).toContain('o.profile_id<>v_actor');
  expect(loop).toContain('rch_rep_credit_internal');
  expect(frame).toContain('rch_has_active_rep_frame');
 });
});