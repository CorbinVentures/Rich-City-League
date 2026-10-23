import { describe,expect,it } from 'vitest';
import { generateSeasonDraftOrder } from '../src/lib/draft/order';
describe('Official season draft order',()=>{
  it('generates a balanced three-round linear order',()=>{
    expect(generateSeasonDraftOrder(['A','B','C'],3,'linear'))
      .toEqual(['A','B','C','A','B','C','A','B','C']);
  });
  it('reverses direction on alternating snake rounds while preserving pick parity',()=>{
    expect(generateSeasonDraftOrder(['A','B','C'],3,'snake'))
      .toEqual(['A','B','C','C','B','A','A','B','C']);
  });
  it('rejects duplicate and absent teams',()=>{
    expect(generateSeasonDraftOrder(['A','A'],4,'linear')).toEqual([]);
    expect(generateSeasonDraftOrder(['A'],4,'snake')).toEqual([]);
  });
  it('rejects invalid round counts',()=>{
    expect(generateSeasonDraftOrder(['A','B'],0,'linear')).toEqual([]);
    expect(generateSeasonDraftOrder(['A','B'],2.5,'snake')).toEqual([]);
  });
});
