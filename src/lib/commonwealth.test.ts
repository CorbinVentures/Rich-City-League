import { describe,expect,it } from 'vitest';
import { pilotRadarXY,stateRadarXY,competitionRecord,challengeIsActionable,formatCompetitionDate } from './commonwealth';

describe('Commonwealth competition UI helpers',()=>{
  it('projects real pilot venues without leaving the stage',()=>{
    expect(pilotRadarXY({latitude:37.6,longitude:-77.44}).x).toBeGreaterThan(10);
    expect(pilotRadarXY({latitude:90,longitude:0}).x).toBeLessThanOrEqual(92);
    expect(stateRadarXY({latitude:37.54,longitude:-77.45}).y).toBeGreaterThan(0);
  });
  it('separates reviewed competition from pending matches',()=>{
    expect(challengeIsActionable('review')).toBe(true);
    expect(challengeIsActionable('verified')).toBe(false);
    expect(competitionRecord({wins:2,losses:1} as any)).toBe('2-1');
  });
  it('does not render an invalid time',()=>{
    expect(formatCompetitionDate('invalid')).toBe('Time TBD');
  });
});
