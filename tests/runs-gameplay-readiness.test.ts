import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {findPlayableRuns,isRookieFriendly,lobbySnapshot,playerTarget,type GameplayRun} from '../src/lib/runs-gameplay-readiness';
import {assessPilot,PILOT_CATEGORIES,type PilotEvidence} from '../src/lib/runs-pilot-quality-gate';

const sample=(patch:Partial<GameplayRun>={}):GameplayRun=>({
 id:'real-one',title:'Richmond 3s',location:'Richmond public court',
 starts_at:'2026-11-04T18:00:00Z',game_format:'3v3',run_type:'social',
 skill_level:'all',max_players:10,status:'open',players:[],...patch
});
const source=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('RCH Runs game activation contracts',()=>{
 it('requires real RSVPs for an appropriate game format, never invented fill',()=>{
  expect(playerTarget('1v1')).toBe(2);
  expect(playerTarget('3v3')).toBe(6);
  expect(playerTarget('5v5')).toBe(10);
  expect(playerTarget('unknown')).toBeNull();
  const forming=lobbySnapshot({format:'3v3',registered:4,capacity:10,status:'open',suggested:false,past:false});
  expect(forming).toMatchObject({state:'forming',missing:2,target:6,registered:4});
  const target=lobbySnapshot({format:'3v3',registered:6,capacity:10,status:'open',suggested:false,past:false});
  expect(target.state).toBe('target');
  expect(target.guidance).toContain('not a confirmed game');
 });
 it('never treats suggestions, past games or bad-capacity listings as playable',()=>{
  const input={format:'3v3',registered:6,capacity:10,status:'open',suggested:false,past:false};
  expect(lobbySnapshot({...input,suggested:true}).state).toBe('suggestion');
  expect(lobbySnapshot({...input,past:true}).state).toBe('unavailable');
  expect(lobbySnapshot({...input,capacity:5}).state).toBe('configuration');
  expect(lobbySnapshot({...input,format:'Other'}).state).toBe('unsupported');
  expect(lobbySnapshot({...input,status:'cancelled'}).state).toBe('unavailable');
  expect(findPlayableRuns([sample({isSuggestedCourt:true}),sample({status:'full'}),
   sample({starts_at:'2026-10-29T19:00:00Z'}),sample({id:'valid'})],Date.parse('2026-10-30T12:00:00Z')).map(x=>x.id)).toEqual(['valid']);
 });
 it('offers opt-in rookie games and a truthful live roster in the existing Run Room',()=>{
  expect(isRookieFriendly(sample())).toBe(true);
  expect(isRookieFriendly(sample({run_type:'competitive',skill_level:'elite'}))).toBe(false);
  const runs=source('src/app/runs/page.tsx');
  const room=source('src/app/runs/[id]/page.tsx');
  expect(runs).toContain('<RunQuickPlay runs={visibleRuns}');
  expect(runs).toContain('isRookieFriendly(run)');
  expect(room).toContain('<RunLobbyReadiness format={run.game_format}');
  expect(room).toContain('registered={registeredPlayerIds.length}');
  expect(room).toContain('suggested={suggestedCourt}');
  expect(room).toContain("db.rpc('rch_check_in_with_code'");
 });
 it('only exposes postgame results from independently verified server receipts',()=>{
  const expansion=source('src/components/runs/RunsWorldExpansion.tsx');
  expect(expansion).toContain("db.rpc('get_rch_world_expansion')");
  expect(expansion).toContain('shareVerifiedRecap(latest)');
  expect(expansion).toContain('VERIFIED GAME RECAP');
  expect(expansion).not.toContain('fakeScore');
 });
 it('keeps a physical pilot blocked until every game studio category is evidenced at 8+',()=>{
  const empty: PilotEvidence={
   categories:{},venuePermission:false,weatherPlan:false,firstAid:false,
   rosterMinimumMet:false,independentOfficialAssigned:false,
   twoAccountDeviceTest:false,checkinAndResultsVerified:false,consentReviewed:false
  };
  expect(assessPilot(empty).cleared).toBe(false);
  const grades=Object.fromEntries(PILOT_CATEGORIES.map(category=>
   [category,{score:8,evidence:['real-device field proof'],verifiedBy:'Independent QA'}]));
  const ready: PilotEvidence={...empty,categories:grades,
   venuePermission:true,weatherPlan:true,firstAid:true,rosterMinimumMet:true,
   independentOfficialAssigned:true,twoAccountDeviceTest:true,
   checkinAndResultsVerified:true,consentReviewed:true};
  expect(assessPilot(ready).cleared).toBe(true);
  expect(assessPilot({...ready,categories:{...grades,first_time_gameplay:{score:7,evidence:['field test'],verifiedBy:'QA'}}}).cleared).toBe(false);
  expect(assessPilot({...ready,checkinAndResultsVerified:false}).cleared).toBe(false);
  expect(assessPilot({...ready,categories:{...grades,crews_territory:{score:8,evidence:[],verifiedBy:'QA'}}}).cleared).toBe(false);
 });
});
