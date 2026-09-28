import { describe, expect, it } from 'vitest';
import { matchLabMotionForDrill } from './labMotionLibrary';

describe('Lab drill motion matching', () => {
  it.each([
    ['Form Shooting', 'Shooting', 'set-shot'],
    ['Closeout and Slide', 'Defense', 'closeout'],
    ['Mirror Slide Reaction', 'Defense', 'defensive-slide'],
    ['Stationary Ball-Handling Series', 'Ball handling', 'dribble-stance'],
  ])('uses an exact animation for %s', (title, skill, motionId) => {
    const match = matchLabMotionForDrill({ title, skill });
    expect(match.motion?.id).toBe(motionId);
    expect(match.exact).toBe(true);
  });

  it('uses a labeled technique reference when the drill is broader than the available 3D clip', () => {
    const match = matchLabMotionForDrill({ title: 'Pick & Roll Read Series', skill: 'Playmaking' });
    expect(match.motion?.id).toBe('chest-pass');
    expect(match.exact).toBe(false);
    expect(match.note.toLowerCase()).toContain('technique reference');
  });

  it.each([
    ['Mikan Drill', 'Finishing'],
    ['Lateral Bound and Stick', 'Athleticism'],
    ['Rebound to Outlet', 'Rebounding'],
    ['Clock & Score Situations', 'Mental / IQ'],
  ])('does not pretend an unrelated 3D clip matches %s', (title, skill) => {
    const match = matchLabMotionForDrill({ title, skill });
    expect(match.motion).toBeNull();
    expect(match.exact).toBe(false);
  });
});
