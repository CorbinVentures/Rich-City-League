import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('RCH screenshot-driven core product fit',()=>{
 it('keeps the five mobile destinations in a fixed single row even after legacy CSS',()=>{
   const css=read('src/app/rch-basketball-product-fit.css');
   const shared=read('src/app/rch-unified-mockup.css');
   const layout=read('src/app/layout.tsx');
   expect(css).toContain('grid-template-columns:repeat(5,minmax(0,1fr))!important');
   expect(css).toContain('calc(68px + env(safe-area-inset-bottom))');
   expect(shared).not.toContain('grid-template-columns:repeat(4,minmax(0,1fr))!important');
   expect(layout.indexOf("import './rch-basketball-product-fit.css'")).toBeGreaterThan(layout.indexOf("import './rch-unified-mockup.css'"));
   expect(css).toContain('.rch-admin-floating-shortcut {display:none!important;}');
 });
 it('prioritizes actual Runs and holds advanced and operator links behind More',()=>{
   const runs=read('src/app/runs/page.tsx');
   expect(runs).toContain('aria-label="Runs quick actions" className="rch-run-primary-actions"');
   expect(runs).toContain('<summary>More run tools</summary>');
   expect(runs).toContain('My Crew');
   expect(runs).toContain('Court Map');
   expect(runs).toContain('id="rch-upcoming-runs"');
   expect(runs.indexOf('rch-run-primary-actions')).toBeLessThan(runs.indexOf('id="rch-upcoming-runs"'));
 });
 it('turns the league into a real-data competition homepage',()=>{
   const league=read('src/components/LeagueCenterExperience.tsx');
   const hub=read('src/components/LeaguePublicHub.tsx');
   expect(league).toContain('rch-league-site');
   expect(league).toContain('<LeaguePublicHub/>');
   expect(league.indexOf('<LeaguePublicHub/>')).toBeLessThan(league.indexOf('rch-league-member-content'));
   expect(hub).toContain("eq('slug','rich-city-league')");
   for(const table of ["from('games')","from('standings')","from('teams')"])expect(hub).toContain(table);
   expect(hub).toContain('Season updates coming soon');
 });
 it('makes Draft Night readable by scoping the dark surface to its route',()=>{
   const page=read('src/app/draft/page.tsx');
   const styles=read('src/app/rch-basketball-product-fit.css');
   expect(page).toContain('rch-draft-readable');
   expect(page).not.toContain('<DraftNightIntro />');
   expect(styles).toContain('main.rch-draft-readable');
   expect(styles).toContain('background:#0a0b11!important');
   expect(styles).toContain('color:#fff!important');
 });
 it('shows fantasy managers their actual league workspace before the directory',()=>{
   const layout=read('src/app/fantasy/layout.tsx');
   const page=read('src/app/fantasy/page.tsx');
   const nav=read('src/components/FantasyLeagueNavigator.tsx');
   expect(layout).toContain('{children}<FantasyLeagueNavigator />');
   expect(page).toContain('rch-fantasy-workspace');
   expect(page).toContain('rch-fantasy-subnav');
   expect(page).toContain('id="my-fantasy-team"');
   expect(page).toContain('id="matchups"');
   expect(page).toContain('id="standings"');
   expect(nav).toContain('id="fantasy-leagues"');
   expect(page).not.toContain('<FantasyCinematicIntro />');
 });
});
