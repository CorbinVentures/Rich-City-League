import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isSoloJoinable,rankSoloRuns,runShareText} from '../src/lib/runs-social-discovery';
const fileText=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const now=Date.parse('2026-10-25T12:00:00-04:00');
const run=(overrides:Record<string,unknown>={})=>({
 id:'r1',status:'open',starts_at:'2026-10-26T20:00:00-04:00',
 max_players:10,players:['p1','p2'],skill_level:'all',run_type:'social',
 game_format:'3v3',...overrides
});

describe('Runs community pillars — real capacity and truthful share text',()=>{
 it('allows a solo player to seek an individual RSVP without a crew',()=>{
  expect(isSoloJoinable(run(),now)).toBe(true);
  expect(isSoloJoinable(run({players:Array(10).fill('p')}),now)).toBe(false);
  expect(isSoloJoinable(run({status:'cancelled'}),now)).toBe(false);
  expect(isSoloJoinable(run({starts_at:'2026-10-24T20:00:00-04:00'}),now)).toBe(false);
 });
 it('ranks actual open welcoming runs without auto-booking or inventing an opponent',()=>{
  const options=[run({id:'advanced',skill_level:'elite',run_type:'competitive'}),
   run({id:'newcomer',skill_level:'all',run_type:'social'}),
   run({id:'full',players:Array(10).fill('p')})];
  expect(rankSoloRuns(options,now).map(x=>x.id)).toEqual(['newcomer','advanced']);
 });
 it('creates a useful run invite using the real location and clock time',()=>{
  const caption=runShareText({title:'Pine Camp 3s',location:'Pine Camp, Richmond',game_format:'3v3',starts_at:'2026-10-26T20:00:00-04:00'});
  expect(caption).toContain('Pine Camp 3s · 3v3');
  expect(caption).toContain('8:00 PM');
  expect(caption).toContain('Pine Camp, Richmond');
 });
 it('keeps the listing focused and makes public, user-initiated sharing visible',()=>{
  const runs=fileText('src/app/runs/page.tsx');
  expect(runs).toContain('Find a solo spot');
  expect(runs).toContain('visibleRuns.slice(0,visibleLimit)');
  expect(runs).toContain('Show more Runs');
  expect(runs).toContain('rankSoloRuns(matching)');
  expect(runs).toContain('<ShareRunButton id={run.id}');
  expect(runs).toContain('My Passport');
  expect(runs).toContain('<RunCultureMoments/>');
  expect(runs).toContain('<BadgeMedallion badge={badge} size="xs"/>');
  const passport=fileText('src/components/runs/RunPassport.tsx');
  expect(passport).toContain('Share my stats');
  expect(passport).toContain('navigator.share');
 });
 it('allows only already published Run-linked stories to appear as culture, not false celebrity claims',()=>{
  const culture=fileText('src/components/runs/RunCultureMoments.tsx');
  expect(culture).toContain(".eq('status','published')");
  expect(culture).toContain(".not('run_id','is',null)");
  expect(culture).toContain('An uploaded photo or community report is not proof of a celebrity appearance');
  expect(culture).toContain('with permission');
  expect(culture).not.toContain('is_celebrity: true');
  const publish=fileText('src/app/runs/[id]/highlight/page.tsx');
  expect(publish).toContain('type="checkbox" required checked={mediaPermission}');
  expect(publish).toContain('!mediaPermission');
  expect(publish).toContain('unverified guest or celebrity appearance');
 });
 it('provides a public, run-specific social preview rather than generic web links',()=>{
  const preview=fileText('src/app/runs/[id]/layout.tsx');
  expect(preview).toContain("eq('id',id)");
  expect(preview).toContain("openGraph:{title,description,type:'website'");
  expect(preview).toContain('Rich City Hoops');
 });
});
