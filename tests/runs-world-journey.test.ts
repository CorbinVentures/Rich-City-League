import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {
 worldXpProgress,worldLevelThreshold,weeklyQuestCatalog,worldQuestProgress,worldMilestoneCatalog,
 type WorldJourney
} from '../src/lib/runs-world-progression';
import {buildCourtMapPins,type WorldCourt,type WorldRun} from '../src/lib/runs-world-game';

const journey:WorldJourney={
 signed_in:true,world_xp:375,world_level:2,verified_games:2,verified_wins:1,
 verified_courts:3,scouted_courts:1,week_start:'2026-10-12',
 weekly_verified_games:1,weekly_verified_wins:0,joined_upcoming_runs:1,
 scouted_today:1,master_title_defenses:0,stamps:[],recent_verified:[],
 milestones:{first_battle:true,first_win:true,five_verified_games:false,
  three_arenas:true,ten_verified_wins:false,crown_defender:false}
};
const court:WorldCourt={slug:'park',name:'Official Court',address:'123 Main St',locality:'Richmond',
 latitude:37.54,longitude:-77.44,verification_status:'official',access_type:'public',
 venue_type:'outdoor',source_label:'City of Richmond PRCF',source_url:'https://www.rva.gov/parks-recreation/about-department',hours_text:null};
const run:WorldRun={id:'run-1',title:'Verified Rep Weekend',location:'Richmond',
 location_slug:'park',starts_at:'2030-10-25T15:00:00Z',status:'open',
 game_format:'3v3',run_type:'competitive'};

describe('Runs World Journey: persistent, verified and independent of REP',()=>{
 it('progresses World XP without spendable REP or skill-rating shortcuts',()=>{
  expect(worldXpProgress(0)).toMatchObject({level:1,within:0,toNext:180,percent:0});
  expect(worldXpProgress(180)).toMatchObject({level:2,within:0,toNext:540});
  expect(worldXpProgress(720).level).toBe(3);
  expect(worldLevelThreshold(3)).toBe(720);
  expect(worldXpProgress(-7).xp).toBe(0);
 });
 it('ties mission completion to server-backed journey state, not click-local flags',()=>{
  expect(weeklyQuestCatalog).toHaveLength(4);
  expect(weeklyQuestCatalog.map(q=>worldQuestProgress(journey,q.key))).toEqual([1,1,1,0]);
  expect(worldMilestoneCatalog.map(m=>journey.milestones[m.key]))
   .toEqual([true,true,false,true,false,false]);
 });
 it('draws real map beacon states without changing the stored underlying venue location',()=>{
  const base=buildCourtMapPins([court],[run]);
  expect(base[0]).not.toHaveProperty('gameState');
  expect(buildCourtMapPins([court],[run],{ownedCourts:['park'],doubleRepRuns:['run-1']})[0].gameState).toBe('crown');
  expect(buildCourtMapPins([court],[run],{ownedCourts:['park'],challengedCourts:['park']})[0].gameState).toBe('battle');
  expect(buildCourtMapPins([court],[run],{doubleRepRuns:['run-1']})[0].gameState).toBe('double-rep');
  expect(buildCourtMapPins([{...court,latitude:null}],[run],{ownedCourts:['park']})).toHaveLength(0);
 });
 it('enforces private, idempotent court scouting and verified-only XP at the database layer',()=>{
  const sql=readFileSync(join(process.cwd(),'supabase/migrations/20261017210000_rch_runs_world_journey.sql'),'utf8');
  expect(sql).toContain('primary key(profile_id,court_slug)');
  expect(sql).toContain('alter table public.rch_world_court_scouts enable row level security');
  expect(sql).toContain('using(profile_id=(select auth.uid()))');
  expect(sql).toContain('on conflict do nothing');
  expect(sql).toContain("verification_status in ('official','provider')");
  expect(sql).toContain("where m.status='verified'");
  expect(sql).toContain('v_games*120 + v_wins*60 + v_courts*25');
  expect(sql).toContain('revoke all on function public.rch_world_scout_court');
  expect(sql).not.toContain('insert into public.rch_rep_wallets');
  expect(sql).not.toContain('update public.run_competitive_ratings');
 });
 it('shows live court action, cross-device collection and honest collectible milestones',()=>{
  const ui=readFileSync(join(process.cwd(),'src/components/runs/RunsWorldGame.tsx'),'utf8');
  const page=readFileSync(join(process.cwd(),'src/components/runs/RunsWorldJourney.tsx'),'utf8');
  const atlas=readFileSync(join(process.cwd(),'src/components/discover/VirginiaInteractiveAtlas.tsx'),'utf8');
  expect(ui).toContain("db.rpc('get_rch_world_journey')");
  expect(ui).toContain("db.from('rch_court_master_history')");
  expect(ui).toContain("db.from('rch_court_takeovers')");
  expect(ui).toContain('<WorldScoutButton');
  expect(ui).toContain('<WorldPulse');
  expect(ui).toContain('challengedCourts:worldPulse');
  expect(page).toContain("db.rpc('rch_world_scout_court'");
  expect(page).toContain('Not a physical check-in');
  expect(page).toContain('World quests do not pay REP for taps');
  expect(atlas).toContain("point.gameState==='crown'");
 });
});
