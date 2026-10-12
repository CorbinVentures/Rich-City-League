import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = hex.match(/[a-f0-9]{2}/gi);
    if (!channels || channels.length !== 3) throw new Error('Expected six-digit hex color');
    const [red, green, blue] = channels.map(part => {
      const value = Number.parseInt(part, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return red * 0.2126 + green * 0.7152 + blue * 0.0722;
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('public web theme parity with RCH PWA', () => {
  it('uses the same premium theme scope on public pages without mounting member chrome', () => {
    const shell = read('src/components/RCHPublicWebShell.tsx');
    const gate = read('src/components/RCHExperienceGate.tsx');
    expect(shell).toContain('rcl-platform-root rch-public-web');
    expect(shell).toContain('rch-public-header');
    expect(shell).toContain('rch-public-nav');
    expect(shell).toContain('rch-public-footer');
    expect(gate).toContain('<RCHPublicWebShell>{publicContent}</RCHPublicWebShell>');
    expect(shell).not.toContain('<PlatformChrome');
  });

  it('loads public contrast last, after legacy and premium theme layers', () => {
    const layout = read('src/app/layout.tsx');
    const header = layout.indexOf("import './rch-header-contrast-authority.css';");
    const publicTheme = layout.indexOf("import './rch-public-theme.css';");
    expect(header).toBeGreaterThan(-1);
    expect(publicTheme).toBeGreaterThan(header);
  });

  it('normalizes every homepage content card, not only rounded divs', () => {
    const css = read('src/app/rch-public-theme.css');
    expect(css).toContain('.rcl-person-card');
    expect(css).toContain('.rcl-lifestyle-card');
    expect(css).toContain('.rcl-pulse-grid > a');
    expect(css).toContain('.rcl-editorial-row > a');
    expect(css).toContain('a[class*="bg-white"][class*="rounded"]');
    expect(css).toContain('background:var(--rch-card)!important;');
    expect(css).toContain('color:var(--rch-ink)!important;');
    expect(css).toContain('.rch-public-app-cta');
  });

  it('keeps PWA design system body copy and public CTAs above WCAG AA text contrast', () => {
    expect(contrastRatio('#f5f9ff', '#102841')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#bdcfe4', '#102841')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#ffffff', '#286fbd')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#e2f2ff', '#123452')).toBeGreaterThanOrEqual(4.5);
  });
});
