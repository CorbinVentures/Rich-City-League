import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isMemberNavigationActive} from '../src/lib/member-navigation';

const src=(name:string)=>readFileSync(join(process.cwd(),name),'utf8');
const layout=src('src/app/layout.tsx');
const css=src('src/app/rch-visual-qa-finish.css');
const components=src('src/app/rch-premium-components.css');
const actions=src('src/components/PublicProfileActions.tsx');
const insights=src('src/components/ProfileViewInsights.tsx');
const profile=src('src/app/social/profile/[id]/page.tsx');
const discover=src('src/components/discover/VirginiaWorld.tsx');
const chrome=src('src/app/rch-premium-navigation.css');
const contrast=(a:string,b:string)=>{
 const lum=(hex:string)=>{
   const channels=hex.slice(1).match(/../g)!.map(part=>parseInt(part,16)/255);
   const srgb=channels.map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4));
   return srgb[0]*.2126+srgb[1]*.7152+srgb[2]*.0722;
 };
 const [high,low]=[lum(a),lum(b)].sort((x,y)=>y-x);
 return (high+.05)/(low+.05);
};
describe('RCH production UI fit and finish',()=>{
 it('activates only the correct bottom-navigation family',()=>{
   expect(isMemberNavigationActive('/social','/social')).toBe(true);
   expect(isMemberNavigationActive('/social/profile/123','/social')).toBe(false);
   expect(isMemberNavigationActive('/social/profile/123','/social/profile/me')).toBe(true);
   expect(isMemberNavigationActive('/social/stories','/social')).toBe(false);
   expect(isMemberNavigationActive('/discover','/discover')).toBe(true);
   expect(isMemberNavigationActive('/runs','/runs')).toBe(true);
   expect(isMemberNavigationActive('/social/feed','/social')).toBe(true);
 });
 it('loads visual QA LAST, after previous light-theme patches',()=>{
   expect(layout.indexOf("import './rch-visual-qa-finish.css'")).toBeGreaterThan(layout.indexOf("import './rch-premium-discover.css'"));
   expect(css).toContain('main.rch-profile-finish .rcl-profile-edit-action');
   expect(css).toContain('main.rch-world-page .rch-world-overview');
 });
 it('makes Edit Profile and other actions truly visible, not just recolored by generic rules',()=>{
   for(const cls of ['rcl-profile-edit-action','rcl-profile-follow-action','rcl-profile-message-action','rcl-profile-wall-action']){
     expect(actions).toContain(cls);
     expect(css).toContain(cls);
   }
   expect(actions).toContain('bg-rcl-blue');
   expect(css).toContain('background:linear-gradient(135deg,var(--rch-brand-accent),var(--rch-brand-border))!important');
   expect(css).toContain('color:#fff!important');
   expect(css).toContain('opacity:1!important');
 });
 it('enforces AA contrast on real primary button color stops and body text',()=>{
   for(const blue of ['#286fbd','#17559e','#2774c6','#1756a1','#2876ce','#1253b3']){
     expect(contrast('#ffffff',blue)).toBeGreaterThanOrEqual(4.5);
   }
   expect(contrast('#bed5eb','#133858')).toBeGreaterThanOrEqual(4.5);
   expect(contrast('#e0eeff','#102a5d')).toBeGreaterThanOrEqual(4.5);
   expect(components).toContain('linear-gradient(135deg,var(--rch-brand-accent),var(--rch-brand-border))');
   expect(chrome).toContain('linear-gradient(150deg,var(--rch-brand-accent),var(--rch-brand-border))');
 });
 it('shows profile stats and badges against dark cards and exposes active tabs',()=>{
   expect(insights).toContain('rcl-profile-attention-caption');
   expect(insights).toContain('rcl-profile-attention-delta');
   expect(profile).toContain('className="rch-profile-hero');
   expect(profile).toContain('className="rch-profile-tabs');
   expect(profile).toContain("aria-current={active?'page':undefined}");
   expect(css).toContain('.rcl-profile-status-banner');
   expect(css).toContain('.rcl-profile-metrics');
   expect(css).toContain('.rcl-profile-attention-primary');
 });
 it('does not allow map HUD or overview button to spill past iPhone control widths',()=>{
   expect(discover).toContain('rch-world-map-hud-name');
   expect(discover).toContain("'Virginia'");
   expect(css).toContain('.rch-world-map-hud-name');
   expect(css).toContain('text-overflow:ellipsis');
   expect(css).toContain('.rch-world-overview svg');
   expect(css).toContain('@media(max-width:375px)');
 });
});
