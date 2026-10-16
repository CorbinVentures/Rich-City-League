import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const shell = readFileSync('src/components/RCHPublicWebShell.tsx','utf8');
const css = readFileSync('src/app/rch-browser-sitewide.css','utf8');

describe('RCH browser hamburger menu iPhone viewport regression',()=>{
  it('uses a viewport overlay instead of a narrow, in-header details popover',()=>{
    expect(shell).toContain('className="rch-public-mobile-toggle"');
    expect(shell).toContain('className="rch-public-mobile-overlay"');
    expect(shell).toContain('className="rch-public-mobile-drawer"');
    expect(shell).not.toContain('<details className="rch-public-mobile-menu">');
    const headerClose = shell.indexOf('    </header>');
    const overlay = shell.indexOf('className="rch-public-mobile-overlay"');
    expect(headerClose).toBeGreaterThan(-1);
    expect(overlay).toBeGreaterThan(headerClose);
  });

  it('uses viewport-based dimensions, not a menu-button percentage',()=>{
    expect(css).toMatch(/\.rch-public-web \.rch-public-mobile-overlay \{\s*position:fixed!important/);
    expect(css).toContain('width:100dvw!important');
    expect(css).toMatch(/\.rch-public-web \.rch-public-mobile-drawer \{/);
    expect(css).toContain('width:min(355px,calc(100dvw - 28px))!important');
    expect(css).toContain('max-width:calc(100dvw - 28px)!important');
    expect(css).toContain('overflow-y:auto!important');
    expect(css).toContain('-webkit-overflow-scrolling:touch');
  });

  it('makes all links readable, supports navigation and exposes close controls',()=>{
    expect(css).toContain('.rch-public-mobile-drawer-links a');
    expect(css).toContain('white-space:nowrap!important');
    expect(shell).toContain('aria-expanded={menuOpen}');
    expect(shell).toContain('aria-modal="true"');
    expect(shell).toContain("event.key === 'Escape'");
    expect(shell).toContain("event.key !== 'Tab'");
    expect(shell).toContain('document.body.style.overflow = oldOverflow');
    expect(shell).toContain('onClick={closeAndRestore}');
    expect(shell).toContain('onClick={closeMenu}');
  });

  it('is scoped to the web and does not alter installed PWA components',()=>{
    expect(css).toContain('.rch-public-web .rch-public-mobile-overlay');
    expect(css).toContain('.rch-public-web .rch-public-mobile-drawer');
    expect(shell).toContain('rcl-platform-root rch-public-web');
    expect(shell).not.toContain('<PlatformChrome');
    expect(shell).not.toContain('<SiteHeader');
  });
});
