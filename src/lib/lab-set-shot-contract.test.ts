import { describe, expect, it } from 'vitest';
import { MOTION_SPECS } from '../../scripts/lib/basketball-motion-specs.mjs';

const setShot = MOTION_SPECS['set-shot'].frame as (p: number) => {
  hands: { l: { target: number[] }; r: { target: number[] } };
  armPole: { l: number[]; r: number[] };
};

describe('RCL set-shot arm mechanics', () => {
  it('keeps shooting and guide hands separated through the pocket and rise', () => {
    for (const p of [0.28, 0.4, 0.52, 0.62]) {
      const frame = setShot(p);
      const left = frame.hands.l.target;
      const right = frame.hands.r.target;
      expect(right[0] - left[0]).toBeGreaterThan(0.15);
      expect(right[0]).toBeGreaterThan(left[0]);
    }
  });

  it('keeps the shooting hand lower than the guide hand in the loading pocket', () => {
    for (const p of [0.22, 0.3, 0.38]) {
      const frame = setShot(p);
      expect(frame.hands.r.target[1]).toBeLessThan(frame.hands.l.target[1]);
    }
  });

  it('peels the guide hand away instead of crossing the shooting arm', () => {
    const release = setShot(0.64);
    const follow = setShot(0.78);
    expect(follow.hands.l.target[0]).toBeLessThan(release.hands.l.target[0]);
    expect(follow.hands.l.target[1]).toBeLessThan(release.hands.l.target[1]);
    expect(follow.hands.r.target[0]).toBeGreaterThan(follow.hands.l.target[0]);
  });

  it('uses outward elbow poles to prevent centerline collapse', () => {
    const frame = setShot(0.5);
    expect(Math.abs(frame.armPole.l[0])).toBeGreaterThanOrEqual(0.45);
    expect(Math.abs(frame.armPole.r[0])).toBeGreaterThanOrEqual(0.3);
  });
});
