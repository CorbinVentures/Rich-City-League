import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const file = (path: string) => readFileSync(join(process.cwd(),path),'utf8');

describe('RCH TV mobile studio isolation', () => {
  it('omits member header and navigation exclusively in broadcast studio', () => {
    const chrome = file('src/components/PlatformChrome.tsx');
    const admin = file('src/components/AdminRouteFrame.tsx');
    expect(chrome).toContain("pathname === '/admin/rch-tv/studio'");
    expect(chrome).toContain('className="rch-broadcast-root"');
    expect(admin).toContain("pathname === '/admin/rch-tv/studio'");
    expect(admin).toContain('className="rch-broadcast-stage"');
    expect(admin).toContain('<AdminWorkspace />');
    expect(admin).toContain('<AdminTopbar />');
  });

  it('has a sticky video monitor and compact working mobile controls', () => {
    const page = file('src/app/admin/rch-tv/studio/page.tsx');
    const css = file('src/app/rch-tv-production-lock.css');
    expect(page).toContain('rch-studio-preview-sticky');
    expect(page).toContain('rch-studio-video-frame');
    expect(page).toContain('rch-studio-actions');
    expect(page).toContain('rch-studio-tabs');
    expect(page).toContain('data-active={activePanel ===');
    expect(page).toContain('Flip camera');
    expect(page).toContain("await preview.current.play()");
    expect(page).toContain("startPreview(nextFacing, true)");
    expect(css).toContain('@media (max-width:767px)');
    expect(css).toContain('position:sticky;');
    expect(css).toContain('.rch-studio-panels > [data-active="true"]');
    expect(css).toContain('grid-template-columns:repeat(6,minmax(0,1fr))');
    expect(css).toContain('min-height:42px');
  });

  it('keeps overlays legible over the camera and the public player', () => {
    const overlay = file('src/components/media/RchBroadcastOverlay.tsx');
    const css = file('src/app/rch-tv-production-lock.css');
    const root = file('src/app/layout.tsx');
    for (const name of ['rch-tv-overlay-brand','rch-tv-overlay-scoreboard','rch-tv-overlay-score-top','rch-tv-overlay-score-body','rch-tv-overlay-lower','rch-tv-overlay-sponsor']) {
      expect(overlay).toContain(name);
      expect(css).toContain(name);
    }
    expect(css).toContain('background:rgba(4,13,25,.96)!important');
    expect(css).toContain('background:var(--rch-tv-accent)!important');
    expect(root).toContain("import './rch-tv-production-lock.css'");
  });
});
