import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('sitewide presentation polish', () => {
  it('loads the presentation layer after every legacy/rebrand stylesheet', () => {
    const layout = readFileSync(join(root, 'src/app/layout.tsx'), 'utf8');
    const mockupIndex = layout.indexOf("import './rcl-mockup-system.css';");
    const polishIndex = layout.indexOf("import './rcl-presentation-polish.css';");

    expect(mockupIndex).toBeGreaterThan(-1);
    expect(polishIndex).toBeGreaterThan(mockupIndex);
  });

  it('keeps mobile text, controls, media, and tables contained', () => {
    const css = readFileSync(join(root, 'src/app/rcl-presentation-polish.css'), 'utf8');

    expect(css).toContain('overflow-x: clip');
    expect(css).toContain('min-width: 0');
    expect(css).toContain('overflow-wrap: break-word');
    expect(css).toContain('font-size: 16px !important; /* Prevent iOS focus zoom. */');
    expect(css).toContain('table[class*="min-w-"]');
    expect(css).toContain('.rcl-universal-bottom a span');
  });

  it('prevents legacy dark-theme rules from washing out sitewide body copy', () => {
    const globals = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
    const mockup = readFileSync(join(root, 'src/app/rcl-mockup-system.css'), 'utf8');
    const professional = readFileSync(join(root, 'src/app/rcl-professional-clean.css'), 'utf8');
    const polish = readFileSync(join(root, 'src/app/rcl-presentation-polish.css'), 'utf8');

    expect(globals).toContain('color-scheme: light;');
    expect(mockup).not.toContain(':where(p,li,dd,dt) {\n  color:inherit;');
    expect(professional).not.toContain('color: rgba(225,235,242,.58);');
    expect(polish).toContain(':where(.rcl-platform-root) :where(p,li,dd,dt,figcaption)');
    expect(polish).toContain('color: var(--rcl-v3-copy, #64748B);');
    expect(polish).toContain('opacity: 1;');
  });

  it('keeps shared components friendly to wrapping content', () => {
    const button = readFileSync(join(root, 'src/components/Button.tsx'), 'utf8');
    const card = readFileSync(join(root, 'src/components/Card.tsx'), 'utf8');
    const container = readFileSync(join(root, 'src/components/Container.tsx'), 'utf8');
    const corporateHero = readFileSync(join(root, 'src/components/CorporatePageHero.tsx'), 'utf8');
    const clientHero = readFileSync(join(root, 'src/components/ClientPageHero.tsx'), 'utf8');

    expect(button).toContain('whitespace-normal text-center leading-snug');
    expect(card).toContain('flex-wrap');
    expect(container).toContain('min-w-0');
    expect(corporateHero).toContain('lg:max-w-[42%]');
    expect(clientHero).toContain('lg:max-w-[42%]');
  });
});
