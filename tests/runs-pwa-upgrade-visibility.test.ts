import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const source=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Installed PWA Runs Gameplay Activation parity',()=>{
 it('takes the installed PWA Runs tab into the actual game home without changing public browser list behavior',()=>{
  const header=source('src/components/SiteHeader.tsx');
  const runs=source('src/app/runs/page.tsx');
  expect(header).toContain("href==='/runs'?'/runs?view=world&mode=home'");
  expect(runs).toContain("searchParams.get('view')!=='world'");
  expect(runs).toContain('<RunQuickPlay runs={visibleRuns}');
 });
 it('shows game-studio Quick Play options on the immersive Runs home',()=>{
  const home=source('src/components/runs/RunsCinematicHome.tsx');
  const css=source('src/components/runs/runs-cinematic-home.css');
  expect(home).toContain('RUNS 2.0');
  expect(home).toContain('data-rch-runs-pwa-quick-play="true"');
  expect(home).toContain('FIND A GAME');
  expect(home).toContain('ROOKIE FRIENDLY');
  expect(home).toContain('HOST A GAME');
  expect(home).toContain('/runs?view=list&rookie=1#rch-upcoming-runs');
  expect(css).toContain('.rch-gh-game-start-grid');
  expect(css).toContain('@media(max-width:410px)');
 });
 it('forwards the rookie filter to real game discovery, never to invented activity',()=>{
  const runs=source('src/app/runs/page.tsx');
  expect(runs).toContain("useState(searchParams.get('rookie')==='1')");
  expect(runs).toContain("!rookieOnly || isRookieFriendly(run)");
  expect(source('src/components/runs/RunQuickPlay.tsx')).toContain('findPlayableRuns(runs)');
 });
 it('refreshes previously installed PWA clients that lack the legacy version key',()=>{
  const upgrade=source('src/components/PWAInstallExperience.tsx');
  const sw=source('public/sw.js');
  expect(upgrade).toContain("if (!knownVersion) {");
  expect(upgrade).toContain("if (!isStandaloneMode()) return;");
  expect(upgrade).toContain("window.location.replace(url.toString())");
  expect(upgrade).toContain("refreshGuard === version");
  expect(sw).toContain("rcl-static-v13");
  expect(sw).toContain("SW_VERSION = 'v13'");
  expect(sw).toContain("fetch(request, { cache: 'no-store' })");
 });
 it('preserves social-first installed PWA launch',()=>{
  expect(source('src/app/manifest.webmanifest/route.ts')).toContain("start_url: '/social?source=pwa'");
 });
});
