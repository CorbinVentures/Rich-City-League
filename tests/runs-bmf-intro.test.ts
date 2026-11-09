import {describe,expect,it} from 'vitest';
import {readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';

const file=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('RCH Runs championship-belt launch',()=>{
 const intro=file('src/components/runs/RunsCinematicHome.tsx');
 const css=file('src/components/runs/runs-cinematic-home.css');
 const world=file('src/components/runs/RunsWorldGame.tsx');
 const globalLaunch=file('src/components/PWALaunchIntro.tsx');

 it('uses the shipped BMF belt artwork without an external image dependency',()=>{
  expect(intro).toContain("const RUNS_BMF_BELT='/runs/championships/bmf-belt.webp'");
  const asset=join(process.cwd(),'public/runs/championships/bmf-belt.webp');
  expect(statSync(asset).size).toBeGreaterThan(5000);
  expect(readFileSync(asset).subarray(0,4).toString('ascii')).toBe('RIFF');
 });

 it('splits the belt and curtains like the platform launch without video',()=>{
  expect(intro).toContain('rch-intro-belt-left');
  expect(intro).toContain('rch-intro-belt-right');
  expect(intro).toContain('rch-intro-curtain-left');
  expect(intro).toContain('rch-intro-curtain-right');
  expect(css).toContain('.rch-bmf-opening.is-opening .rch-intro-curtain-left');
  expect(css).toContain('.rch-bmf-opening.is-opening .rch-intro-belt-right');
  expect(css).toContain('env(safe-area-inset-top');
  expect(intro).not.toContain('<video');
 });

 it('keeps gameplay immediate after a short, skippable, replayable intro',()=>{
  expect(intro).toContain('window.sessionStorage.getItem(INTRO_KEY)');
  expect(intro).toContain("window.sessionStorage.setItem(INTRO_KEY,'seen')");
  expect(intro).toContain('replayToken===0');
  expect(intro).toContain('prefers-reduced-motion: reduce');
  expect(intro).toContain('onClick={close}');
  expect(intro).toContain('INTRO_IMAGE_FALLBACK_MS');
  expect(intro).toContain('INTRO_SPLIT_MS');
  expect(world).toContain('<RunsCinematicIntro enabled={introEnabled&&screen===\'home\'} replayToken={introReplay}/>');
  expect(world).toContain('onReplay={()=>setIntroReplay(n=>n+1)}');
 });

 it('does not create two simultaneous PWA boot screens or cover deep links',()=>{
  expect(globalLaunch).toContain('runsRoute(pathname)');
  expect(globalLaunch).toContain('runsRoute(next.pathname)');
  expect(world).toContain("initialScreen='home'");
  expect(world).toContain("introEnabled=true");
 });
});
