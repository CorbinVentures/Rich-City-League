import {describe,it,expect} from 'vitest';
import {readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
const text=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
const assets=[
 ['runs','src/app/runs/page.tsx'],
 ['rich-city-league','src/components/LeagueCenterExperience.tsx'],
 ['draft-night','src/app/draft/page.tsx'],
 ['fantasy-league','src/app/fantasy/page.tsx'],
] as const;

describe('RCH program emblems',()=>{
 it('ships all four genuine optimized image objects from this brand suite',()=>{
  for(const [program] of assets){
   const filename=join(process.cwd(),'public/brand/programs',program+'.avif');
   const data=readFileSync(filename);
   expect(statSync(filename).size).toBeGreaterThan(1200);
   expect(data.subarray(4,12).toString('ascii')).toBe('ftypavif');
  }
 });
 it('presents each emblem on the appropriate program landing page',()=>{
  for(const [program,path] of assets){
   const page=text(path);
   expect(page).toContain('<ProgramEmblem program="'+program+'"');
  }
 });
 it('retains mobile readability: primary text and actions stay visible',()=>{
  const runs=text('src/app/runs/page.tsx');
  const draft=text('src/app/draft/page.tsx');
  const fantasy=text('src/app/fantasy/page.tsx');
  const league=text('src/components/LeagueCenterExperience.tsx');
  expect(runs).toContain('Host a run');
  expect(draft).toContain('LIVE DRAFT BOARD');
  expect(fantasy).toContain('My team');
  expect(league).toContain('Join the league');
  expect(draft.startsWith("'use client';")).toBe(true);
  expect(fantasy.startsWith("'use client';")).toBe(true);
 });
 it('brands the discoverable league journey but leaves simple bottom navigation untouched',()=>{
  const page=text('src/app/league/join/page.tsx');
  for(const [program] of assets)expect(page).toContain("program:'"+program+"'");
  const component=text('src/components/ProgramEmblem.tsx');
  expect(component).toContain('alt=""');
  expect(component).toContain('unoptimized');
  const layout=text('src/app/layout.tsx');
  expect(layout).toContain("import './rch-program-emblems.css'");
  const nav=text('src/lib/member-navigation.ts');
  expect(nav).toContain("{label:'Fantasy',href:'/fantasy',icon:FaStar}");
 });
});
