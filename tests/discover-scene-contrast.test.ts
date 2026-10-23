import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const layout = readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
const css = readFileSync(path.join(process.cwd(), 'src/app/rch-scene-visual-authority.css'), 'utf8');
const scene = readFileSync(path.join(process.cwd(), 'src/components/discover/DiscoverScene.tsx'), 'utf8');

function luminance(hex: string): number {
  const channels = hex.match(/[0-9a-f]{2}/gi);
  if (!channels || channels.length !== 3) throw new Error('Invalid #RRGGBB color: '+hex);
  const [r,g,b] = channels.map(value => {
    const s = parseInt(value,16)/255;
    return s <= 0.04045 ? s/12.92 : ((s+0.055)/1.055)**2.4;
  });
  return 0.2126*r+0.7152*g+0.0722*b;
}
function ratio(a: string,b: string) {
  const light = Math.max(luminance(a),luminance(b));
  const dark = Math.min(luminance(a),luminance(b));
  return (light+.05)/(dark+.05);
}

describe('Discover / The Scene mobile contrast guard', () => {
  it('loads Discover-specific CSS AFTER the universal theme, including the PWA', () => {
    const style = "import './rch-scene-visual-authority.css';";
    expect(layout.includes(style)).toBe(true);
    expect(layout.lastIndexOf(style)).toBeGreaterThan(layout.lastIndexOf("import './rch-pulse.css';"));
  });
  it('isolates global !important overrides to the Discover root', () => {
    expect(css).toContain('html.rch-premium-root body.rch-premium-app .rcl-platform-root main.rch-scene-page');
    expect(css).toContain('.rch-scene-search-input input');
    expect(css).toContain('.rch-scene-location-input select');
    expect(css).toContain('.rch-scene-rail-card:not(.rch-scene-spotlight)');
    expect(css).toContain('.rch-scene-category[aria-pressed="true"]');
    expect(css).toContain('.rch-scene-goals button[aria-pressed="true"]');
    expect(css).toContain('.rch-scene-when,.rch-scene-toolbar-secondary');
  });
  it('requires accessible color pairs on light cards and selected controls', () => {
    expect(ratio('#153554','#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#46627d','#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#ffffff','#256cdf')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#3e5f80','#eaf4ff')).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the search and location fields outside the dark global input skin', () => {
    const headerCss = readFileSync(path.join(process.cwd(), 'src/app/rch-header-contrast-authority.css'), 'utf8');
    const formCss = readFileSync(path.join(process.cwd(), 'src/app/rch-premium-components.css'), 'utf8');
    // Both inherited resets used !important and previously overrode Discover.
    expect(headerCss).toContain(':not(.rch-scene-native-control)');
    expect(formCss).toContain(':not(.rch-scene-native-control)');
    expect(scene).toContain('className="rch-scene-native-control" type="search"');
    expect(scene).toContain('className="rch-scene-native-control" value={city}');
    expect(scene).toContain('rch-scene-location-caret');
    expect(css).toContain('> input.rch-scene-native-control');
    expect(css).toContain('> select.rch-scene-native-control');
    expect(css).toContain('background:transparent!important');
    expect(css).toContain('-webkit-text-fill-color:var(--rch-brand-ink)!important');
    expect(css).toContain('color-scheme:dark!important');
  });
  it('does not present empty publication data as invented events', () => {
    expect(scene).toContain("items.length===0?'Your next play is waiting.'");
    expect(scene).toContain('There are no upcoming published listings yet.');
    expect(scene).toContain('href="/runs"');
    expect(scene).toContain('href="/network"');
  });
});
