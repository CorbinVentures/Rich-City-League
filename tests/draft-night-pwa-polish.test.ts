import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read = (file:string) => readFileSync(join(process.cwd(),file),'utf8');

describe('Draft Night PWA visual and state contracts', () => {
  const page = read('src/app/draft/page.tsx');
  const css = read('src/app/rcl-draft-uniform.css');
  const layout = read('src/app/layout.tsx');

  it('loads one route-scoped authoritative stylesheet AFTER the older global theme layers', () => {
    expect(layout.match(/import '\.\/rcl-draft-uniform\.css';/g)).toHaveLength(1);
    expect(layout.indexOf("import './rcl-draft-uniform.css'")).toBeGreaterThan(layout.indexOf("import './rch-cinematic-monochrome.css'"));
    expect(css).toContain('main.rch-draft-readable');
    expect(css).toContain('data-draft-ui');
  });

  it('centers the published franchise lottery and keeps actual picks distinct', () => {
    expect(page).toContain('id="lottery-board"');
    expect(page).toContain('id="pick-history"');
    expect(page).toContain('player selections have not begun.');
    expect(page).toContain('OFFICIAL PICKS');
    expect(page).toContain('previewPicks.filter');
    expect(page).toContain('aria-pressed={previewRound === round}');
    expect(page).toContain('Club admission and official eligibility remain subject to approval');
    expect(page.indexOf('id="lottery-board"')).toBeLessThan(page.indexOf('id="pick-history"'));
  });

  it('does not show empty team control modules before the official draft', () => {
    expect(page).toContain("draft && draft.status !== 'SETUP' ? (<>");
    expect(page).toContain('rcl-draft-prelaunch');
    expect(page).not.toContain('rcl-draft-hub');
    expect(page).not.toContain('rcl-draft-features');
    expect(page).toContain('record_draft_pick');
    expect(page).toContain("profile?.role === 'coach'");
  });

  it('remains usable on iPhone with a safe-area footer and compact pick rows', () => {
    expect(css).toContain('@media(max-width:640px)');
    expect(css).toContain('env(safe-area-inset-bottom)');
    expect(css).toContain('.rcl-lottery-grid{grid-template-columns:minmax(0,1fr)');
    expect(css).toContain('.rcl-pick-history>div{display:grid!important;grid-template-columns:36px minmax(0,1fr)!important');
    expect(css).toContain('min-height:42px');
    expect(page).toContain('rcl-draft-more');
    expect(page).toContain('aria-label="Draft room sections"');
    expect(page).toContain('href="/league/join"');
    expect(page).toContain('href="/fantasy"');
  });
});
