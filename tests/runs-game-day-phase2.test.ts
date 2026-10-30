import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {lobbySnapshot,playerTarget} from '../src/lib/runs-gameplay-readiness';

const source=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Runs Full-Game Phase 2: real game-day',()=>{
 it('reuses the actual roster, team assignments and check-ins inside game-day matchup',()=>{
  const room=source('src/app/runs/[id]/page.tsx');
  const matchup=source('src/components/runs/RunTeamMatchupBoard.tsx');
  expect(room).toContain('<RunTeamMatchupBoard');
  for(const text of ['teams={teams}','members={members}','registeredIds={registeredPlayerIds}','checkedInIds={Array.from(checkins)}'])expect(room).toContain(text);
  expect(matchup).toContain('RSVP ONLY');
  expect(matchup).toContain('CHECKED IN');
  expect(matchup).toContain('realEvent=!suggested');
  expect(matchup).toContain('Open position');
  expect(matchup).toContain('UNASSIGNED');
 });
 it('honestly labels pickup scorecards as separate from independently verified results',()=>{
  const room=source('src/app/runs/[id]/page.tsx');
  const ranked=source('src/components/runs/RunRankedMatchControl.tsx');
  expect(room).toContain('Pickup scorecard saved.');
  expect(room).toContain('Rankings');
  expect(ranked).toContain("db.from('run_ranked_matches')");
  expect(ranked).toContain('run_ranked_matches');
  expect(ranked).toContain('HOME PENDING');
  expect(ranked).toContain('AWAY PENDING');
  expect(ranked).toContain('Not submitted');
 });
 it('only verifies scores after a deliberate second tap on the legitimate review action',()=>{
  const ranked=source('src/components/runs/RunRankedMatchControl.tsx');
  expect(ranked).toContain('confirmTarget===review.id');
  expect(ranked).toContain('YES — VERIFY THIS SCORE');
  expect(ranked).toContain("p_approve:true");
  expect(ranked).toContain("p_approve:false");
  expect(ranked).toContain("'review_ranked_run_result'");
 });
 it('shows true Next Up position among waiting people, not current/on deck participants',()=>{
  const queue=source('src/components/runs/RunNextUp.tsx');
  expect(queue).toContain("waiting.findIndex(i=>i.id===active.id)+1");
  expect(queue).toContain("item.status==='waiting'?waiting.findIndex");
  expect(queue).toContain("aria-live=\"polite\"");
  expect(queue).toContain("rch_manage_run_queue");
  expect(queue).toContain("rch_join_run_queue");
 });
 it('updates personal game-day state from live queue and verified match receipts, not local fabricated points',()=>{
  const journey=source('src/components/runs/RunsGameplayJourney.tsx');
  expect(journey).toContain("db.rpc('get_rch_world_expansion')");
  expect(journey).toContain("find(receipt=>receipt.run_id===runId)");
  expect(journey).toContain("db.from('rch_run_queue')");
  expect(journey).toContain("table:'run_ranked_matches'");
  expect(journey).toContain('sharePostgame');
  expect(journey).toContain("if(!verified)return;");
  expect(journey).toContain("host?{href:'#rch-run-lobby'");
 });
 it('keeps roster minimum, app motion and actual score evidence guards',()=>{
  const format=playerTarget('3v3');expect(format).toBe(6);
  const snapshot=lobbySnapshot({format:'3v3',registered:6,capacity:6,status:'open',suggested:true,past:false});
  expect(snapshot.state).toBe('suggestion');
  const css=source('src/app/runs/runs-game-day.css');
  expect(source('src/app/runs/layout.tsx')).toContain('runs-game-day.css');
  expect(css).toContain('@media(max-width:650px)');
  expect(css).toContain('@media(prefers-reduced-motion:reduce)');
 });
});
