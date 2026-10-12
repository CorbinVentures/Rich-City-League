import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { resolve } from 'node:path';

const dir = resolve(process.cwd(), 'apps/rch-scorebook');
const engineSource = readFileSync(resolve(dir, 'training-engine.js'), 'utf8');
const uiSource = readFileSync(resolve(dir, 'training-mode.js'), 'utf8');
const styles = readFileSync(resolve(dir, 'training-mode.css'), 'utf8');
type State = {mode:string;step:number;completed:boolean;events:Array<{kind:string}>};
type Result = {state:State;ok:boolean;message:string};
type Stats = {pts:number;fgm:number;fga:number;threea:number;reb:number;ast:number;pf:number};
type Engine = {
 LESSON:Array<unknown>;
 seed:(mode:string)=>State;
 apply:(state:State,command:Record<string,unknown>)=>Result;
 project:(state:State)=>{score:{blue:number;gold:number};stats:Record<string,Stats>};
 lineup:(state:State)=>Record<string,string[]>;
};
const e = new Script(engineSource + '\n;globalThis.RCHTrainingEngine').runInNewContext() as Engine;
function act(state:State,command:Record<string,unknown>):State {
 const result=e.apply(state,command);
 expect(result.ok,result.message).toBe(true);
 return result.state;
}
describe('RCH Scorebook Academy local training',()=>{
 it('scripts parse and no practice event writes to official backend',()=>{
  expect(()=>new Script(engineSource)).not.toThrow();
  expect(()=>new Script(uiSource)).not.toThrow();
  for(const code of [engineSource,uiSource]) {
   expect(code).not.toMatch(/supabase|\.rpc\(|fetch\(|XMLHttpRequest|sendBeacon|WebSocket/i);
  }
 });
 it('completes guided 13-step scoring, assist, miss, rebound, undo and substitution',()=>{
  let s=e.seed('guide');
  for(const command of [
   {type:'select',team:'blue',player:'b1'},
   {type:'event',kind:'made2'},
   {type:'select',team:'blue',player:'b2'},
   {type:'event',kind:'assist'},
   {type:'select',team:'blue',player:'b1'},
   {type:'event',kind:'miss3'},
   {type:'event',kind:'oreb'},
   {type:'select',team:'gold',player:'g1'},
   {type:'event',kind:'foul'},
   {type:'undo'},
   {type:'sub',team:'blue',out:'b1',incoming:'b6'},
   {type:'view',view:'box'},
   {type:'finish'}
  ])s=act(s,command);
  const p=e.project(s);
  expect(e.LESSON).toHaveLength(13);
  expect(s.step).toBe(13);expect(s.completed).toBe(true);
  expect(p.score).toEqual({blue:2,gold:0});
  expect(p.stats.b1).toMatchObject({pts:2,fgm:1,fga:2,threea:1,reb:1});
  expect(p.stats.b2.ast).toBe(1);
  expect(p.stats.g1.pf).toBe(0);
  expect(e.lineup(s).blue).toContain('b6');
  expect(e.lineup(s).blue).not.toContain('b1');
 });
 it('rejects wrong guided action without advancing or changing totals',()=>{
  const s=e.seed('guide'),result=e.apply(s,{type:'event',kind:'made3'});
  expect(result.ok).toBe(false);expect(result.state).toEqual(s);
  expect(s.step).toBe(0);expect(s.events).toHaveLength(0);
 });
 it('derives freeplay shooting and scoring from practice event replay and undo',()=>{
  let s=e.seed('free');
  s=act(s,{type:'select',team:'blue',player:'b1'});
  for(const kind of ['made2','made3','madeFT','miss3'])s=act(s,{type:'event',kind});
  let p=e.project(s);expect(p.score.blue).toBe(6);
  expect(p.stats.b1).toMatchObject({pts:6,fgm:2,fga:3,threea:2});
  s=act(s,{type:'undo'});p=e.project(s);
  expect(p.score.blue).toBe(6);expect(p.stats.b1.fga).toBe(2);
  s=act(s,{type:'undo'});expect(e.project(s).score.blue).toBe(5);
 });
 it('requires and links valid assist to teammate made basket only once',()=>{
  let s=e.seed('free');
  s=act(s,{type:'select',team:'blue',player:'b2'});
  expect(e.apply(s,{type:'event',kind:'assist'}).ok).toBe(false);
  s=act(s,{type:'select',team:'blue',player:'b1'});
  s=act(s,{type:'event',kind:'made2'});
  s=act(s,{type:'select',team:'blue',player:'b2'});
  s=act(s,{type:'event',kind:'assist'});
  expect(e.apply(s,{type:'event',kind:'assist'}).ok).toBe(false);
 });
 it('only permits bench player to replace on-court player and preserves stats',()=>{
  let s=e.seed('free');
  s=act(s,{type:'select',team:'blue',player:'b1'});
  s=act(s,{type:'event',kind:'made3'});
  expect(e.apply(s,{type:'sub',team:'blue',out:'b1',incoming:'b2'}).ok).toBe(false);
  s=act(s,{type:'sub',team:'blue',out:'b1',incoming:'b6'});
  expect(e.lineup(s).blue).toContain('b6');
  expect(e.project(s).stats.b1.pts).toBe(3);
  expect(e.apply(s,{type:'event',kind:'made2'}).ok).toBe(false);
 });
 it('exposes guided and sandbox from Scorebook without sign-in or live scoring',()=>{
  expect(uiSource).toContain('rch-training-entry');
  expect(uiSource).toContain('TRAINING ENVIRONMENT');
  expect(uiSource).toContain('GUIDED TRAINING');
  expect(uiSource).toContain('FREE PRACTICE');
  expect(uiSource).toContain('training=1');
  expect(uiSource).toContain('aria-live="polite"');
  expect(uiSource).toContain('SIMULATION ONLY');
  expect(styles).toContain('.tr-workspace');
  expect(styles).toContain('.tr-sub-backdrop');
  expect(styles).toContain('@media(max-width:820px)');
  expect(styles).toContain('prefers-reduced-motion:reduce');
 });
});
