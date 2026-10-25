import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read = (path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('RCH PWA clarity and progressive disclosure',()=>{
  it('retains social Home without appending promotional journey blocks',()=>{
    const chrome=read('src/components/PlatformChrome.tsx');
    const home=read('src/components/social/NetworkHome.tsx');
    expect(chrome).not.toContain('<RCHContinueJourney');
    expect(chrome).not.toContain('<LegalFooter');
    expect(home).toContain('rch-timeline-home');
    expect(home).toContain('for-you');
    expect(home).toContain('following');
  });
  it('keeps six immediate actions and makes secondary help optional',()=>{
    const create=read('src/app/create/page.tsx');
    expect(create).toContain('Post a clip');
    expect(create).toContain('Share photos');
    expect(create).toContain('Host a run');
    expect(create).toContain('Post in a community');
    expect(create).toContain('<details');
    expect(create).not.toContain('Upload native. Get seen');
    const drawer=read('src/components/NavigationDrawer.tsx');
    expect(drawer).toContain('Quick destinations');
    expect(drawer).toContain('<summary className="min-h-11 cursor-pointer text-sm font-semibold">All features</summary>');
    expect(drawer).toContain('RCHActionGuide variant="drawer"');
  });
  it('prioritizes actual conversations, communities and listings',()=>{
    const messages=read('src/app/messages/page.tsx');
    expect(messages).not.toContain('rcl-message-overview');
    expect(messages).toContain('More filters');
    const communities=read('src/app/communities/page.tsx');
    expect(communities.indexOf('<section aria-label="Communities"')).toBeLessThan(communities.indexOf('Start a community</summary>'));
    const discover=read('src/components/discover/DiscoverScene.tsx');
    expect(discover).toContain('rch-scene-content-simple');
    expect(discover).toContain('Personalize results');
    expect(discover).toContain('More ways to explore');
  });
  it('opens Runs to real games, with optional immersive court world',()=>{
    const runs=read('src/app/runs/page.tsx');
    expect(runs).toContain("searchParams.get('view')!=='world'");
    expect(runs).toContain('href="/runs?view=world"');
    expect(runs).toContain('<RunsWorldGame');
    expect(runs).toContain('readPagedUpcomingRuns<Run>');
  });
  it('keeps viewing categories and privacy/security destinations reachable',()=>{
    const tv=read('src/app/media/page.tsx');
    for(const heading of ['Live games','The Pulse','Movies','Originals'])expect(tv).toContain(heading);
    const settings=read('src/app/settings/page.tsx');
    for(const href of ['/account/security','/settings/privacy','/settings/discovery','/legal'])expect(settings).toContain(href);
  });
});
