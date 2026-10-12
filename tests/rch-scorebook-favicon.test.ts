import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base=resolve(process.cwd(),'apps/rch-scorebook/branding');
const svg=readFileSync(resolve(base,'icon.svg'),'utf8');
const manifest=JSON.parse(readFileSync(resolve(base,'manifest.webmanifest'),'utf8'));

describe('RCH Scorebook branded favicon',()=>{
 it('preserves the giant standalone R over a recognisable scorebook',()=>{
  expect(svg).toContain('viewBox="0 0 512 512"');
  expect(svg).toContain('font-size="380"');
  expect(svg).toContain('>R</text>');
  expect(svg).toContain('M152 128H398');
  expect(svg).toContain('M236 103V422');
  expect(svg).toContain('#397DF0');
 });
 it('updates the dedicated Scorebook PWA identity without modifying RCH core',()=>{
  expect(manifest.name).toContain('RCH Scorebook');
  expect(manifest.id).toBe('/');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({src:'/icon.svg?v=scorebook-2',purpose:'any'}),
    expect.objectContaining({src:'/icon.svg?v=scorebook-2',purpose:'maskable'}),
  ]));
 });
});
