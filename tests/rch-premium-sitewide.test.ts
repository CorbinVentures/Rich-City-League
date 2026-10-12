import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const file=(name:string)=>readFileSync(join(process.cwd(),name),'utf8');
const layout=file('src/app/layout.tsx');
const foundation=file('src/app/rch-premium-foundation.css');
const chrome=file('src/app/rch-premium-navigation.css');
const components=file('src/app/rch-premium-components.css');
const discover=file('src/app/rch-premium-discover.css');
const world=file('src/components/discover/VirginiaWorld.tsx');
const atlas=file('src/components/discover/VirginiaInteractiveAtlas.tsx');

const relativeLuminance=(hex:string)=>{
  const rgb=hex.replace('#','').match(/.{2}/g)!.map(s=>parseInt(s,16)/255)
    .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
};
const contrast=(a:string,b:string)=>{
  const pair=[relativeLuminance(a),relativeLuminance(b)].sort((x,y)=>y-x);
  return (pair[0]+.05)/(pair[1]+.05);
};
describe('RCH premium sitewide design contract',()=>{
  it('loads after legacy theme rules, for every route rather than one page',()=>{
    for(const path of ['foundation','navigation','components','discover']){
      expect(layout).toContain(`import './rch-premium-${path}.css'`);
    }
    expect(layout.indexOf("import './rch-premium-foundation.css'"))
      .toBeGreaterThan(layout.indexOf("import './rch-ipad-responsive.css'"));
    expect(layout).toContain('className="rch-premium-root"');
    expect(layout).toContain('className="rch-premium-app"');
  });
  it('sets dark browser chrome on phones and installed PWAs',()=>{
    expect(layout).toContain("themeColor: '#07172a'");
    expect(layout).toContain("colorScheme: 'dark'");
    expect(foundation).toContain('color-scheme:dark!important');
  });
  it('provides readable colors meeting WCAG AA text contrast',()=>{
    expect(contrast('#f5f9ff','#102841')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#bdcfe4','#102841')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#9bb6d1','#07172a')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff','#348ffc')).toBeGreaterThan(3);
  });
  it('unifies primary navigation and mobile PWA buttons',()=>{
    expect(chrome).toContain('.rcl-universal-sidebar');
    expect(chrome).toContain('.rcl-universal-topbar');
    expect(chrome).toContain('.rcl-universal-bottom');
    expect(chrome).toContain('.rcl-mobile-create');
    expect(chrome).toContain('.rcl-navigation-panel');
    expect(chrome).toContain('.rch-admin-area');
  });
  it('standardizes reusable cards, forms, rankings, status and keyboard focus',()=>{
    expect(components).toContain('.rcl-panel');
    expect(components).toContain('.rcl-game-card');
    expect(components).toContain('.rcl-feed-post');
    expect(components).toContain(':is(input,textarea,select)');
    expect(components).toContain(':where(thead,th)');
    expect(foundation).toContain(':focus-visible');
    expect(components).toContain(':disabled');
  });
  it('fixes the screen-shotted CTA and keeps map controls and real venue data',()=>{
    expect(world).toContain('className="rch-commonwealth-banner');
    expect(discover).toContain('a.rch-commonwealth-banner');
    expect(atlas).toContain("const GATEWAYS=['bristol','roanoke','richmond','winchester','alexandria','virginia-beach']");
    expect(atlas).toContain('onClick={()=>selectCity(item)}');
    expect(atlas).toContain('clusterAtlasPoints(relevant,camera.zoom,selectedId)');
    expect(world).toContain('search_basketball_locations');
  });
  it('preserves production-only tools and geographic interaction',()=>{
    expect(file('src/components/PlatformChrome.tsx')).toContain('rcl-scorebook-immersive');
    expect(file('src/components/PlatformChrome.tsx')).toContain('rch-broadcast-root');
    expect(file('src/components/PlatformChrome.tsx')).toContain('rch-clips-immersive');
    expect(chrome).toContain('No layout positioning is changed');
  });
});
