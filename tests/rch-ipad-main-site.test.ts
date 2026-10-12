import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('RCH main-site iPad orientation and responsive layout', () => {
  it('allows an installed PWA to respond to portrait and landscape rotation', () => {
    const manifest = source('src/app/manifest.ts');
    expect(manifest).toContain("orientation: 'any'");
    expect(manifest).not.toContain("orientation: 'portrait-primary'");
  });

  it('puts shared navigation into tablet mode through 1199px', () => {
    const navigation = source('src/app/rcl-social-world.css');
    const finalShell = source('src/app/rch-ipad-responsive.css');

    expect(navigation).toContain('@media (max-width: 1199px)');
    expect(finalShell).toContain('(max-width: 1199px)');
    expect(navigation).toContain('(max-width: 1399px) and (pointer: coarse)');
    expect(finalShell).toContain('(max-width: 1399px) and (pointer: coarse)');
    expect(finalShell).toContain('.rcl-universal-sidebar');
    expect(finalShell).toContain('display: none !important');
    expect(finalShell).toContain('.rcl-universal-bottom');
    expect(finalShell).toContain('safe-area-inset-top');
    expect(finalShell).toContain('safe-area-inset-bottom');
    expect(finalShell).toContain('(orientation: landscape)');
  });

  it('never double-offsets the content after the universal shell handles its rail', () => {
    const executive = source('src/app/rcl-executive-marble.css');
    const social = source('src/app/rcl-social-world.css');
    const ipad = source('src/app/rch-ipad-responsive.css');

    // A global main margin made the feed start 228px to the right on landscape iPad.
    expect(executive).not.toMatch(/body:has\(\.rcl-universal-sidebar\)\s+main/);
    expect(executive).not.toMatch(/\.rcl-universal-topbar\s*\{\s*margin-left:\s*228px/);
    expect(social).toContain('.rcl-platform-root > main');
    expect(social).toContain('margin-left:0!important;');
    expect(ipad).toContain('margin-left: 0 !important;');
    expect(ipad).toContain('max-width: 960px;');
  });

  it('does not place an oversized three-column feed into the iPad viewport', () => {
    const feed = source('src/components/social/NetworkHome.tsx');
    const css = source('src/app/rch-ipad-responsive.css');

    expect(feed).toContain('rcl-network-feed-grid');
    expect(feed).toContain('2xl:grid-cols-[170px_minmax(0,1fr)_270px]');
    expect(feed).not.toContain('lg:grid-cols-[190px_minmax(0,680px)_minmax(250px,1fr)]');
    expect(feed).toContain('hidden 2xl:block');
    expect(feed).toContain('rcl-network-left-rail');
    expect(feed).toContain('rcl-network-right-rail');
    expect(css).toContain('(min-width: 1250px) and (max-width: 1399px) and (orientation: landscape)');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) minmax(260px, 290px) !important');
    expect(css).toContain('> .rcl-network-left-rail');
    expect(css).toContain('> .rcl-network-right-rail');
    expect(css).toContain('max-width: 1535px');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) !important');
  });

  it('loads the iPad corrections last and leaves scorebook styling in its own app', () => {
    const layout = source('src/app/layout.tsx');
    const tablet = source('src/app/rch-ipad-responsive.css');

    expect(layout.lastIndexOf("import './rch-ipad-responsive.css';"))
      .toBeGreaterThan(layout.lastIndexOf("import './rch-tv-production-lock.css';"));
    expect(tablet).not.toContain('.rch-ipad-desk');
    expect(tablet).not.toContain('.rcl-scorebook-immersive');
  });
});
