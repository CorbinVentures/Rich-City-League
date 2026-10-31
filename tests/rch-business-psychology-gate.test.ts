import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {RCH_QUALITY_DIMENSIONS,assessRchQualityDimension,assessRchQualityRelease,type RchQualityCheckEvidence} from '../src/lib/rch-business-quality';

const read=(path:string)=>readFileSync(path,'utf8');
const record=(passed:boolean,reviewer='Independent QA'):RchQualityCheckEvidence=>({
  passed, reviewer, source:'docs/qa/independent-review.md', reviewedAt:'2026-10-31',
});
describe('RCH evidence-first business quality gate',()=>{
  it('tracks exactly sixteen unique product and market areas with five checks each',()=>{
    expect(RCH_QUALITY_DIMENSIONS).toHaveLength(16);
    expect(new Set(RCH_QUALITY_DIMENSIONS.map(item=>item.id)).size).toBe(16);
    for(const dimension of RCH_QUALITY_DIMENSIONS)expect(dimension.checks).toHaveLength(5);
  });
  it('does not assign any score to missing or partially reviewed evidence',()=>{
    const dimension=RCH_QUALITY_DIMENSIONS[0];
    expect(assessRchQualityDimension(dimension).score).toBeNull();
    expect(assessRchQualityDimension(dimension,{checks:[record(true)]}).status).toBe('unverified');
    expect(assessRchQualityRelease({}).ready).toBe(false);
  });
  it('requires both critical checks in addition to an 8/10 total',()=>{
    const dimension=RCH_QUALITY_DIMENSIONS[0];
    const valid={checks:[record(true),record(true),record(true),record(true),record(false)]};
    expect(assessRchQualityDimension(dimension,valid).status).toBe('passed');
    expect(assessRchQualityDimension(dimension,{checks:[record(false),record(true),record(true),record(true),record(true)]}).status).toBe('blocked');
  });
  it('requires independently reviewed evidence, not blank reviewer names',()=>{
    const dimension=RCH_QUALITY_DIMENSIONS[0];
    const result=assessRchQualityDimension(dimension,{checks:[record(true,''),record(true),record(true),record(true),record(true)]});
    expect(result.score).toBeNull();
  });
  it('never automatically certifies market success from product checks',()=>{
    const market=RCH_QUALITY_DIMENSIONS.find(d=>d.id==='community')!;
    const checks=[record(true),record(true),record(true),record(true),record(false)];
    expect(assessRchQualityDimension(market,{checks}).status).toBe('blocked');
    expect(assessRchQualityDimension(market,{checks,realWorldOutcomeVerified:true}).status).toBe('passed');
  });
});
describe('RCH truthful public discovery contract',()=>{
  it('excludes weekend suggestion records from hosted homepage opportunities',()=>{
    const home=read('src/app/page.tsx');
    const browser=read('src/components/RCHBrowserHomepage.tsx');
    expect(home).toContain("from('rch_weekend_circuit_events')");
    expect(home).toContain('confirmedRuns=suggestionsKnown?enrichedRuns.filter');
    expect(home).toContain('suggestedRuns=suggestionsKnown?enrichedRuns.filter');
    expect(home).toMatch(/runs=\{(?:confirmedRuns|data\.confirmedRuns) as any\}/);
    expect(browser).toContain('SUGGESTED COURTS');
    expect(browser).toContain('not confirmed hosted games');
  });
  it('does not present automated posts as public human conversation',()=>{
    const pulse=read('src/app/pulse/page.tsx');
    expect(pulse).toContain(".eq('is_automated', false)");
    expect(pulse).toContain(".eq('author.is_system_account', false)");
    expect(pulse).toContain('NO AUTOMATED CONTENT');
  });
});
