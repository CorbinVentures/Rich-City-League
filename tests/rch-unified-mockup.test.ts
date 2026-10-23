import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import postcss from 'postcss';
import { RCL_MEMBER_PRIMARY_NAV, isMemberNavigationActive } from '../src/lib/member-navigation';
const read = (p:string) => readFileSync(p,'utf8');
const walk = (p:string):string[] => readdirSync(p,{withFileTypes:true}).flatMap(e => e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
const tokens = Object.fromEntries([...read('src/app/rch-brand-tokens.css').matchAll(/(--rch-brand-[\w-]+):\s*(#[0-9a-f]{6});/g)].map(m=>[m[1],m[2]]));
function contrast(a:string,b:string) {
  const lum = (s:string) => {
    const [r,g,b] = s.slice(1).match(/../g)!.map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);
    return .2126*r+.7152*g+.0722*b;
  };
  const [hi,lo]=[lum(a),lum(b)].sort((a,b)=>b-a);
  return (hi+.05)/(lo+.05);
}
describe('approved RCH charcoal/crimson system',()=>{
  it('keeps actual text/button token pairs above AA normal-text contrast',()=>{
    for(const bg of ['canvas','surface','raised']) for(const fg of ['ink','copy','muted','accent-text']) {
      expect(contrast(tokens['--rch-brand-'+fg],tokens['--rch-brand-'+bg]),`${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast('#ffffff',tokens['--rch-brand-accent'])).toBeGreaterThanOrEqual(4.5);
  });
  it('parses migrated CSS and resolves every brand variable instead of silently dropping declarations',()=>{
    const declared = new Set([...read('src/app/rch-brand-tokens.css').matchAll(/(--rch-brand-[\w-]+):/g)].map(m=>m[1]));
    for(const file of walk('src').filter(p=>p.endsWith('.css'))) {
      const css=read(file);
      expect(()=>postcss.parse(css,{from:file})).not.toThrow();
      postcss.parse(css).walkRules(rule=>{ expect(rule.selector, `${file}: utility selectors must match real class names`).not.toContain('var(--rch-brand-'); });
      for(const m of css.matchAll(/var\((--rch-brand-[\w-]+)/g)) expect(declared.has(m[1]),`${file}: ${m[1]}`).toBe(true);
    }
  });
  it('uses four real navigation destinations with mutually exclusive selected states',()=>{
    expect(RCL_MEMBER_PRIMARY_NAV.map(n=>n.label)).toEqual(['Home','Runs','Community','Profile']);
    for(const route of ['/social','/runs','/runs/123','/community','/crews','/social/profile/123']) {
      expect(RCL_MEMBER_PRIMARY_NAV.filter(n=>isMemberNavigationActive(route,n.href))).toHaveLength(1);
    }
  });
});
