import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {summarizeSponsorDelivery} from '../src/lib/rch-sponsor-delivery';

const empty={impressions:0,organization_views:0,event_views:0,media_views:0,outbound_clicks:0,shares:0,saves:0};
describe('honest RCH sponsorship accounting',()=>{
 it('does not treat organization, event or media page views as ad impressions',()=>{
  const s=summarizeSponsorDelivery([{...empty,impressions:100,organization_views:300,event_views:150,media_views:50,outbound_clicks:5}]);
  expect(s.adImpressions).toBe(100);
  expect(s.destinationViews).toBe(500);
  expect(s.ctrPercent).toBe(5);
 });
 it('displays N/A, not zero CTR or reach, without recorded ad impressions',()=>{
  expect(summarizeSponsorDelivery([{...empty,organization_views:75,outbound_clicks:1}]).ctrPercent).toBeNull();
  expect(summarizeSponsorDelivery([]).ctrPercent).toBeNull();
 });
 it('rejects negative or nonfinite garbage counters',()=>{
  expect(summarizeSponsorDelivery([{...empty,impressions:-1,outbound_clicks:Number.NaN,media_views:Infinity}])).toMatchObject({adImpressions:0,clicks:0,destinationViews:0});
 });
 it('has clear UI declarations of measured and unmeasured outcomes',()=>{
  const source=readFileSync('src/app/sponsors/dashboard/page.tsx','utf8');
  expect(source).toContain('Recorded ad impressions');
  expect(source).toContain("metrics.ctrPercent===null?'N/A'");
  expect(source).toContain('These visits are not added to ad impressions');
 });
});
describe('RCH newsroom credibility',()=>{
 it('uses statewide parent brand and exposes uncorroborated-source warnings',()=>{
  const source=readFileSync('src/app/news/[slug]/page.tsx','utf8');
  expect(source).toContain("name:'RCH Newsroom'");
  expect(source).toContain("name:'Rich City Hoops'");
  expect(source).toContain('No external reporting sources are linked');
  expect(source).toContain("['http:','https:'].includes");
 });
});
