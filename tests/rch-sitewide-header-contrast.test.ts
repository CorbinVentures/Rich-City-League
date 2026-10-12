import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';

const source=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const files=(folder:string):string[]=>readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{
  const path=join(folder,entry.name);
  return entry.isDirectory()?files(path):[path];
});
const contrast=(a:string,b:string)=>{
  const luminance=(hex:string)=>{
    const ch=hex.replace('#','').match(/.{2}/g)!.map(c=>parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return ch[0]*.2126+ch[1]*.7152+ch[2]*.0722;
  };
  const [hi,lo]=[luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (hi+.05)/(lo+.05);
};
describe('RCH sitewide header and text contrast authority',()=>{
  const root=source('src/app/layout.tsx');
  const runtime=source('src/components/RCLRuntimeFinish.tsx');
  const visual=source('src/components/RCLVisualSystem.tsx');
  const client=source('src/components/ClientPageHero.tsx');
  const corporate=source('src/components/CorporatePageHero.tsx');
  const uniform=source('src/app/rcl-site-uniform.css');
  const mockup=source('src/app/rcl-mockup-system.css');
  const social=source('src/app/rcl-social-world.css');
  const css=source('src/app/rch-header-contrast-authority.css');

  it('never re-introduces old white-header styling through dynamic light-theme components',()=>{
    expect(runtime).not.toContain('html body { background:#F6F9FC');
    expect(visual).not.toContain('color-scheme:light');
    expect(visual).toContain('--rcl-canvas:#07172a');
    expect(visual).toContain('background:#071e34!important');
    expect(visual).not.toContain('background:#fff!important');
  });
  it('repairs all three legacy header source layers and both reusable JSX heroes',()=>{
    for(const code of [uniform,mockup,social]){
      expect(code).not.toContain('linear-gradient(180deg,#FFFFFF 0%,#F6F9FC 100%)!important');
      expect(code).toContain('linear-gradient(140deg,#153653 0%,#071b2e 100%)!important');
    }
    for(const code of [client,corporate]){
      expect(code).toContain('rch-shared-page-hero');
      expect(code).not.toContain('bg-[linear-gradient(180deg,#FFFFFF');
      expect(code).toContain('text-[#bfd4e9]');
    }
  });
  it('applies the scoped header authority last after visual QA, without blanketing media workspaces',()=>{
    expect(root.indexOf("import './rch-header-contrast-authority.css'")).toBeGreaterThan(root.indexOf("import './rch-visual-qa-finish.css'"));
    expect(css).toContain('.rcl-client-page-hero');
    expect(css).toContain('.rcl-corporate-page-hero');
    expect(css).toContain('header[class*="bg-white"]');
    expect(css).toContain('html.rch-premium-root body.rch-premium-app');
    expect(css).not.toContain('.rch-broadcast-root');
    expect(css).not.toContain('.rcl-scorebook-immersive');
  });
  it('keeps header and input foreground colors AA readable on declared backgrounds',()=>{
    for(const pair of [
      ['#f5f9ff','#153653'],
      ['#bfd4e9','#153653'],
      ['#c5d9ed','#102943'],
      ['#99d0ff','#153653'],
      ['#b8cde0','#0b263e'],
      ['#f5f9ff','#0b263e'],
      ['#eaf5ff','#194668'],
    ]){
      expect(contrast(pair[0],pair[1]),pair.join(' / ')).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('parses the new stylesheet and excludes nontext interactive controls',()=>{
    expect(()=>postcss.parse(css,{from:'rch-header-contrast-authority.css'})).not.toThrow();
    for(const name of ['range','color','file','checkbox','radio','button']){
      expect(css).toContain(':not([type="'+name+'"])');
    }
  });
  it('covers every route through the root layout instead of patching one page',()=>{
    const pageFiles=files(join(process.cwd(),'src/app')).filter(name=>name.endsWith('/page.tsx'));
    expect(pageFiles.length).toBeGreaterThan(90);
    const usesSharedHero=pageFiles.filter(name=>/ClientPageHero|CorporatePageHero/.test(readFileSync(name,'utf8')));
    expect(usesSharedHero.length).toBeGreaterThan(0);
    expect(root).toContain('<RCLVisualSystem />');
    expect(root).toContain('<RCLRuntimeFinish />');
  });
});
