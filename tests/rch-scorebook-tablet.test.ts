import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'apps/rch-scorebook');
const js = readFileSync(resolve(root, 'tablet-score-desk.js'), 'utf8');
const css = readFileSync(resolve(root, 'tablet-score-desk.css'), 'utf8');

describe('RCH Scorebook iPad command desk', () => {
  it('is parseable browser JavaScript without new backend writes', () => {
    expect(() => new Script(js)).not.toThrow();
    expect(js).not.toMatch(/\.from\(['"](?:game_events|games|player_game_stats)['"]\)/);
    expect(js).not.toMatch(/\.rpc\(/);
    expect(js).not.toMatch(/fetch\(['"]https:\/\/eoam/);
  });
  it('reuses the official scoring handlers rather than inventing totals', () => {
    expect(js).toContain('data-act="undo"');
    expect(js).toContain("dataset.act='tab'");
    expect(js).toContain("dataset.arg='shots'");
    expect(js).toContain("dataset.arg='plays'");
    expect(js).toContain('pro.click()');
  });
  it('has iPad landscape and portrait behavior and large targets', () => {
    expect(js).toContain('min-width:740px');
    expect(css).toContain('.rch-ipad-desk');
    expect(css).toContain('.rch-ipad-live');
    expect(css).toContain('.scorebar{position:sticky');
    expect(css).toContain('@media (min-width:740px) and (orientation:portrait)');
    expect(css).toMatch(/\.rch-ipad-desk \.act\{min-height:80px/);
  });
  it('preserves normal smaller mobile interfaces', () => {
    expect(js).toContain("if(!tablet()){document.body.classList.remove('rch-score-tablet');return;}");
    expect(js).toContain("document.querySelector");
  });
  it('supports full-stat first-time preference without blocking quick mode later', () => {
    expect(js).toContain("rch-scorebook-ipad-fullstats-init");
    expect(js).toContain("rch-sb-mode");
    expect(js).toContain('hasVisitedGame=true');
  });
});
