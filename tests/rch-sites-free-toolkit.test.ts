import {describe,it,expect} from 'vitest';
import {
  generateRoundRobin,parseToolkitTeams,parseToolkitGames,parseToolkitForm,
  parseToolkitBudget,calculateToolkitBudget,buildGameDayPack,EMPTY_BUDGET,
  type ToolkitTeam,
} from '../src/lib/rch-sites-free-toolkit';
const teams=(n:number):ToolkitTeam[]=>
  Array.from({length:n},(_,i)=>({id:'t'+i,name:'Team '+i,players:[]}));
const settings=(list:ToolkitTeam[])=>({teams:list,startDate:'2026-11-03',
  weekdays:[2,4],tipoff:'18:30',gamesPerDay:2,slotMinutes:60,court:'Main Court'});
describe('RCH Sites Free Basketball Toolkit',()=>{
  it.each([2,3,4,5,6,7,8])('makes exactly one round-robin pairing per team pair (%i teams)',n=>{
    const roster=teams(n),games=generateRoundRobin(settings(roster));
    expect(games).toHaveLength(n*(n-1)/2);
    expect(parseToolkitGames(games,roster)).toEqual(games);
    expect(new Set(games.map(g=>[g.homeId,g.awayId].sort().join(':'))).size).toBe(games.length);
  });
  it('generates only chosen days with one court and no simultaneous games',()=>{
    const games=generateRoundRobin(settings(teams(8)));
    const slots=new Set<string>();
    for(const game of games){
      const date=new Date(game.date+'T12:00:00Z');
      expect([2,4]).toContain(date.getUTCDay());
      const slot=game.date+' '+game.time+' '+game.court;
      expect(slots.has(slot)).toBe(false);slots.add(slot);
    }
  });
  it('rejects impossible or conflicting schedules',()=>{
    const roster=teams(4),games=generateRoundRobin(settings(roster));
    expect(()=>generateRoundRobin({...settings(roster),startDate:'2026-02-30'})).toThrow();
    expect(()=>generateRoundRobin({...settings(roster),tipoff:'23:30'})).toThrow();
    expect(()=>parseToolkitGames([...games,{...games[0],id:'duplicate'}],roster)).toThrow();
    expect(()=>parseToolkitGames([{...games[0],awayId:games[0].homeId}],roster)).toThrow();
  });
  it('keeps Free rosters useful while enforcing one managed roster',()=>{
    const roster=teams(8);
    roster[0].players=[{id:'p1',name:'Adult One',number:'11'}];
    expect(parseToolkitTeams(roster)).toEqual(roster);
    roster[1].players=[{id:'p2',name:'Adult Two',number:'12'}];
    expect(()=>parseToolkitTeams(roster)).toThrow('Roster allowance');
    expect(()=>parseToolkitTeams(teams(9))).toThrow('Team limit');
  });
  it('rejects invalid player names, IDs and duplicate roster entries',()=>{
    const roster=teams(2);
    roster[0].players=[{id:'p1',name:'Sam Player',number:'7'},
      {id:'p1',name:'Other Player',number:'8'}];
    expect(()=>parseToolkitTeams(roster)).toThrow();
    roster[0].players=[{id:'p1',name:'Sam Player',number:'777'}];
    expect(()=>parseToolkitTeams(roster)).toThrow();
  });
  it('only allows an explicit publication toggle on registration',()=>{
    expect(parseToolkitForm({title:'Adult Summer League',open:true})).toEqual({
      title:'Adult Summer League',open:true});
    expect(()=>parseToolkitForm({title:'adult',open:'true'})).toThrow();
  });
  it('calculates budgets in whole cents with a predictable break-even',()=>{
    const budget=parseToolkitBudget({...EMPTY_BUDGET,gymHours:10,gymRateCents:7500,
      games:10,refsPerGame:2,refereeFeeCents:4000,teams:8,entryFeeCents:25000});
    const total=calculateToolkitBudget(budget);
    expect(total.cost).toBe(155000);
    expect(total.revenue).toBe(200000);
    expect(total.profit).toBe(45000);
    expect(total.breakEvenTeams).toBe(7);
    expect(calculateToolkitBudget({...EMPTY_BUDGET}).breakEvenTeams).toBeNull();
    expect(()=>parseToolkitBudget({...EMPTY_BUDGET,otherCents:-100})).toThrow();
  });
  it('makes game-day packs from the selected date only',()=>{
    const roster=teams(4),games=generateRoundRobin(settings(roster));
    const pack=buildGameDayPack(roster,games,games[0].date);
    expect(pack).toHaveLength(2);
    expect(pack[0].home).toMatch(/^Team/);
    expect(pack.every(g=>g.court==='Main Court')).toBe(true);
  });
});
