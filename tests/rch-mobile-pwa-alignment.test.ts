import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const css=read('src/app/rch-court-flare.css');
const layout=read('src/app/layout.tsx');
const home=read('src/components/social/NetworkHome.tsx');
const siteHeader=read('src/components/SiteHeader.tsx');
const mobile=css.slice(css.indexOf('@media(max-width:640px){'),css.indexOf('@media(max-width:380px){'));

describe('RCH mobile PWA header and timeline gutters',()=>{
 it('loads scoped visual overrides after the rest of the global CSS',()=>{
  expect(layout).toContain("import './rch-court-flare.css'");
  expect(layout.lastIndexOf("import './rch-court-flare.css'"))
    .toBeGreaterThan(layout.lastIndexOf("import './rch-basketball-product-fit.css'"));
  expect(siteHeader).toContain('rcl-universal-topbar rcl-social-world-topbar rch-court-topbar');
  expect(home).toContain('rch-timeline-home rch-court-feed');
 });
 it('keeps the angled RCH lettering wholly inside the mobile header',()=>{
  expect(mobile).toContain('.rch-court-topbar .rcl-universal-wordmark>span');
  expect(mobile).toContain('width:max-content!important');
  expect(mobile).toContain('min-width:max-content!important');
  expect(mobile).toContain('white-space:nowrap!important');
  expect(mobile).toContain('overflow:visible!important');
  expect(mobile).toContain('padding-inline:8px!important');
  expect(mobile).toContain('safe-area-inset-left');
  expect(mobile).toContain('safe-area-inset-right');
  expect(css).not.toContain('min-width:53px!important');
 });
 it('aligns social post cards with the same padding as the rest of Home',()=>{
  expect(home).toContain('className="rch-timeline-container');
  expect(home).toContain('<NetworkPostCard');
  expect(mobile).toContain('.rch-timeline-container');
  expect(mobile).toContain('padding-inline:12px!important');
  expect(mobile).toContain('.rch-pulse-post');
  expect(mobile).toContain('width:100%!important');
  expect(mobile).toContain('box-sizing:border-box!important');
  expect(mobile).toContain('margin-inline:0!important');
  expect(mobile).not.toContain('margin-inline:-12px');
 });
});
