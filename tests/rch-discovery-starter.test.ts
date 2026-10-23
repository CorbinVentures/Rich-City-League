import { describe, expect, it } from 'vitest';
import { isStarterIntent, starterDestination, starterPreview } from '../src/lib/rch-discovery-starter';

const examples = [
  { id:'1',title:'Richmond Run',location:'Richmond, VA',type:'Run',starts_at:'2026-11-01',href:'/runs/1' },
  { id:'2',title:'Norfolk Run',location:'Norfolk, VA',type:'Run',starts_at:'2026-11-01',href:'/runs/2' },
  { id:'3',title:'Unspecified court',location:'At the park',type:'Run',starts_at:'2026-11-01',href:'/runs/3' },
];

describe('RCH discovery starter', () => {
  it('only permits supported interests', () => {
    expect(isStarterIntent('play')).toBe(true);
    expect(isStarterIntent('watch')).toBe(true);
    expect(isStarterIntent('connect')).toBe(true);
    expect(isStarterIntent('admin')).toBe(false);
  });
  it('keeps public browser Social and installed PWA Social distinct', () => {
    expect(starterDestination('connect','web')).toBe('/pulse');
    expect(starterDestination('connect','pwa')).toBe('/social');
    expect(starterDestination('play','pwa')).toBe('/runs');
  });
  it('shows only real supplied local preview listings without inventing activity', () => {
    expect(starterPreview(examples,'richmond').map(item=>item.id)).toEqual(['1']);
    expect(starterPreview(examples,'norfolk').map(item=>item.id)).toEqual(['2']);
    expect(starterPreview([], 'richmond')).toEqual([]);
    expect(starterPreview(examples,null)).toHaveLength(2);
  });
});
