import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {lobbySnapshot} from '../src/lib/runs-gameplay-readiness';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('RCH Runs connected full-game shell v1',()=>{
 it('provides one game experience across Runs detail pages and Crew HQ',()=>{
  const layout=read('src/app/runs/layout.tsx');
  const crew=read('src/app/crews/page.tsx');
  expect(layout).toContain('<RunsGameChrome/>');
  expect(crew).toContain('<RunsGameChrome crew/>');
  expect(layout).toContain('runs-game-system.css');
 });
 it('reuses verified back-end career data and never invents game wins or REP',()=>{
  const chrome=read('src/components/runs/RunsGameChrome.tsx');
  expect(chrome).toContain("db.rpc('get_rch_world_journey')");
  expect(chrome).toContain("db.from('rch_rep_wallets')");
  expect(chrome).toContain('worldXpProgress(journey.data.world_xp)');
  expect(chrome).toContain("setUnavailable(true)");
  expect(chrome).toContain('VERIFIED GAMES');
  expect(chrome).toContain("pathname==='/runs/world'");
 });
 it('gives deep pages the same four game modes as the cinematic home',()=>{
  const nav=read('src/components/runs/RunsGlobalNav.tsx');
  for(const name of ['Play','World','Crews','MyPLAYER'])expect(nav).toContain("label:'"+name+"'");
  expect(nav).toContain("path.startsWith('/runs/courts/')");
  expect(nav).not.toContain("label:'Vault'");
  expect(read('src/app/runs/runs-global-nav.css')).toContain('grid-template-columns:repeat(4,');
 });
 it('connects real RSVPs, check-ins, scorecards and independently verified match rewards',()=>{
  const room=read('src/app/runs/[id]/page.tsx');
  const journey=read('src/components/runs/RunsGameplayJourney.tsx');
  expect(room).toContain('capacity={run.max_players}');
  expect(room).toContain('registeredIds={registeredPlayerIds}');
  expect(room).toContain('checkedInIds={Array.from(checkins)}');
  expect(room).toContain('id="rch-join-action"');
  expect(journey).toContain("db.rpc('get_rch_world_expansion')");
  expect(journey).toContain("find(receipt=>receipt.run_id===runId)");
  expect(journey).toContain('RSVP · NOT CHECKED IN');
  expect(journey).toContain('pickup scorecard');
  expect(journey).toContain('independently confirmed for your player');
  expect(journey).toContain("href:'/runs?view=list#rch-upcoming-runs'");
 });
 it('does not treat a populated roster as actual attendance or a court suggestion as an event',()=>{
  const p=lobbySnapshot({format:'3v3',registered:6,capacity:6,status:'open',suggested:false,past:false});
  expect(p.state).toBe('target');
  expect(p.guidance).toContain('not a confirmed game');
  expect(lobbySnapshot({format:'3v3',registered:6,capacity:6,status:'open',suggested:true,past:false}).state).toBe('suggestion');
  const journey=read('src/components/runs/RunsGameplayJourney.tsx');
  expect(journey).toContain('open-court suggestion, not a hosted game');
 });
 it('respects 320px mobile and reduced motion',()=>{
  const css=read('src/app/runs/runs-game-system.css');
  expect(css).toContain('@media(max-width:700px)');
  expect(css).toContain('@media(prefers-reduced-motion:reduce)');
  expect(css).toContain(':focus-visible');
 });
});
