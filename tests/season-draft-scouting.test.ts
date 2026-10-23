import { describe, expect, it } from 'vitest';
import { bestAvailable, bestFit, scoreDraftProspects } from '../src/lib/draft/scouting';

const athlete = (id:string, position:string, court:number|null, skill:number|null, games:number) => ({
  id, name:'Prospect '+id, position, court, skill, games,
});
describe('official season draft intelligence', () => {
  it('does not invent grades without three games and complete basketball scores',()=>{
    const graded=scoreDraftProspects([athlete('A','PG',90,90,1),athlete('B','PF',null,80,8)],[]);
    expect(graded.map(x=>x.grade)).toEqual([null,null]);
    expect(bestAvailable(graded)).toBeNull();
    expect(bestFit(graded)).toBeNull();
  });
  it('uses basketball-only BPA and tracks roster need separately',()=>{
    const graded=scoreDraftProspects([
      athlete('A','PG',85,85,8),athlete('B','C',83,83,8)
    ],['PG','PG','SF']);
    expect(bestAvailable(graded)?.id).toBe('A');
    expect(bestFit(graded)?.id).toBe('B');
  });
  it('preserves a high talent advantage despite a positional gap',()=>{
    const graded=scoreDraftProspects([
      athlete('A','PG',100,100,8),athlete('B','C',70,70,8)
    ],['PG','PG']);
    expect(bestFit(graded)?.id).toBe('A');
  });
  it('calculates a position-relative comparison only with actual comparators',()=>{
    const graded=scoreDraftProspects([
      athlete('A','SG',80,80,8),athlete('B','SG',60,60,8),
      athlete('C','PG',null,null,0)
    ],[]);
    expect(graded[0].replacementEdge).toBe(10);
    expect(graded[1].replacementEdge).toBe(-10);
    expect(graded[2].replacementEdge).toBeNull();
    expect(graded[2].sample).toBe('unrated');
  });
  it('does not exceed the published eight-point fit bonus',()=>{
    const g=scoreDraftProspects([athlete('X','SF',50,50,10)],[]);
    expect(g[0].fitGrade).toBe(58);
  });
});
