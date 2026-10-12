import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'apps/rch-scorebook');
const code = readFileSync(resolve(root, 'command-mode.js'), 'utf8');
const css = readFileSync(resolve(root, 'command-mode.css'), 'utf8');

describe('RCH Scorebook Command Mode', () => {
  it('parses as plain browser JavaScript', () => {
    expect(() => new Script(code)).not.toThrow();
  });

  it('never issues its own scoring mutations', () => {
    expect(code).not.toMatch(/\.rpc\(|\.from\(['"](?:games|game_events|player_game_stats)['"]\)|fetch\(/);
    expect(code).not.toContain('localStorage.setItem');
    expect(code).toContain('pad.map(p=>[p.dataset.arg,p])');
    expect(code).toContain('ADDITIONAL ACTIONS');
  });

  it('reflects existing authoritative score and event data only', () => {
    expect(code).toContain('getOfficialScoreNodes(scorebar)');
    expect(code).toContain("panel.querySelectorAll('.play')");
    expect(code).toContain("panel.querySelector('.timeline')");
    expect(code).toContain("lastScores");
    expect(code).toContain("MOST RECENT OFFICIAL EVENT");
    expect(code).toContain("Waiting for the first recorded play");
    expect(code).not.toContain("Math.random()");
  });

  it('groups original scoring buttons with accurate categories', () => {
    for (const action of ['2make','3make','ftmake','2miss','3miss','ftmiss','rebound_off','rebound_def','steal','block','turnover','foul']) {
      expect(code).toContain("'"+action+"'");
    }
    expect(code).toContain('grid.replaceChildren()');
    expect(code).toContain('cells.append(...buttons)');
  });

  it('is iPad-only and remains readable in portrait, landscape and reduced-motion', () => {
    expect(code).toContain('(min-width:740px) and (pointer:coarse)');
    expect(code).toContain("if(!eligible())return;");
    expect(css).toContain('body.rch-score-tablet .scorebar.rch-command-scorebar');
    expect(css).toContain('.rch-command-desk .rch-stat-grid');
    expect(css).toContain('@media (max-width:850px)');
    expect(css).toContain('prefers-reduced-motion:reduce');
  });
});
