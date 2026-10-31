import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const runs=read('src/app/runs/page.tsx');
const directWorld=read('src/app/runs/world/page.tsx');
const world=read('src/components/runs/RunsWorldGame.tsx');
const cinema=read('src/components/runs/RunsCinematicHome.tsx');
const css=read('src/components/runs/runs-world.css');

describe('Runs 2.0 task-first and verified activity UX',()=>{
 it('makes finding or hosting an actual game the first interaction',()=>{
   expect(runs).toContain("searchParams.get('view')!=='world'");
   expect(runs).toContain('Find a Game');
   expect(runs).toContain('Host a Game');
   expect(runs).toContain('Park suggestions are not confirmed games');
   expect(runs).toContain('href="/runs?view=world&mode=world"');
   expect(runs.indexOf('Find a Game')).toBeLessThan(runs.indexOf('id="rch-upcoming-runs"'));
 });
 it('never gates player discovery on forced instructions or auto-playing cinematics',()=>{
   expect(runs).not.toContain('setRulesOpen(true);\n  }, [showLegacyList]');
   expect(directWorld).not.toContain('useEffect(');
   expect(directWorld).toContain('onOpenRules={()=>setRulesOpen(true)}');
   expect(cinema).toContain('if(!enabled||replayToken===0)return;');
   expect(cinema).toContain('onReplay');
 });
 it('keeps game controls readable and advanced competition reachable',()=>{
   for(const [id,title] of [['home','Play'],['world','Courts'],['crew','Crews'],['player','My Player']]){
     expect(world).toContain("{id:'"+id+"',title:'"+title+"'");
   }
   expect(css).toContain('grid-template-columns:repeat(4,minmax(0,1fr))');
   expect(world).toContain("setScreen('battle')");
   expect(world).toContain("setScreen('vault')");
 });
 it('prevents park suggestions being presented as hosted Games or free reward claims',()=>{
   expect(runs).toContain('SUGGESTED OUTDOOR COURTS');
   expect(runs).toContain('Visiting a suggested court alone earns no bonus');
   expect(world).toContain('!suggestedIds.has(r.id)');
   expect(world).toContain(".in('location_slug',slugs)");
   expect(world).toContain("select('run_id,bonus_enabled').in('run_id',runIds)");
   expect(world.match(/const slugs=nextCourts.map/g)).toHaveLength(1);
   expect(world).toContain('A court pin is not a hosted game');
   expect(world).not.toContain('<RunsGameLobby');
   expect(world).not.toContain('Indoor gym hours and permitted basketball use');
 });
});
