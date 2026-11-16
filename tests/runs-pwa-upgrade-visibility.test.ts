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
 it('shows the four guided Runs paths on the immersive PWA home',()=>{
  const home=source('src/components/runs/RunsCinematicHome.tsx');
  const css=source('src/components/runs/runs-cinematic-home.css');
  expect(home).toContain('aria-label="Choose a Runs mode"');
  expect(home).toContain('COURT MAP');
  expect(home).toContain('TAKEOVER');
  expect(home).toContain('VERIFIED RUNS');
  expect(home).toContain('SYB + PARTNERS');
  expect(home).toContain('RANKED CIRCUIT');
  expect(home).toContain('BADGE VAULT');
  expect(home).toContain('href="/runs/partners"');
  expect(css).toContain('.rch-arcade-doors');
  expect(css).toContain('@media(max-width:650px)');
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
  expect(sw).toContain("rcl-static-v14");
  expect(sw).toContain("SW_VERSION = 'v14'");
  expect(sw).toContain("fetch(request, { cache: 'no-store' })");
 });
 it('preserves social-first installed PWA launch',()=>{
  expect(source('src/app/manifest.webmanifest/route.ts')).toContain("start_url: '/social?source=pwa'");
 });
});
